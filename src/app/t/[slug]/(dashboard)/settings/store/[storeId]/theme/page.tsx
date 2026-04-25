import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import { isCustomerTheme, DEFAULT_CUSTOMER_THEME } from '@/lib/customer-themes';
import ThemePickerForm from './theme-picker-form';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string; storeId: string }>;
}

export default async function StoreThemePage({ params }: Params) {
  const { slug, storeId } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: store } = await svc
    .from('stores')
    .select('id, store_code, store_name, customer_theme')
    .eq('tenant_id', tenant.id)
    .eq('id', storeId)
    .single();

  if (!store) notFound();

  const initialTheme = isCustomerTheme(store.customer_theme)
    ? store.customer_theme
    : DEFAULT_CUSTOMER_THEME;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/t/${slug}/settings/branches`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          กลับไปรายการสาขา
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          ธีมหน้าลูกค้า
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เลือกหน้าตาที่ลูกค้าเห็นเมื่อเปิด LINE LIFF ของสาขา{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {store.store_name}
          </span>{' '}
          <span className="font-mono text-xs">({store.store_code})</span>
        </p>
      </div>

      <ThemePickerForm storeId={store.id} initialTheme={initialTheme} />
    </div>
  );
}
