import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { resolveTenantBySlug, resolveTenantById, isTenantActive } from './resolve';
import type { Tenant, TenantContext } from './types';

/**
 * Server-side guard for API route handlers. Verifies:
 *   1. User is authenticated
 *   2. User belongs to a tenant (or is a platform admin)
 *   3. Tenant is active (not suspended / cancelled / expired trial)
 *
 * Returns either a TenantContext OR a NextResponse that should be returned
 * immediately (401/403/404 depending on the failure mode).
 */
export async function requireTenantContext(): Promise<
  | { ok: true; ctx: TenantContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Check platform admin first (takes precedence)
  const svc = createServiceClient();
  const { data: platformAdmin } = await svc
    .from('platform_admins')
    .select('id, active')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (platformAdmin) {
    // Platform admin has no default tenant scope — caller may pick one explicitly
    return {
      ok: true,
      ctx: {
        tenant: null as unknown as Tenant, // caller picks tenant via header/query
        userRole: null,
        userId: user.id,
        isTenantAdmin: false,
        isPlatformAdmin: true,
      },
    };
  }

  const { data: profile } = await svc
    .from('profiles')
    .select('tenant_id, role, active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.tenant_id || profile.active === false) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No active tenant' }, { status: 403 }),
    };
  }

  const tenant = await resolveTenantById(profile.tenant_id);
  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }

  if (!isTenantActive(tenant)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant suspended', status: tenant.status }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      tenant,
      userRole: profile.role as string,
      userId: user.id,
      isTenantAdmin: ['owner', 'accountant', 'hq'].includes(profile.role as string),
      isPlatformAdmin: false,
    },
  };
}

/**
 * Variant that also takes a tenant slug from the URL and verifies it
 * matches the user's tenant. Used by `/t/{slug}/...` API routes.
 */
export async function requireTenantContextForSlug(
  slug: string,
): Promise<
  | { ok: true; ctx: TenantContext }
  | { ok: false; response: NextResponse }
> {
  const base = await requireTenantContext();
  if (!base.ok) return base;

  // Platform admin: resolve the tenant they're impersonating
  if (base.ctx.isPlatformAdmin) {
    const tenant = await resolveTenantBySlug(slug);
    if (!tenant) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
      };
    }
    return { ok: true, ctx: { ...base.ctx, tenant } };
  }

  // Regular user: slug must match their tenant
  if (base.ctx.tenant?.slug !== slug) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 }),
    };
  }

  return base;
}

/**
 * Platform-admin-only guard (for /admin/* and /api/platform/* routes).
 */
export async function requirePlatformAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const svc = createServiceClient();
  const { data } = await svc
    .from('platform_admins')
    .select('id')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!data) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Platform admin required' }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
