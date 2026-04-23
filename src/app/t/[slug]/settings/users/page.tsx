import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug } from '@/lib/tenant/resolve';
import UsersManager from './users-manager';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function UsersPage({ params }: Params) {
  const { slug } = await params;
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  const svc = createServiceClient();
  const [{ data: users }, { data: invitations }, { data: stores }] = await Promise.all([
    svc
      .from('profiles')
      .select('id, username, role, active, display_name, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true }),
    svc
      .from('tenant_invitations')
      .select('id, email, role, store_ids, accepted_at, expires_at, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),
    svc
      .from('stores')
      .select('id, store_code, store_name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('store_code'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/t/${slug}`} className="text-gray-500 hover:underline dark:text-gray-400">
          ← Settings
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium">ผู้ใช้</span>
      </div>
      <UsersManager
        tenantMaxUsers={tenant.max_users}
        users={users ?? []}
        invitations={invitations ?? []}
        stores={stores ?? []}
      />
    </div>
  );
}
