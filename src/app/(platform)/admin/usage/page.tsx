import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UsagePage() {
  const supabase = createServiceClient();
  const t = await getTranslations('platformAdmin');

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, company_name, status, plan, max_branches, max_users');

  const ids = (tenants ?? []).map((tn) => tn.id);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: branches }, { data: users }, { data: deposits }] = await Promise.all([
    supabase.from('stores').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase.from('profiles').select('tenant_id').in('tenant_id', ids).eq('active', true),
    supabase.from('deposits').select('tenant_id').in('tenant_id', ids).gte('created_at', monthStart.toISOString()).neq('status', 'cancelled'),
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

  const planLabel = (plan: string) => {
    try {
      return t(`plans.${plan}` as 'plans.trial');
    } catch {
      return plan;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('usage.title')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('usage.description')}
      </p>

      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">{t('usage.colTenant')}</th>
              <th className="px-4 py-2 font-medium">{t('usage.colPlan')}</th>
              <th className="px-4 py-2 font-medium">{t('usage.colBranches')}</th>
              <th className="px-4 py-2 font-medium">{t('usage.colUsers')}</th>
              <th className="px-4 py-2 font-medium">{t('usage.colDepositsMtd')}</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((tn) => {
              const c = counts.get(tn.id) ?? { b: 0, u: 0, d: 0 };
              return (
                <tr key={tn.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-2">
                    <Link href={`/admin/tenants/${tn.id}`} className="font-medium hover:underline">
                      {tn.company_name}
                    </Link>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{tn.slug}</div>
                  </td>
                  <td className="px-4 py-2">{planLabel(tn.plan)}</td>
                  <td className="px-4 py-2">
                    {c.b} / {tn.max_branches}
                  </td>
                  <td className="px-4 py-2">
                    {c.u} / {tn.max_users}
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
