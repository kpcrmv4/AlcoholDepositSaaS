import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant/guard';

/**
 * POST /api/auth/create-user
 *
 * Owner creates a tenant user directly with a username/password (skipping
 * the email-invitation flow). Used by the "create directly" tab in
 * /settings/users.
 *
 * Multi-tenant correctness:
 * - Caller's tenant is derived from their session, never from request body.
 * - Synthetic email is namespaced per tenant slug so usernames can repeat
 *   across tenants without colliding on the global `auth.users.email`
 *   uniqueness.
 * - storeIds are validated against the caller's tenant before any
 *   user_stores rows are inserted (defense-in-depth — service client
 *   bypasses RLS).
 * - tenant_id is passed via raw_user_meta_data so handle_new_user creates
 *   the profile with the correct scope.
 */
export async function POST(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;

  // Owner-only — invitations are the recommended path; direct creation
  // is a privileged shortcut for owners who manage their own credentials.
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let body: {
    username?: string;
    password?: string;
    role?: string;
    displayName?: string | null;
    storeIds?: string[] | null;
    storeId?: string | null; // legacy single-store form
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = String(body.role ?? 'staff');
  const displayName = body.displayName ? String(body.displayName).trim() : null;

  // Accept either single storeId (legacy) or storeIds array.
  const storeIds: string[] = Array.isArray(body.storeIds)
    ? body.storeIds.filter((s) => typeof s === 'string')
    : body.storeId
      ? [body.storeId]
      : [];

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: 'Username ต้องเป็นตัวอักษรเล็ก/ตัวเลข/._- ความยาว 3-32 ตัว' },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password ต้องยาว 6 ตัวขึ้นไป' }, { status: 400 });
  }
  if (!['owner', 'accountant', 'manager', 'bar', 'staff', 'hq'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const tenant = g.ctx.tenant;
  if (!tenant) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Defense-in-depth: every storeId must belong to caller's tenant.
  if (storeIds.length > 0) {
    const { data: validStores } = await svc
      .from('stores')
      .select('id')
      .eq('tenant_id', tenant.id)
      .in('id', storeIds);
    const validIds = new Set((validStores ?? []).map((s) => s.id));
    const invalidIds = storeIds.filter((s) => !validIds.has(s));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Store ไม่ได้อยู่ใน tenant: ${invalidIds.join(', ')}` },
        { status: 400 },
      );
    }
  }

  // Synthetic email namespaced per tenant — `username` itself is only
  // unique within a tenant (UNIQUE(tenant_id, username)) but auth.users.email
  // is globally unique, so two tenants can't both have e.g. "somchai" without
  // the slug separator.
  const emailDomain = (process.env.NEXT_PUBLIC_USER_EMAIL_DOMAIN || 'cellarlyos.app').replace(/^@/, '');
  const email = `${username}@${tenant.slug}.${emailDomain}`;

  // Pre-check tenant max_users to fail loudly before creating the auth row.
  const { count: activeCount } = await svc
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('active', true);
  if ((activeCount ?? 0) >= tenant.max_users) {
    return NextResponse.json(
      { error: `เต็มโควต้าผู้ใช้ของแพ็กเกจ (${tenant.max_users} คน)` },
      { status: 409 },
    );
  }

  // Create auth user — handle_new_user trigger reads tenant_id from
  // raw_user_meta_data and inserts the profile row with the right scope.
  const { data: authData, error: authError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      tenant_id: tenant.id,
      username,
      role,
      display_name: displayName,
    },
  });

  if (authError) {
    if (/already.*registered/i.test(authError.message)) {
      return NextResponse.json(
        { error: 'Username นี้ถูกใช้แล้วในบริษัทนี้' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  // The trigger sets tenant_id/username/role; display_name is set here
  // because handle_new_user keeps the INSERT minimal.
  if (displayName) {
    await svc
      .from('profiles')
      .update({ display_name: displayName, created_by: g.ctx.userId })
      .eq('id', authData.user.id);
  } else {
    await svc
      .from('profiles')
      .update({ created_by: g.ctx.userId })
      .eq('id', authData.user.id);
  }

  // Assign stores. Already validated above.
  if (storeIds.length > 0) {
    const rows = storeIds.map((store_id) => ({
      user_id: authData.user!.id,
      store_id,
    }));
    const { error: usErr } = await svc.from('user_stores').insert(rows);
    if (usErr) {
      console.error('user_stores insert failed', usErr);
      // Don't fail the whole call — user is created, owner can re-assign.
    }
  }

  return NextResponse.json({ userId: authData.user.id }, { status: 201 });
}
