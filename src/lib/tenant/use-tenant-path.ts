'use client';

import { useParams } from 'next/navigation';

/**
 * Returns a function that prefixes paths with `/t/{slug}` when inside
 * a tenant route, and returns the path unchanged otherwise.
 *
 * Usage:
 *   const tenantPath = useTenantPath();
 *   <Link href={tenantPath('/overview')}>Overview</Link>
 *
 * At /t/somchai/overview  →  tenantPath('/stock') = '/t/somchai/stock'
 * Outside tenant scope    →  tenantPath('/stock') = '/stock'
 *                            (middleware will redirect to the right tenant)
 */
export function useTenantPath(): (path: string) => string {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : null;

  return (path: string): string => {
    if (!slug) return path;
    if (!path.startsWith('/')) path = `/${path}`;
    // Don't double-prefix paths that already include /t/...
    if (path.startsWith(`/t/${slug}`)) return path;
    if (path.startsWith('/t/')) return path;           // another tenant slug — leave
    if (path.startsWith('/admin')) return path;        // platform admin paths
    if (path.startsWith('/invite')) return path;       // public invite
    if (path === '/login' || path.startsWith('/login')) return path;
    if (path === '/suspended') return path;
    if (path.startsWith('/api/')) return path;
    return `/t/${slug}${path}`;
  };
}

/**
 * Return just the slug from the current URL, or null when outside a
 * tenant route.
 */
export function useTenantSlug(): string | null {
  const params = useParams();
  return typeof params?.slug === 'string' ? params.slug : null;
}
