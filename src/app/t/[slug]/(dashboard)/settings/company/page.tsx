import { notFound } from 'next/navigation';
import Link from 'next/link';
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
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}/settings`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">บริษัท</span>
      </div>
      <CompanyForm tenant={tenant} />
    </div>
  );
}
