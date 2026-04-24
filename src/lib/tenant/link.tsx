'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useTenantPath } from './use-tenant-path';

type NextLinkProps = ComponentProps<typeof NextLink>;

/**
 * Drop-in replacement for Next.js `<Link>` that auto-prefixes absolute paths
 * with `/t/{slug}` when inside a tenant route. External, hash, admin, login,
 * invite, api, and already-prefixed paths pass through unchanged.
 *
 * Intentional API-compat with next/link so the common pattern works:
 *   import { TenantLink as Link } from '@/lib/tenant/link';
 */
export function TenantLink(props: NextLinkProps) {
  const tenantPath = useTenantPath();
  const { href, ...rest } = props;
  const nextHref = typeof href === 'string' ? tenantPath(href) : href;
  return <NextLink href={nextHref} {...rest} />;
}
