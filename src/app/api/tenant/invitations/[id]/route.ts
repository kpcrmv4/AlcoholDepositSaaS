import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant';

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  const { id } = await params;
  const svc = createServiceClient();
  const { error } = await svc
    .from('tenant_invitations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', g.ctx.tenant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
