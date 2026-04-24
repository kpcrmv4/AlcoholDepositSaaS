'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTenantPath } from './use-tenant-path';

/**
 * Returns a wrapped Next.js router where `push` / `replace` / `prefetch`
 * auto-prefix absolute paths with `/t/{slug}` when inside a tenant route.
 *
 * Usage:
 *   const router = useTenantRouter();
 *   router.push('/stock/daily-check');  // → /t/{slug}/stock/daily-check
 *
 * Back/forward/refresh are passed through unchanged.
 */
export function useTenantRouter() {
  const router = useRouter();
  const tenantPath = useTenantPath();

  return useMemo(
    () => ({
      push: (href: string, opts?: Parameters<typeof router.push>[1]) =>
        router.push(tenantPath(href), opts),
      replace: (href: string, opts?: Parameters<typeof router.replace>[1]) =>
        router.replace(tenantPath(href), opts),
      prefetch: (href: string, opts?: Parameters<typeof router.prefetch>[1]) =>
        router.prefetch(tenantPath(href), opts),
      back: () => router.back(),
      forward: () => router.forward(),
      refresh: () => router.refresh(),
    }),
    [router, tenantPath],
  );
}
