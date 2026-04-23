import { createServiceClient } from '@/lib/supabase/server';
import { generateCustomerUrl } from '@/lib/auth/customer-token';

/**
 * Customer entry URL builder (SaaS multi-tenant)
 *
 * Returns the URL that LINE messages should point to when the customer
 * taps "open deposit system" in a Flex card.
 *
 * Preference order:
 *   1. Tenant LIFF URL (`https://liff.line.me/{tenant.liff_id}?store={code}`)
 *   2. Tokenized fallback URL (`/customer?token=xxx&store={code}`)
 *
 * The LIFF id lives on `tenants.liff_id` now — each tenant has its own
 * OA and its own LIFF app.
 */

/** Per-tenant in-memory cache for LIFF id (refreshed every 5 minutes). */
const liffCache = new Map<string, { value: string; fetchedAt: number }>();
const LIFF_CACHE_MS = 5 * 60 * 1000;

export async function getTenantLiffId(tenantId: string): Promise<string> {
  const now = Date.now();
  const cached = liffCache.get(tenantId);
  if (cached && now - cached.fetchedAt < LIFF_CACHE_MS) {
    return cached.value;
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('tenants')
      .select('liff_id')
      .eq('id', tenantId)
      .maybeSingle();

    const value = (data?.liff_id as string | null) || '';
    liffCache.set(tenantId, { value, fetchedAt: now });
    return value;
  } catch {
    return '';
  }
}

/** Invalidate cache after tenant's LIFF id is updated. */
export function invalidateTenantLiffIdCache(tenantId?: string): void {
  if (tenantId) liffCache.delete(tenantId);
  else liffCache.clear();
}

interface BuildCustomerEntryUrlParams {
  /** Tenant the customer belongs to (required). */
  tenantId: string;
  /** LINE user id — required only for the tokenized fallback path. */
  lineUserId: string | null;
  /** Branch store_code, passed as ?store= for UI context. */
  storeCode?: string | null;
  /** Sub-path under /customer (e.g. '', '/history', '/deposit'). */
  path?: string;
}

export async function buildCustomerEntryUrl(
  params: BuildCustomerEntryUrlParams,
): Promise<string> {
  const { tenantId, lineUserId, storeCode, path = '' } = params;
  const liffId = await getTenantLiffId(tenantId);

  // --- Preferred path: LIFF deep link -------------------------------------
  if (liffId) {
    const qs = new URLSearchParams();
    if (storeCode) qs.set('store', storeCode);
    const query = qs.toString();
    const subPath = path ? `/${path.replace(/^\/+/, '')}` : '';
    return `https://liff.line.me/${liffId}${subPath}${query ? `?${query}` : ''}`;
  }

  // --- Fallback: tokenized /customer URL ----------------------------------
  if (!lineUserId) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/customer${path || ''}`;
  }

  const tokenUrl = generateCustomerUrl(lineUserId, `/customer${path || ''}`);
  if (!storeCode) return tokenUrl;
  return `${tokenUrl}&store=${encodeURIComponent(storeCode)}`;
}

// ---------------------------------------------------------------------------
// Legacy helpers — kept for compatibility while callers are migrated
// ---------------------------------------------------------------------------

/**
 * @deprecated There is no central LIFF id in multi-tenant mode. Prefer
 * `getTenantLiffId(tenantId)`. This function resolves the default tenant's
 * LIFF id so existing call sites don't crash immediately.
 */
export async function getCentralLiffId(): Promise<string> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('tenants')
      .select('liff_id')
      .eq('slug', 'default')
      .maybeSingle();
    return (data?.liff_id as string | null) || '';
  } catch {
    return '';
  }
}

/** @deprecated — call `invalidateTenantLiffIdCache(tenantId)` instead. */
export function invalidateCentralLiffIdCache(): void {
  invalidateTenantLiffIdCache();
}
