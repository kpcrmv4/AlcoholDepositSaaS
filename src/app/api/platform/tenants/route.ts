import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

/**
 * GET /api/platform/tenants
 * List all tenants with summary counts. Platform admins only.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.trim() || '';
  const status = searchParams.get('status') || '';

  const supabase = createServiceClient();
  let query = supabase
    .from('tenants')
    .select(
      'id, slug, company_name, contact_email, status, plan, max_branches, ' +
        'max_users, trial_ends_at, owner_user_id, created_at, suspended_at',
    )
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `slug.ilike.%${search}%,company_name.ilike.%${search}%,contact_email.ilike.%${search}%`,
    );
  }
  if (status) query = query.eq('status', status);

  const { data: tenants, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Branch counts per tenant
  const ids = (tenants ?? []).map((t) => t.id);
  let branchCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('stores')
      .select('tenant_id', { count: 'exact', head: false })
      .in('tenant_id', ids)
      .eq('active', true);
    branchCounts = (counts ?? []).reduce<Map<string, number>>((acc, s) => {
      acc.set(s.tenant_id, (acc.get(s.tenant_id) ?? 0) + 1);
      return acc;
    }, new Map());
  }

  const rows = (tenants ?? []).map((t) => ({
    ...t,
    branch_count: branchCounts.get(t.id) ?? 0,
  }));

  return NextResponse.json({ tenants: rows });
}

/**
 * Generate a human-readable temporary password: 12 chars, alphanumeric,
 * ambiguous characters (0/O, 1/I/l) removed so it's safe to dictate over
 * LINE / SMS without confusion.
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

/**
 * POST /api/platform/tenants
 *
 * Creates a tenant AND provisions the owner's auth account in one step:
 *   1. Insert row in `tenants`
 *   2. Generate a temp password
 *   3. Create auth.users via admin API (email-confirmed, no email sent)
 *   4. `handle_new_user` trigger auto-inserts profiles row with role='owner'
 *   5. Set tenants.owner_user_id
 *
 * Response body includes `owner_credentials.temp_password` so the super admin
 * can hand it off to the tenant owner via LINE/SMS (it is NOT stored anywhere
 * else and won't be retrievable afterwards — only a reset generates a new one).
 */
export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slug = String(payload.slug ?? '').trim().toLowerCase();
  const company_name = String(payload.company_name ?? '').trim();
  const contact_email = String(payload.contact_email ?? '').trim().toLowerCase();

  if (!slug || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug (3-50 chars, a-z, 0-9, dash; must not start/end with dash)' },
      { status: 400 },
    );
  }
  if (!company_name) {
    return NextResponse.json({ error: 'company_name required' }, { status: 400 });
  }
  if (!contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return NextResponse.json({ error: 'Valid contact_email required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. Insert tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({
      slug,
      company_name,
      contact_email,
      legal_name: payload.legal_name ?? null,
      tax_id: payload.tax_id ?? null,
      contact_phone: payload.contact_phone ?? null,
      plan: payload.plan ?? 'trial',
      max_branches: Number(payload.max_branches ?? 1),
      max_users: Number(payload.max_users ?? 10),
      status: payload.status ?? 'trial',
      trial_ends_at: payload.trial_ends_at ?? null,
      line_mode: payload.line_mode ?? 'per_store',
      created_by: guard.userId,
    })
    .select()
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { error: tenantErr?.message ?? 'Failed to create tenant' },
      { status: 400 },
    );
  }

  // 2. Generate temp password
  const tempPassword = generateTempPassword();

  // 3. Create owner auth user (email_confirm=true — no verification email)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: contact_email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      tenant_id: tenant.id,
      role: 'owner',
      display_name: company_name,
      username: contact_email.split('@')[0],
    },
  });

  if (authErr || !authData?.user) {
    // Rollback tenant so we don't orphan a tenant row without an owner
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return NextResponse.json(
      { error: `Failed to provision owner account: ${authErr?.message ?? 'unknown error'}` },
      { status: 400 },
    );
  }

  // 4. handle_new_user trigger has already created profiles row. Link owner back
  //    to tenant so Danger-zone actions and email routing work.
  await supabase
    .from('tenants')
    .update({ owner_user_id: authData.user.id })
    .eq('id', tenant.id);

  // 5. Audit log
  await supabase.from('tenant_audit_logs').insert({
    tenant_id: tenant.id,
    platform_admin_id: guard.userId,
    action: 'create',
    payload: { slug, company_name, plan: payload.plan, owner_email: contact_email },
  });

  return NextResponse.json(
    {
      tenant: { ...tenant, owner_user_id: authData.user.id },
      owner_credentials: {
        email: contact_email,
        temp_password: tempPassword,
        user_id: authData.user.id,
      },
    },
    { status: 201 },
  );
}
