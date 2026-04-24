// Pure helpers that do NOT touch the Supabase server client. Safe to use
// from Client Components, middleware, and server components alike.

import type { Tenant } from './types';

/**
 * Extract a `/t/{slug}/...` prefix from a URL pathname.
 * Returns the slug or null if the path isn't tenant-scoped.
 */
export function extractTenantSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/t\/([^/]+)(?:\/|$)/);
  return m?.[1] ?? null;
}

/**
 * Extract a `{slug}.example.com` subdomain from a hostname.
 * Returns null if not running on a multi-tenant subdomain.
 */
export function extractTenantSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const parts = host.split(':')[0].split('.');
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (['www', 'app', 'admin', 'api', 'liff'].includes(sub)) return null;
  return sub;
}

export function isTenantActive(tenant: Tenant): boolean {
  if (tenant.status === 'suspended' || tenant.status === 'cancelled') return false;
  if (tenant.status === 'trial' && tenant.trial_ends_at) {
    return new Date(tenant.trial_ends_at).getTime() > Date.now();
  }
  return true;
}
