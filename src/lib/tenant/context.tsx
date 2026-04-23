'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Tenant } from './types';

interface TenantCtxValue {
  tenant: Tenant;
}

const TenantContext = createContext<TenantCtxValue | null>(null);

/**
 * Wrap a subtree with the current tenant. Server components should resolve
 * the tenant (via `resolveTenantBySlug` / `resolveTenantForCurrentUser`) and
 * pass it as a prop so this provider can surface it to client components.
 */
export function TenantProvider({
  tenant,
  children,
}: {
  tenant: Tenant;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to read the current tenant. Throws if used outside a TenantProvider —
 * that mistake should be caught at dev time, not in production.
 */
export function useTenant(): Tenant {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used inside <TenantProvider>');
  }
  return ctx.tenant;
}

/** Safe variant that returns null when outside a provider. */
export function useTenantMaybe(): Tenant | null {
  const ctx = useContext(TenantContext);
  return ctx?.tenant ?? null;
}
