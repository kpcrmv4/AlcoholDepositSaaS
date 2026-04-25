import { notFound } from 'next/navigation';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import CompanyForm from './company-form';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function CompanySettingsPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">บริษัท</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ข้อมูลบริษัท ตราสัญลักษณ์ และข้อมูลติดต่อ
        </p>
      </div>
      <CompanyForm tenant={tenant} />
    </div>
  );
}
