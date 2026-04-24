import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('tenants')
    .update({
      status: 'active',
      suspended_at: null,
      suspension_reason: null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'resume',
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
