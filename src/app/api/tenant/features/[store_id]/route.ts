import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant';

interface Params {
  params: Promise<{ store_id: string }>;
}

/**
 * GET /api/tenant/features/{store_id}
 * List feature toggles for a store (absent keys default to enabled).
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;

  const { store_id } = await params;
  const svc = createServiceClient();

  // Verify the store belongs to the user's tenant
  const { data: store } = await svc
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', g.ctx.tenant.id)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await svc
    .from('store_features')
    .select('feature_key, enabled, updated_at')
    .eq('store_id', store_id);

  return NextResponse.json({ features: data ?? [] });
}

/**
 * PUT /api/tenant/features/{store_id}
 * Bulk upsert feature toggles. Body: { features: { [key]: boolean } }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  const { store_id } = await params;
  let body: { features?: Record<string, boolean> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.features || typeof body.features !== 'object') {
    return NextResponse.json({ error: 'features required' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: store } = await svc
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .eq('tenant_id', g.ctx.tenant.id)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rows = Object.entries(body.features).map(([feature_key, enabled]) => ({
    store_id,
    feature_key,
    enabled: !!enabled,
    updated_by: g.ctx.userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await svc
    .from('store_features')
    .upsert(rows, { onConflict: 'store_id,feature_key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: rows.length });
}
