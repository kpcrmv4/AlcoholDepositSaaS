import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant/server';

/**
 * GET /api/platform/tenants
 * List all tenants with summary counts. Platform admins only.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.trim() || '';
  const status = searchParams.get('status') || '';

  const supabase = createServiceClient();
  let query = supabase
    .from('tenants')
    .select(
      'id, slug, company_name, contact_email, status, plan, max_branches, ' +
        'max_users, trial_ends_at, owner_user_id, created_at, suspended_at',
    )
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `slug.ilike.%${search}%,company_name.ilike.%${search}%,contact_email.ilike.%${search}%`,
    );
  }
  if (status) query = query.eq('status', status);

  const { data: tenants, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Branch counts per tenant
  const ids = (tenants ?? []).map((t) => t.id);
  let branchCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('stores')
      .select('tenant_id', { count: 'exact', head: false })
      .in('tenant_id', ids)
      .eq('active', true);
    branchCounts = (counts ?? []).reduce<Map<string, number>>((acc, s) => {
      acc.set(s.tenant_id, (acc.get(s.tenant_id) ?? 0) + 1);
      return acc;
    }, new Map());
  }

  const rows = (tenants ?? []).map((t) => ({
    ...t,
    branch_count: branchCounts.get(t.id) ?? 0,
  }));

  return NextResponse.json({ tenants: rows });
}

/**
 * POST /api/platform/tenants
 * Create a new tenant. Required: slug, company_name, contact_email.
 * Optional: plan, max_branches, max_users, trial_ends_at.
 */
export async function POST(request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slug = String(payload.slug ?? '').trim().toLowerCase();
  const company_name = String(payload.company_name ?? '').trim();
  const contact_email = String(payload.contact_email ?? '').trim();

  if (!slug || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug (3-50 chars, a-z, 0-9, dash; must not start/end with dash)' },
      { status: 400 },
    );
  }
  if (!company_name) {
    return NextResponse.json({ error: 'company_name required' }, { status: 400 });
  }
  if (!contact_email) {
    return NextResponse.json({ error: 'contact_email required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      slug,
      company_name,
      contact_email,
      legal_name: payload.legal_name ?? null,
      tax_id: payload.tax_id ?? null,
      contact_phone: payload.contact_phone ?? null,
      plan: payload.plan ?? 'trial',
      max_branches: Number(payload.max_branches ?? 1),
      max_users: Number(payload.max_users ?? 10),
      status: payload.status ?? 'trial',
      trial_ends_at: payload.trial_ends_at ?? null,
      line_mode: payload.line_mode ?? 'per_store',
      created_by: guard.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Audit log
  await supabase.from('tenant_audit_logs').insert({
    tenant_id: data.id,
    platform_admin_id: guard.userId,
    action: 'create',
    payload: { slug, company_name, plan: payload.plan },
  });

  return NextResponse.json({ tenant: data }, { status: 201 });
}
