import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';
import TenantEditForm from './tenant-edit-form';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = createServiceClient();
  const t = await getTranslations('platformAdmin');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!tenant) notFound();

  const [
    { count: userCount },
    { count: branchCount },
    { data: audit },
    { data: moduleRows },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', id),
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('tenant_id', id).eq('active', true),
    supabase
      .from('tenant_audit_logs')
      .select('id, action, payload, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('tenant_modules').select('module_key, enabled').eq('tenant_id', id),
  ]);

  const modulesEnabled: Record<string, boolean> = {};
  for (const row of (moduleRows ?? []) as { module_key: string; enabled: boolean }[]) {
    modulesEnabled[row.module_key] = row.enabled;
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          ← {t('tenantDetail.backToTenants')}
        </Link>
        <span className="text-gray-400 dark:text-gray-500">/</span>
        <h1 className="text-2xl font-semibold">{tenant.company_name}</h1>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            tenant.status === 'active'
              ? 'bg-emerald-100 text-emerald-800'
              : tenant.status === 'suspended'
                ? 'bg-amber-100 text-amber-800'
                : tenant.status === 'cancelled'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-sky-100 text-sky-800'
          }`}
        >
          {statusLabel(tenant.status)}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label={t('tenantDetail.statSlug')} value={tenant.slug} mono />
        <Stat label={t('tenantDetail.statPlan')} value={planLabel(tenant.plan)} />
        <Stat label={t('tenantDetail.statBranches')} value={`${branchCount ?? 0} / ${tenant.max_branches}`} />
        <Stat label={t('tenantDetail.statUsers')} value={`${userCount ?? 0} / ${tenant.max_users}`} />
      </div>

      <TenantEditForm tenant={tenant} modulesEnabled={modulesEnabled} />

      <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('tenantDetail.recentAudit')}</h2>
        <ul className="space-y-1 text-sm">
          {(audit ?? []).map((a) => (
            <li key={a.id} className="flex justify-between gap-2 border-b border-gray-50 dark:border-gray-800 py-1.5 last:border-0">
              <span className="font-mono text-xs">{a.action}</span>
              <span className="flex-1 truncate text-xs text-gray-600 dark:text-gray-400">
                {a.payload ? JSON.stringify(a.payload) : ''}
              </span>
              <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                {new Date(a.created_at).toLocaleString('en-GB')}
              </span>
            </li>
          ))}
          {(audit ?? []).length === 0 && (
            <li className="text-xs text-gray-500 dark:text-gray-400">{t('tenantDetail.auditEmpty')}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 ${mono ? 'font-mono text-xs' : 'text-base font-semibold'}`}>
        {value}
      </div>
    </div>
  );
}
