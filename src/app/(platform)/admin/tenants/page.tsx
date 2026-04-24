import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  status?: string;
}

interface TenantRow {
  id: string;
  slug: string;
  company_name: string;
  contact_email: string;
  status: string;
  plan: string;
  max_branches: number;
  max_users: number;
  trial_ends_at: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-sky-100 text-sky-800',
  suspended: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q = '', status = '' } = await searchParams;
  const t = await getTranslations('platformAdmin');
  const supabase = createServiceClient();

  let query = supabase
    .from('tenants')
    .select(
      'id, slug, company_name, contact_email, status, plan, max_branches, ' +
        'max_users, trial_ends_at, created_at',
    )
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(
      `slug.ilike.%${q}%,company_name.ilike.%${q}%,contact_email.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq('status', status);

  const { data } = await query;
  const tenants = (data ?? []) as unknown as TenantRow[];

  // Branch counts
  const ids = tenants.map((tn) => tn.id);
  const branchCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from('stores')
      .select('tenant_id')
      .in('tenant_id', ids)
      .eq('active', true);
    const storeRows = (rows ?? []) as unknown as Array<{ tenant_id: string }>;
    storeRows.forEach((s) => {
      branchCounts.set(s.tenant_id, (branchCounts.get(s.tenant_id) ?? 0) + 1);
    });
  }

  const planLabel = (plan: string) => {
    try {
      return t(`plans.${plan}` as 'plans.trial');
    } catch {
      return plan;
    }
  };
  const statusLabel = (st: string) => {
    try {
      return t(`status.${st}` as 'status.active');
    } catch {
      return st;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('tenants.title')}</h1>
        <Link
          href="/admin/tenants/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('tenants.newButton')}
        </Link>
      </div>

      <form className="flex gap-2" action="/admin/tenants">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t('tenants.searchPlaceholder')}
          className="flex-1 rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
        >
          <option value="">{t('tenants.allStatuses')}</option>
          <option value="trial">{t('status.trial')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="suspended">{t('status.suspended')}</option>
          <option value="cancelled">{t('status.cancelled')}</option>
        </select>
        <button
          type="submit"
          className="rounded bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {t('tenants.filter')}
        </button>
      </form>

      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">{t('tenants.colCompany')}</th>
              <th className="px-4 py-2 font-medium">{t('tenants.colSlug')}</th>
              <th className="px-4 py-2 font-medium">{t('tenants.colStatus')}</th>
              <th className="px-4 py-2 font-medium">{t('tenants.colPlan')}</th>
              <th className="px-4 py-2 font-medium">{t('tenants.colBranches')}</th>
              <th className="px-4 py-2 font-medium">{t('tenants.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tn) => (
              <tr
                key={tn.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/tenants/${tn.id}`}
                    className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {tn.company_name}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tn.contact_email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {tn.slug}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[tn.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700'
                    }`}
                  >
                    {statusLabel(tn.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{planLabel(tn.plan)}</td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  {branchCounts.get(tn.id) ?? 0} / {tn.max_branches}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(tn.created_at).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t('tenants.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
