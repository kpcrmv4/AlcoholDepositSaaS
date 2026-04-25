import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

const MODULE_LABELS: Record<string, { label: string; group: string }> = {
  overview:                 { label: 'Overview',                  group: 'หลัก' },
  chat:                     { label: 'Chat',                      group: 'หลัก' },
  stock:                    { label: 'Stock / นับของ / OCR',       group: 'คลังสินค้า' },
  deposit:                  { label: 'ฝาก / เบิกเหล้า',            group: 'คลังสินค้า' },
  transfer:                 { label: 'โอนระหว่างสาขา',             group: 'คลังสินค้า' },
  borrow:                   { label: 'ยืมระหว่างสาขา',             group: 'คลังสินค้า' },
  'hq-warehouse':           { label: 'คลังกลาง (HQ)',              group: 'คลังสินค้า' },
  commission:               { label: 'Commission / AE',           group: 'คลังสินค้า' },
  reports:                  { label: 'รายงาน',                    group: 'รายงาน' },
  activity:                 { label: 'Activity log',              group: 'รายงาน' },
  'performance-staff':      { label: 'วิเคราะห์ — พนักงาน',         group: 'วิเคราะห์' },
  'performance-stores':     { label: 'วิเคราะห์ — สาขา',           group: 'วิเคราะห์' },
  'performance-operations': { label: 'วิเคราะห์ — operations',    group: 'วิเคราะห์' },
  'performance-customers':  { label: 'วิเคราะห์ — ลูกค้า',          group: 'วิเคราะห์' },
  guide:                    { label: 'คู่มือ',                    group: 'ช่วยเหลือ' },
  announcements:            { label: 'ประกาศ',                    group: 'ระบบ' },
  users:                    { label: 'ผู้ใช้',                     group: 'ระบบ' },
  settings:                 { label: 'ตั้งค่าในแอป',              group: 'ระบบ' },
};

export default async function FeaturesPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from('tenant_modules')
    .select('module_key, enabled')
    .eq('tenant_id', tenant.id);

  const status = new Map<string, boolean>();
  for (const r of (rows ?? []) as { module_key: string; enabled: boolean }[]) {
    status.set(r.module_key, r.enabled);
  }

  const groups = Object.entries(MODULE_LABELS).reduce<
    Record<string, { key: string; label: string; enabled: boolean }[]>
  >((acc, [key, meta]) => {
    (acc[meta.group] ??= []).push({ key, label: meta.label, enabled: status.get(key) ?? false });
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">โมดูล</span>
      </div>

      <div className="rounded border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
        🔒 รายการนี้ถูกกำหนดโดย <strong>ผู้ดูแลระบบ (Platform Admin)</strong> ตามแพ็กเกจของบริษัท.
        หากต้องการเปิด/ปิดโมดูล กรุณาติดต่อผู้ดูแลระบบ. การเปิด/ปิดให้แต่ละ role
        เห็นเมนูใดบ้าง ตั้งค่าได้ที่{' '}
        <Link href={`/t/${slug}/settings/permissions`} className="underline">
          สิทธิ์ตาม role
        </Link>.
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, items]) => (
          <section
            key={groupName}
            className="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {groupName}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {items.map((m) => (
                <li
                  key={m.key}
                  className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                >
                  <span>{m.label}</span>
                  {m.enabled ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      เปิด
                    </span>
                  ) : (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      ปิด
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
