import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import PermissionsMatrix from './permissions-matrix';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

// Canonical list of permissions in this system.
// Keep in sync with role_permissions seed in migration 00000.
// `groupKey` maps to permissions.group<Pascal> in the message catalog.
const PERMISSION_KEYS: Array<{ key: string; groupKey: string }> = [
  { key: 'deposits.view',         groupKey: 'groupDeposits' },
  { key: 'deposits.manage',       groupKey: 'groupDeposits' },
  { key: 'withdrawals.view',      groupKey: 'groupWithdrawals' },
  { key: 'withdrawals.manage',    groupKey: 'groupWithdrawals' },
  { key: 'stock.view',            groupKey: 'groupStock' },
  { key: 'stock.count',           groupKey: 'groupStock' },
  { key: 'stock.approve',         groupKey: 'groupStock' },
  { key: 'transfer.view',         groupKey: 'groupTransfer' },
  { key: 'transfer.manage',       groupKey: 'groupTransfer' },
  { key: 'borrow.view',           groupKey: 'groupTransfer' },
  { key: 'borrow.manage',         groupKey: 'groupTransfer' },
  { key: 'hq.view',               groupKey: 'groupHq' },
  { key: 'hq.manage',             groupKey: 'groupHq' },
  { key: 'commission.view',       groupKey: 'groupCommission' },
  { key: 'commission.manage',     groupKey: 'groupCommission' },
  { key: 'reports.view',          groupKey: 'groupReports' },
  { key: 'settings.manage',       groupKey: 'groupSettings' },
  { key: 'users.invite',          groupKey: 'groupUsers' },
  { key: 'users.manage',          groupKey: 'groupUsers' },
  { key: 'chat.use',              groupKey: 'groupChat' },
  { key: 'chat.admin',            groupKey: 'groupChat' },
  { key: 'announcements.manage', groupKey: 'groupAnnouncements' },
  { key: 'penalties.manage',      groupKey: 'groupPenalties' },
];

const ROLES = ['owner', 'accountant', 'manager', 'bar', 'staff', 'hq'];

export default async function PermissionsPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const t = await getTranslations('permissions');

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from('role_permissions')
    .select('role, permission_key, enabled')
    .eq('tenant_id', tenant.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}/settings`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← {t('back')}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">{t('breadcrumb')}</span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('intro')}
      </p>

      <PermissionsMatrix
        roles={ROLES}
        permissionDefs={PERMISSION_KEYS}
        initial={rows ?? []}
      />
    </div>
  );
}
