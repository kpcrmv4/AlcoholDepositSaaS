import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TenantProvider } from '@/lib/tenant/context';
import { resolveTenantBySlug, isTenantActive } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

async function guard(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/t/${slug}`);

  const svc = createServiceClient();
  const [{ data: profile }, { data: platformAdmin }] = await Promise.all([
    svc.from('profiles').select('tenant_id, role, active').eq('id', user.id).maybeSingle(),
    svc.from('platform_admins').select('id, active').eq('id', user.id).eq('active', true).maybeSingle(),
  ]);

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) notFound();

  // Platform admins are allowed to impersonate
  if (platformAdmin) {
    return { tenant, role: 'owner' as const, userId: user.id, isPlatformAdmin: true };
  }

  if (!profile?.tenant_id || profile.tenant_id !== tenant.id || profile.active === false) {
    redirect('/login?error=tenant-mismatch');
  }

  if (!isTenantActive(tenant)) redirect('/suspended');

  return { tenant, role: profile.role as string, userId: user.id, isPlatformAdmin: false };
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const ctx = await guard(slug);

  return (
    <TenantProvider tenant={ctx.tenant}>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Link href={`/t/${slug}`} className="flex items-center gap-2">
                {ctx.tenant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ctx.tenant.logo_url} alt="" className="h-7 w-7 rounded" />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded text-xs font-semibold text-white"
                    style={{ background: ctx.tenant.brand_color || '#4f46e5' }}
                  >
                    {ctx.tenant.company_name.charAt(0)}
                  </div>
                )}
                <span className="font-semibold">{ctx.tenant.company_name}</span>
              </Link>
              <span className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:inline">
                {ctx.tenant.slug}
              </span>
              {ctx.isPlatformAdmin && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Platform admin (impersonating)
                </span>
              )}
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <Link href={`/t/${slug}/settings/company`} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Settings
              </Link>
              <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Dashboard →
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </TenantProvider>
  );
}
