import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function BranchesPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: stores } = await svc
    .from('stores')
    .select('id, store_code, store_name, is_central, active, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true });

  const activeCount = (stores ?? []).filter((s) => s.active).length;
  const canAdd = activeCount < tenant.max_branches;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">สาขา</span>
      </div>

      <div className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <div className="text-2xl font-semibold">
            {activeCount} <span className="text-gray-400">/ {tenant.max_branches}</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">สาขาที่เปิดใช้งาน</div>
        </div>
        <div>
          {canAdd ? (
            <Link
              href="/settings/stores/new"
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + เพิ่มสาขา
            </Link>
          ) : (
            <div className="text-right">
              <button
                disabled
                className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-500 dark:bg-gray-800"
              >
                เพิ่มสาขาไม่ได้ (เต็มโควต้า)
              </button>
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                ติดต่อผู้ดูแลระบบเพื่ออัพเกรดแพ็กเกจ
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-2 font-medium">รหัส</th>
              <th className="px-4 py-2 font-medium">ชื่อสาขา</th>
              <th className="px-4 py-2 font-medium">ประเภท</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 font-medium">สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {(stores ?? []).map((s) => (
              <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2 font-mono text-xs">{s.store_code}</td>
                <td className="px-4 py-2">{s.store_name}</td>
                <td className="px-4 py-2">
                  {s.is_central ? (
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      คลังกลาง
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">สาขา</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {s.active ? (
                    <span className="text-emerald-700 dark:text-emerald-400">active</span>
                  ) : (
                    <span className="text-gray-400">inactive</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(s.created_at).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
            {(stores ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  ยังไม่มีสาขา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
