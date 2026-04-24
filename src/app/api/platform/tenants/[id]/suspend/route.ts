import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let reason = '';
  try {
    const body = await request.json();
    reason = String(body?.reason ?? '').slice(0, 500);
  } catch {
    /* no body ok */
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('tenants')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason || null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'suspend',
    payload: { reason },
  });

  return NextResponse.json({ ok: true });
}
