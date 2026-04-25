import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import LineForm from './line-form';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function LineSettingsPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const { data: full } = await svc
    .from('tenants')
    .select('line_mode, line_channel_id, line_basic_id, liff_id, line_owner_group_id, line_channel_secret, line_channel_token')
    .eq('id', tenant.id)
    .maybeSingle();

  const config = {
    line_mode: full?.line_mode ?? 'per_store',
    line_channel_id: full?.line_channel_id ?? '',
    line_basic_id: full?.line_basic_id ?? '',
    liff_id: full?.liff_id ?? '',
    line_owner_group_id: full?.line_owner_group_id ?? '',
    has_channel_secret: !!full?.line_channel_secret,
    has_channel_token: !!full?.line_channel_token,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LINE OA</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เชื่อมต่อ LINE Official Account ของบริษัท
        </p>
      </div>

      <div className="rounded border border-indigo-100 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950">
        <div className="mb-1 font-medium text-indigo-900 dark:text-indigo-200">Webhook URL</div>
        <code className="block font-mono text-xs text-indigo-800 dark:text-indigo-300">
          {appUrl || '(NEXT_PUBLIC_APP_URL not set)'}/api/line/webhook
        </code>
        <div className="mt-2 text-xs text-indigo-800 dark:text-indigo-300">
          วางใน LINE Developer Console → Channel → Webhook URL และเปิด "Use webhook"
        </div>
      </div>

      <LineForm initial={config} />
    </div>
  );
}
