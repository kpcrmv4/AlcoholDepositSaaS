// Client-safe tenant exports.
// Server-only helpers (guard, resolve) live at '@/lib/tenant/server' so that
// importing anything from here does NOT pull in `next/headers` via the
// Supabase server client — which would break Turbopack client bundles.

export type {
  Tenant,
  TenantWithSecrets,
  TenantContext,
  TenantStatus,
  TenantPlan,
  LineMode,
  PlatformAdmin,
  PlatformAdminRole,
} from './types';

export {
  extractTenantSlugFromPath,
  extractTenantSlugFromHost,
  isTenantActive,
} from './resolve-client';

export { TenantProvider, useTenant, useTenantMaybe } from './context';
export { useTenantPath, useTenantSlug } from './use-tenant-path';
export { useTenantRouter } from './use-tenant-router';
export { TenantLink } from './link';
export { EnabledModulesProvider, useEnabledModules } from './enabled-modules';
