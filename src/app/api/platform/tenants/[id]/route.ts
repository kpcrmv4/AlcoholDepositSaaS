import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [
    { count: userCount },
    { count: branchCount },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('active', true),
    supabase
      .from('tenant_audit_logs')
      .select('id, action, payload, created_at, platform_admin_id')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    tenant,
    stats: { users: userCount ?? 0, branches: branchCount ?? 0 },
    audit: recentAudit ?? [],
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist editable fields
  const allowed = new Set([
    'company_name', 'legal_name', 'tax_id', 'contact_email', 'contact_phone',
    'country', 'timezone',
    'plan', 'max_branches', 'max_users', 'trial_ends_at', 'subscription_ends_at',
    'line_mode', 'line_channel_id', 'line_channel_secret', 'line_channel_token',
    'line_basic_id', 'liff_id', 'line_owner_group_id',
    'logo_url', 'brand_color',
  ]);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(payload)) {
    if (allowed.has(k)) update[k] = v;
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No editable fields' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const changedKeys = Object.keys(update).filter((k) => k !== 'updated_at');
  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'update',
    payload: { fields: changedKeys },
  });

  return NextResponse.json({ tenant: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = createServiceClient();

  // Soft delete = cancel; full delete is manual / support-ticket territory
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'cancelled', suspended_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'cancel',
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
