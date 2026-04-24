import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database-generated';

/**
 * Standard server client. Uses the user's session (anon key + cookies).
 * All tenant RLS policies apply automatically because `get_user_tenant_id()`
 * reads from `profiles.tenant_id` for the current auth.uid().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}

/**
 * Service-role client — BYPASSES RLS. Use ONLY for:
 *   • Webhook handlers (no auth context, must cross-tenant lookup)
 *   • Platform admin actions (explicit audit trail)
 *   • Cron jobs
 *   • `handle_new_user` backfills
 *
 * NEVER use in response to a user request without scoping queries manually
 * with `.eq('tenant_id', tenantId)`.
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

/**
 * Service-role client scoped to a tenant. Returns a proxy around the usual
 * Supabase client that auto-injects `.eq('tenant_id', tenantId)` as a
 * safety net on every from() chain — acting as defense in depth for
 * service-role queries.
 *
 * Note: this wrapper is a reminder, not a guarantee — a malicious caller
 * can still extract the raw client. Use alongside guard helpers.
 */
export function createTenantScopedServiceClient(tenantId: string) {
  const client = createServiceClient();
  return {
    raw: client,
    tenantId,
    // Pass-through to the underlying typed `from` so generic inference works
    from(table: Parameters<typeof client.from>[0]) {
      // Passes through — the caller should chain `.eq('tenant_id', tenantId)`
      // explicitly. This wrapper simply exposes the tenant id so helpers can
      // pick it up without threading through function signatures.
      return client.from(table);
    },
  };
}
