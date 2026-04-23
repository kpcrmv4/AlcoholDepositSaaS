import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import FeaturesManager from './features-manager';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

// Modules the tenant can toggle per-store. Keep in sync with registry.ts.
const FEATURE_KEYS = [
  { key: 'stock', label: 'สต๊อก / นับของ / OCR' },
  { key: 'deposit', label: 'ฝากเหล้า' },
  { key: 'withdrawal', label: 'เบิกเหล้า' },
  { key: 'transfer', label: 'โอนระหว่างสาขา' },
  { key: 'borrow', label: 'ยืมระหว่างสาขา' },
  { key: 'hq_warehouse', label: 'คลังกลาง (HQ)' },
  { key: 'commission', label: 'Commission / AE' },
  { key: 'chat', label: 'แชทภายในร้าน' },
  { key: 'print_server', label: 'Print server (POS80)' },
  { key: 'line_messaging', label: 'แจ้งเตือนผ่าน LINE' },
  { key: 'announcements', label: 'ประกาศ / โปรโมชั่น' },
  { key: 'penalties', label: 'ค่าปรับพนักงาน' },
];

export default async function FeaturesPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: stores } = await svc
    .from('stores')
    .select('id, store_code, store_name, active')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('store_code');

  const storeIds = (stores ?? []).map((s) => s.id);
  const { data: features } = await svc
    .from('store_features')
    .select('store_id, feature_key, enabled')
    .in('store_id', storeIds.length > 0 ? storeIds : ['00000000-0000-0000-0000-000000000000']);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">ฟังก์ชั่น / สาขา</span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        เปิด/ปิดโมดูลของแต่ละสาขา. หากปิดจะไม่แสดงเมนูและ API ของฟังก์ชั่นนั้น
      </p>

      <FeaturesManager stores={stores ?? []} features={features ?? []} featureKeys={FEATURE_KEYS} />
    </div>
  );
}
