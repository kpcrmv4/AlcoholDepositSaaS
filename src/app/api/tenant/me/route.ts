import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant/server';

/**
 * GET /api/tenant/me
 * Return the current user's tenant (public fields only).
 */
export async function GET() {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;

  return NextResponse.json({
    tenant: g.ctx.tenant,
    user: { id: g.ctx.userId, role: g.ctx.userRole },
  });
}

/**
 * PATCH /api/tenant/me
 * Tenant owner updates company info (non-billing fields only — billing
 * fields like plan/max_branches are platform-admin-only).
 */
export async function PATCH(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Owner may edit these — NOT plan/max_branches/status (those require
  // platform admin via /api/platform/tenants/{id}).
  const allowed = new Set([
    'company_name', 'legal_name', 'tax_id',
    'contact_email', 'contact_phone',
    'country', 'timezone',
    'logo_url', 'brand_color',
  ]);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(payload)) {
    if (allowed.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No editable fields' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('tenants')
    .update(update)
    .eq('id', g.ctx.tenant.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tenant: data });
}
