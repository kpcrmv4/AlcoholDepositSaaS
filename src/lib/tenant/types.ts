export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type TenantPlan = 'trial' | 'starter' | 'growth' | 'enterprise' | 'custom';
export type LineMode = 'tenant' | 'per_store';
export type PlatformAdminRole = 'super_admin' | 'admin' | 'support' | 'readonly';

/**
 * Minimal tenant shape shared across server + client.
 * Secrets (line_channel_secret, line_channel_token) are NEVER in this type —
 * use `TenantWithSecrets` server-side only.
 */
export interface Tenant {
  id: string;
  slug: string;
  company_name: string;
  legal_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  country: string;
  timezone: string;

  status: TenantStatus;
  plan: TenantPlan;
  max_branches: number;
  max_users: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;

  line_mode: LineMode;
  line_channel_id: string | null;
  line_basic_id: string | null;
  liff_id: string | null;

  logo_url: string | null;
  brand_color: string;
  owner_user_id: string | null;

  created_at: string;
  updated_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

/** Server-side only — includes LINE secrets + token. Never serialize to client. */
export interface TenantWithSecrets extends Tenant {
  line_channel_secret: string | null;
  line_channel_token: string | null;
  line_owner_group_id: string | null;
  tax_id: string | null;
}

/**
 * The tenant context attached to every request that hits a tenant-scoped route.
 * Resolved by middleware and passed down via request headers (`x-tenant-id`,
 * `x-tenant-slug`) or fetched fresh in server components.
 */
export interface TenantContext {
  tenant: Tenant;
  userRole: string | null;      // user_role enum or null for anonymous/customer
  userId: string | null;
  isTenantAdmin: boolean;       // role in (owner, accountant, hq)
  isPlatformAdmin: boolean;     // row in platform_admins
}

export interface PlatformAdmin {
  id: string;
  email: string;
  display_name: string | null;
  role: PlatformAdminRole;
  active: boolean;
  created_at: string;
}
