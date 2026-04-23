import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  status?: string;
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

  const { data: tenants } = await query;

  // Branch counts
  const ids = (tenants ?? []).map((t) => t.id);
  const branchCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from('stores')
      .select('tenant_id')
      .in('tenant_id', ids)
      .eq('active', true);
    (data ?? []).forEach((s) => {
      branchCounts.set(s.tenant_id, (branchCounts.get(s.tenant_id) ?? 0) + 1);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New tenant
        </Link>
      </div>

      <form className="flex gap-2" action="/admin/tenants">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by slug, name, or email"
          className="flex-1 rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Branches</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t) => (
              <tr
                key={t.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {t.company_name}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.contact_email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                  {t.slug}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[t.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{t.plan}</td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  {branchCounts.get(t.id) ?? 0} / {t.max_branches}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(t.created_at).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {(tenants ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No tenants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
