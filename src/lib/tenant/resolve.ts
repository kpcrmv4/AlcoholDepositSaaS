import { createServiceClient } from '@/lib/supabase/server';
import type { Tenant, TenantWithSecrets } from './types';

const TENANT_PUBLIC_COLUMNS = [
  'id', 'slug', 'company_name', 'legal_name', 'contact_email', 'contact_phone',
  'country', 'timezone',
  'status', 'plan', 'max_branches', 'max_users',
  'trial_ends_at', 'subscription_ends_at',
  'line_mode', 'line_channel_id', 'line_basic_id', 'liff_id',
  'logo_url', 'brand_color', 'owner_user_id',
  'created_at', 'updated_at', 'suspended_at', 'suspension_reason',
].join(', ');

const TENANT_ALL_COLUMNS = [
  TENANT_PUBLIC_COLUMNS,
  'line_channel_secret', 'line_channel_token', 'line_owner_group_id', 'tax_id',
].join(', ');

/**
 * Resolve a tenant by its URL slug (e.g. "bar-somchai").
 * Uses service-role so it bypasses RLS — caller is responsible for authz.
 */
export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_PUBLIC_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[tenant] resolveTenantBySlug error:', error.message);
    return null;
  }
  return (data as Tenant | null) ?? null;
}

export async function resolveTenantById(id: string): Promise<Tenant | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[tenant] resolveTenantById error:', error.message);
    return null;
  }
  return (data as Tenant | null) ?? null;
}

/**
 * Resolve a tenant (with LINE secrets) by a LINE Channel ID, used in the
 * webhook handler. Returns null if no tenant owns this channel.
 */
export async function resolveTenantByLineChannelId(
  channelId: string,
): Promise<TenantWithSecrets | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_ALL_COLUMNS)
    .eq('line_channel_id', channelId)
    .maybeSingle();

  if (error) {
    console.error('[tenant] resolveTenantByLineChannelId error:', error.message);
    return null;
  }
  return (data as TenantWithSecrets | null) ?? null;
}

/**
 * Resolve a tenant (with LINE secrets) by a LIFF ID — used by the
 * customer entry page to establish tenant context from a LIFF deep-link.
 */
export async function resolveTenantByLiffId(
  liffId: string,
): Promise<TenantWithSecrets | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_ALL_COLUMNS)
    .eq('liff_id', liffId)
    .maybeSingle();

  if (error) {
    console.error('[tenant] resolveTenantByLiffId error:', error.message);
    return null;
  }
  return (data as TenantWithSecrets | null) ?? null;
}

/**
 * Resolve the tenant the currently-authenticated user belongs to.
 * Returns null for platform admins (they have no tenant) or orphan users.
 */
export async function resolveTenantForCurrentUser(userId: string): Promise<Tenant | null> {
  const supabase = createServiceClient();
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();

  if (profErr || !profile?.tenant_id) return null;
  return resolveTenantById(profile.tenant_id as string);
}

// Pure helpers (extractTenantSlugFromPath, extractTenantSlugFromHost,
// isTenantActive) have moved to ./resolve-client.ts so they can be safely
// used from Client Components without pulling in the Supabase server client.
export {
  extractTenantSlugFromPath,
  extractTenantSlugFromHost,
  isTenantActive,
} from './resolve-client';
