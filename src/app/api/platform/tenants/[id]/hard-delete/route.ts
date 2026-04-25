import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

/**
 * POST /api/platform/tenants/[id]/hard-delete
 *
 * Permanent deletion. Wipes:
 *   • the tenants row (cascades stores, profiles, tenant_invitations,
 *     tenant_modules, deposits/withdrawals/etc. via tenant_id FK)
 *   • the auth.users rows of every profile that belonged to the tenant
 *     (so the owner + staff emails are released and can be reused)
 *
 * Body must include `confirm: <company_name>` — typed by the super admin
 * — as a safety check. Audit log is written before the tenant is deleted
 * (tenant_audit_logs.tenant_id has ON DELETE SET NULL so the log row
 * survives the cascade and remains queryable in /admin/audit).
 *
 * The sibling DELETE handler in this folder does a soft delete (sets
 * status='cancelled'). This endpoint is the only path to hard-deletion.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let body: { confirm?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* body is optional but required for confirm */
  }

  const supabase = createServiceClient();

  const { data: tenant, error: lookupErr } = await supabase
    .from('tenants')
    .select('id, slug, company_name, owner_user_id')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Confirmation: super admin must type the company name to proceed
  if ((body.confirm ?? '').trim() !== tenant.company_name) {
    return NextResponse.json(
      { error: `Confirmation text must match company name "${tenant.company_name}"` },
      { status: 400 },
    );
  }

  // Collect all auth user ids to wipe AFTER the cascade — owner + every
  // staff/customer profile in the tenant. profiles.id == auth.users.id (1:1).
  const { data: tenantProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', id);

  const authUserIds = new Set<string>();
  for (const p of tenantProfiles ?? []) authUserIds.add(p.id);
  if (tenant.owner_user_id) authUserIds.add(tenant.owner_user_id);

  // Audit BEFORE delete — tenant_id will be SET NULL after cascade, but the
  // payload preserves slug/name so the action stays attributable.
  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'hard_delete',
    payload: {
      slug: tenant.slug,
      company_name: tenant.company_name,
      auth_users_removed: authUserIds.size,
    },
  });

  const { error: delErr } = await supabase.from('tenants').delete().eq('id', id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  // Clean up auth.users so emails are released for reuse. Errors here are
  // logged but don't fail the request — the tenant is already gone.
  const authErrors: Array<{ id: string; error: string }> = [];
  for (const userId of authUserIds) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) authErrors.push({ id: userId, error: authErr.message });
  }

  return NextResponse.json({
    ok: true,
    deleted_tenant: { id: tenant.id, slug: tenant.slug, company_name: tenant.company_name },
    auth_users_removed: authUserIds.size - authErrors.length,
    auth_errors: authErrors,
  });
}
