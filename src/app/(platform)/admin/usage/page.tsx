import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const supabase = createServiceClient();

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, company_name, status, plan, max_branches, max_users');

  const ids = (tenants ?? []).map((t) => t.id);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: branches }, { data: users }, { data: deposits }] = await Promise.all([
    supabase.from('stores').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase.from('profiles').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase.from('deposits').select('tenant_id').in('tenant_id', ids).gte('created_at', monthStart.toISOString()),
  ]);

  const counts = new Map<string, { b: number; u: number; d: number }>();
  const bump = (tid: string | null, key: 'b' | 'u' | 'd') => {
    if (!tid) return;
    const row = counts.get(tid) ?? { b: 0, u: 0, d: 0 };
    row[key]++;
    counts.set(tid, row);
  };
  branches?.forEach((r) => bump(r.tenant_id, 'b'));
  users?.forEach((r) => bump(r.tenant_id, 'u'));
  deposits?.forEach((r) => bump(r.tenant_id, 'd'));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <p className="text-sm text-slate-500">
        Deposit counts are for the current month. Aggregate only — no row-level data.
      </p>

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Branches</th>
              <th className="px-4 py-2 font-medium">Users</th>
              <th className="px-4 py-2 font-medium">Deposits (MTD)</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t) => {
              const c = counts.get(t.id) ?? { b: 0, u: 0, d: 0 };
              return (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                      {t.company_name}
                    </Link>
                    <div className="text-xs text-slate-400 font-mono">{t.slug}</div>
                  </td>
                  <td className="px-4 py-2">{t.plan}</td>
                  <td className="px-4 py-2">
                    {c.b} / {t.max_branches}
                  </td>
                  <td className="px-4 py-2">
                    {c.u} / {t.max_users}
                  </td>
                  <td className="px-4 py-2">{c.d.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
