import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invite/{token}/accept
 * Accept a tenant invitation. User must already be authenticated.
 *
 * Flow:
 *   1. Lookup invitation by token (must not be expired or accepted)
 *   2. Verify current user's email matches invitation.email
 *   3. Upsert profiles row with tenant_id + role
 *   4. Assign user to store_ids
 *   5. Mark invitation accepted
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Authenticate first' }, { status: 401 });
  }

  const svc = createServiceClient();
  const { data: inv, error: invErr } = await svc
    .from('tenant_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
  }

  if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: `Invitation is for ${inv.email}; you are signed in as ${user.email}` },
      { status: 403 },
    );
  }

  const { data: existing } = await svc
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing?.tenant_id && existing.tenant_id !== inv.tenant_id) {
    return NextResponse.json(
      { error: 'User already belongs to another tenant' },
      { status: 409 },
    );
  }

  if (!existing) {
    const { error: insErr } = await svc.from('profiles').insert({
      id: user.id,
      tenant_id: inv.tenant_id,
      username: user.email,
      role: inv.role,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  } else {
    await svc
      .from('profiles')
      .update({ tenant_id: inv.tenant_id, role: inv.role, active: true })
      .eq('id', user.id);
  }

  if (inv.store_ids && inv.store_ids.length > 0) {
    const rows = inv.store_ids.map((storeId: string) => ({
      user_id: user.id,
      store_id: storeId,
    }));
    await svc.from('user_stores').upsert(rows, { onConflict: 'user_id,store_id' });
  }

  await svc
    .from('tenant_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', inv.id);

  const { data: tenant } = await svc
    .from('tenants')
    .select('slug')
    .eq('id', inv.tenant_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    tenant_slug: tenant?.slug ?? null,
    role: inv.role,
  });
}
