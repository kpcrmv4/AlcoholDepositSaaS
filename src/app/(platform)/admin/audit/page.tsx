import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SearchParams {
  tenant_id?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tenant_id = '' } = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from('tenant_audit_logs')
    .select(
      'id, action, payload, created_at, tenant_id, platform_admin_id, ' +
        'tenants(slug, company_name), platform_admins(email, display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (tenant_id) query = query.eq('tenant_id', tenant_id);
  const { data } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>

      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">Admin</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Payload</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row: any) => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString('en-GB')}
                </td>
                <td className="px-4 py-2">
                  {row.tenants?.company_name ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
                  {row.tenants?.slug && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{row.tenants.slug}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  {row.platform_admins?.display_name ?? row.platform_admins?.email ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono">
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <pre className="whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">
                    {row.payload ? JSON.stringify(row.payload, null, 2) : ''}
                  </pre>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  No audit entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
