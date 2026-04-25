import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

/** Match the tenant-creation flow — owners change it on first login. */
function generateTempPassword(): string {
  return '123456';
}

/**
 * POST /api/platform/tenants/[id]/reset-owner-password
 *
 * Generates a new temporary password for the tenant owner and returns it in
 * the response body so the super admin can relay it via LINE/SMS. Does NOT
 * send any email — this is a manual hand-off flow.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, owner_user_id, contact_email, company_name')
    .eq('id', id)
    .maybeSingle();

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }
  if (!tenant.owner_user_id) {
    return NextResponse.json(
      { error: 'This tenant has no linked owner account. Create one via the tenant creation flow instead.' },
      { status: 400 },
    );
  }

  const newPassword = generateTempPassword();

  const { error: updateErr } = await supabase.auth.admin.updateUserById(
    tenant.owner_user_id,
    { password: newPassword },
  );

  if (updateErr) {
    return NextResponse.json(
      { error: `Failed to reset password: ${updateErr.message}` },
      { status: 400 },
    );
  }

  await supabase.from('tenant_audit_logs').insert({
    tenant_id: tenant.id,
    platform_admin_id: guard.userId,
    action: 'reset_owner_password',
    payload: { owner_email: tenant.contact_email },
  });

  return NextResponse.json({
    ok: true,
    email: tenant.contact_email,
    temp_password: newPassword,
  });
}
