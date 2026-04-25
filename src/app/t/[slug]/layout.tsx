import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TenantProvider } from '@/lib/tenant/context';
import { resolveTenantBySlug, isTenantActive } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/** Read the current pathname from the headers Next.js exposes in RSC. */
async function getCurrentPathname(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-pathname') ||
    h.get('x-invoke-path') ||
    h.get('next-url') ||
    ''
  );
}

function isCustomerPath(pathname: string, slug: string): boolean {
  const prefix = `/t/${slug}/customer`;
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

interface StaffCtx {
  tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>;
  role: string;
  userId: string;
  isPlatformAdmin: boolean;
}

/** Resolve auth + tenant for staff routes (everything outside /customer). */
async function guardStaff(slug: string): Promise<StaffCtx> {
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

  if (platformAdmin) {
    return { tenant, role: 'owner', userId: user.id, isPlatformAdmin: true };
  }

  if (!profile?.tenant_id || profile.tenant_id !== tenant.id || profile.active === false) {
    redirect('/login?error=tenant-mismatch');
  }

  if (!isTenantActive(tenant)) redirect('/suspended');

  return { tenant, role: profile.role as string, userId: user.id, isPlatformAdmin: false };
}

/**
 * Tenant layout — intentionally chrome-free.
 *
 * Two access paths:
 *   • Staff routes (everything except /customer): require an authenticated
 *     Supabase session belonging to this tenant. Suspended tenants get
 *     bounced to /suspended.
 *   • Customer LIFF routes (/customer/*): public — auth is handled client-
 *     side by the LIFF SDK / customer-token URL param, since the LINE in-
 *     app browser has no Supabase cookies. We still resolve the tenant by
 *     slug so the LIFF page can read its branding/liff_id from context.
 *
 * The dashboard sub-layout (`(dashboard)/layout.tsx`) and the customer
 * sub-layout each render their own full-screen UI; we don't add chrome
 * here. The only thing we ever render is a thin amber strip when a
 * platform admin is impersonating a tenant.
 */
export default async function TenantLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const pathname = await getCurrentPathname();
  const customerPath = isCustomerPath(pathname, slug);

  if (customerPath) {
    const tenant = await resolveTenantBySlug(slug);
    if (!tenant) notFound();
    if (!isTenantActive(tenant)) redirect('/suspended');
    return <TenantProvider tenant={tenant}>{children}</TenantProvider>;
  }

  const ctx = await guardStaff(slug);

  return (
    <TenantProvider tenant={ctx.tenant!}>
      {ctx.isPlatformAdmin && (
        <div className="bg-amber-500 px-4 py-1 text-center text-xs font-medium text-amber-950">
          ⚠️ Platform admin — impersonating <strong>{ctx.tenant!.company_name}</strong> ({ctx.tenant!.slug})
        </div>
      )}
      {children}
    </TenantProvider>
  );
}
