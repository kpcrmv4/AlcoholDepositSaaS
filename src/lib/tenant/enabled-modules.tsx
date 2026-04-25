'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

const Ctx = createContext<ReadonlySet<string> | null>(null);

/**
 * Surfaces the platform-controlled module allowlist for the current tenant
 * so client components (sidebar, mobile drawer, bottom-nav) can hide
 * modules the super admin has not enabled.
 *
 * Server layouts fetch `tenant_modules` and pass the enabled module_keys
 * down via this provider.
 */
export function EnabledModulesProvider({
  enabledModules,
  children,
}: {
  enabledModules: readonly string[];
  children: ReactNode;
}) {
  const set = useMemo(() => new Set(enabledModules), [enabledModules]);
  return <Ctx.Provider value={set}>{children}</Ctx.Provider>;
}

/**
 * Returns the allowlist as a Set, or `null` when used outside a provider
 * (e.g. customer area, platform admin pages). `null` means "don't filter
 * by tenant module list" — caller should still apply role/permission gates.
 */
export function useEnabledModules(): ReadonlySet<string> | null {
  return useContext(Ctx);
}
