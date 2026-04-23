import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant';

/**
 * GET /api/platform/usage
 * Aggregate usage stats per tenant (count-only; no row contents).
 */
export async function GET(_request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, company_name, status, plan, max_branches');

  const ids = (tenants ?? []).map((t) => t.id);
  if (ids.length === 0) return NextResponse.json({ rows: [] });

  // Count branches, users, deposits this month per tenant
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [branches, users, deposits] = await Promise.all([
    supabase.from('stores').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase.from('profiles').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase
      .from('deposits')
      .select('tenant_id')
      .in('tenant_id', ids)
      .gte('created_at', monthStart.toISOString()),
  ]);

  const counts = new Map<string, { branches: number; users: number; deposits: number }>();
  const inc = (tid: string, key: 'branches' | 'users' | 'deposits') => {
    const row = counts.get(tid) ?? { branches: 0, users: 0, deposits: 0 };
    row[key]++;
    counts.set(tid, row);
  };
  branches.data?.forEach((r) => inc(r.tenant_id, 'branches'));
  users.data?.forEach((r) => inc(r.tenant_id, 'users'));
  deposits.data?.forEach((r) => inc(r.tenant_id, 'deposits'));

  const rows = (tenants ?? []).map((t) => {
    const c = counts.get(t.id) ?? { branches: 0, users: 0, deposits: 0 };
    return {
      ...t,
      branches_used: c.branches,
      branches_remaining: Math.max(0, t.max_branches - c.branches),
      users_active: c.users,
      deposits_this_month: c.deposits,
    };
  });

  return NextResponse.json({ rows });
}
