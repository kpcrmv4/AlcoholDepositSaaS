import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Module allowlist managed exclusively by the platform admin. Mirrors the
 * frontend module registry — keep in sync with src/lib/modules/registry.ts.
 */
const KNOWN_MODULE_KEYS = [
  'overview', 'chat',
  'stock', 'deposit', 'transfer', 'borrow', 'hq-warehouse', 'commission',
  'reports', 'activity',
  'performance-staff', 'performance-stores', 'performance-operations', 'performance-customers',
  'guide',
  'announcements', 'users', 'settings',
] as const;

export async function GET(_request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from('tenant_modules')
    .select('module_key, enabled, updated_at')
    .eq('tenant_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byKey = new Map((rows ?? []).map((r) => [r.module_key, r]));
  const modules = KNOWN_MODULE_KEYS.map((k) => ({
    module_key: k,
    enabled: byKey.get(k)?.enabled ?? false,
    updated_at: byKey.get(k)?.updated_at ?? null,
  }));

  return NextResponse.json({ modules });
}

/**
 * Replace the tenant's allowlist. Body: { modules: { [key]: boolean } }.
 * Unknown keys are rejected; missing keys default to disabled.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { modules?: Record<string, boolean> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.modules || typeof body.modules !== 'object') {
    return NextResponse.json({ error: 'modules object required' }, { status: 400 });
  }

  const knownSet = new Set<string>(KNOWN_MODULE_KEYS);
  const unknown = Object.keys(body.modules).filter((k) => !knownSet.has(k));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `Unknown module keys: ${unknown.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const rows = KNOWN_MODULE_KEYS.map((k) => ({
    tenant_id: id,
    module_key: k,
    enabled: body.modules![k] === true,
    updated_at: now,
    updated_by: guard.userId,
  }));

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('tenant_modules')
    .upsert(rows, { onConflict: 'tenant_id,module_key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('tenant_audit_logs').insert({
    tenant_id: id,
    platform_admin_id: guard.userId,
    action: 'update_modules',
    payload: { modules: body.modules },
  });

  return NextResponse.json({ ok: true });
}
