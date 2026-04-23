import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Root route resolves the user's tenant and redirects into the tenant-scoped
 * dashboard. Platform admins go to /admin/tenants; customers go to their
 * tenant's /customer; tenant members go to /t/{slug}/overview.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const svc = createServiceClient();

  const { data: admin } = await svc
    .from('platform_admins')
    .select('id')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (admin) redirect('/admin/tenants');

  const { data: profile } = await svc
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect('/login?error=no-tenant');

  const { data: tenant } = await svc
    .from('tenants')
    .select('slug, status')
    .eq('id', profile.tenant_id)
    .maybeSingle();

  if (!tenant) redirect('/login?error=tenant-not-found');
  if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
    redirect('/suspended');
  }

  if (profile.role === 'customer') {
    redirect(`/t/${tenant.slug}/customer`);
  }
  redirect(`/t/${tenant.slug}/overview`);
}
