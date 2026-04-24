// Server-only tenant helpers. Importing from here brings in
// `@/lib/supabase/server` which uses `next/headers` — DO NOT import this
// file from a Client Component or shared module that a client might load.

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
  resolveTenantBySlug,
  resolveTenantById,
  resolveTenantByLineChannelId,
  resolveTenantByLiffId,
  resolveTenantForCurrentUser,
  extractTenantSlugFromPath,
  extractTenantSlugFromHost,
  isTenantActive,
} from './resolve';

export {
  requireTenantContext,
  requireTenantContextForSlug,
  requirePlatformAdmin,
} from './guard';
