import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function TenantHomePage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return null;

  const supabase = createServiceClient();
  const [{ count: branchCount }, { count: userCount }] = await Promise.all([
    supabase.from('stores').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
  ]);

  const SETTINGS_LINKS = [
    { href: `/t/${slug}/settings/company`, label: 'บริษัท', desc: 'ข้อมูลบริษัทและการติดต่อ' },
    { href: `/t/${slug}/settings/branches`, label: `สาขา (${branchCount ?? 0}/${tenant.max_branches})`, desc: 'จัดการสาขาและโควต้า' },
    { href: `/t/${slug}/settings/users`, label: `ผู้ใช้ (${userCount ?? 0}/${tenant.max_users})`, desc: 'เชิญและจัดการพนักงาน' },
    { href: `/t/${slug}/settings/line`, label: 'LINE OA', desc: 'ตั้งค่า Channel + LIFF' },
    { href: `/t/${slug}/settings/features`, label: 'ฟังก์ชั่น', desc: 'เปิด/ปิดโมดูลของแต่ละสาขา' },
    { href: `/t/${slug}/settings/permissions`, label: 'สิทธิ์', desc: 'กำหนดสิทธิ์ของแต่ละ role' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tenant.company_name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tenant.status === 'trial'
            ? `ทดลองใช้ — หมดอายุ ${
                tenant.trial_ends_at
                  ? new Date(tenant.trial_ends_at).toLocaleDateString('th-TH')
                  : 'ไม่ระบุ'
              }`
            : `แพ็กเกจ: ${tenant.plan}`}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SETTINGS_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
          >
            <div className="font-medium">{l.label}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{l.desc}</div>
          </Link>
        ))}
      </section>

      <section className="rounded border border-indigo-100 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950">
        <div className="font-medium text-indigo-900 dark:text-indigo-200">🚀 เข้าใช้งานระบบหลัก</div>
        <p className="mt-1 text-indigo-800 dark:text-indigo-300">
          ระบบสต๊อก/ฝาก/เบิก/โอน/ยืม ของพนักงานใช้ได้ที่ <Link href="/" className="underline">Dashboard</Link>
        </p>
      </section>
    </div>
  );
}
