import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant';

/**
 * GET /api/tenant/permissions
 * Return the full role_permissions matrix for the user's tenant.
 */
export async function GET() {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('role_permissions')
    .select('role, permission_key, enabled')
    .eq('tenant_id', g.ctx.tenant.id)
    .order('role')
    .order('permission_key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permissions: data ?? [] });
}

/**
 * PUT /api/tenant/permissions
 * Bulk upsert. Body: { changes: Array<{ role, permission_key, enabled }> }
 */
export async function PUT(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let body: { changes?: Array<{ role: string; permission_key: string; enabled: boolean }> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const changes = body.changes ?? [];
  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ error: 'changes required' }, { status: 400 });
  }

  const rows = changes.map((c) => ({
    tenant_id: g.ctx.tenant.id,
    role: c.role,
    permission_key: c.permission_key,
    enabled: !!c.enabled,
    updated_by: g.ctx.userId,
    updated_at: new Date().toISOString(),
  }));

  const svc = createServiceClient();
  const { error } = await svc
    .from('role_permissions')
    .upsert(rows, { onConflict: 'tenant_id,role,permission_key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: rows.length });
}
