import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import PermissionsMatrix from './permissions-matrix';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

// Canonical list of permissions in this system.
// Keep in sync with role_permissions seed in migration 00000.
const PERMISSION_KEYS = [
  { key: 'deposits.view', group: 'ฝากเหล้า' },
  { key: 'deposits.manage', group: 'ฝากเหล้า' },
  { key: 'withdrawals.view', group: 'เบิกเหล้า' },
  { key: 'withdrawals.manage', group: 'เบิกเหล้า' },
  { key: 'stock.view', group: 'สต๊อก' },
  { key: 'stock.count', group: 'สต๊อก' },
  { key: 'stock.approve', group: 'สต๊อก' },
  { key: 'transfer.view', group: 'โอน/ยืม' },
  { key: 'transfer.manage', group: 'โอน/ยืม' },
  { key: 'borrow.view', group: 'โอน/ยืม' },
  { key: 'borrow.manage', group: 'โอน/ยืม' },
  { key: 'hq.view', group: 'HQ' },
  { key: 'hq.manage', group: 'HQ' },
  { key: 'commission.view', group: 'Commission' },
  { key: 'commission.manage', group: 'Commission' },
  { key: 'reports.view', group: 'รายงาน' },
  { key: 'settings.manage', group: 'การตั้งค่า' },
  { key: 'users.invite', group: 'ผู้ใช้' },
  { key: 'users.manage', group: 'ผู้ใช้' },
  { key: 'chat.use', group: 'แชท' },
  { key: 'chat.admin', group: 'แชท' },
  { key: 'announcements.manage', group: 'ประกาศ' },
  { key: 'penalties.manage', group: 'ค่าปรับ' },
];

const ROLES = ['owner', 'accountant', 'manager', 'bar', 'staff', 'hq'];

export default async function PermissionsPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from('role_permissions')
    .select('role, permission_key, enabled')
    .eq('tenant_id', tenant.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">สิทธิ์ (Role × Permission)</span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        กำหนดว่า role ไหนทำอะไรได้บ้าง. Owner มีสิทธิ์ทั้งหมดเสมอ (แก้ไม่ได้).
      </p>

      <PermissionsMatrix
        roles={ROLES}
        permissionDefs={PERMISSION_KEYS}
        initial={rows ?? []}
      />
    </div>
  );
}
