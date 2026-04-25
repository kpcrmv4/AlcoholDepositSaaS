import { NextRequest, NextResponse } from 'next/server';
import {
  createClient as createServerSession,
  createServiceClient,
} from '@/lib/supabase/server';
import { pushToCustomer } from '@/lib/line/messaging';
import {
  depositRequestApprovedFlex,
  depositRequestRejectedFlex,
} from '@/lib/line/flex-templates';
import { isCustomerTheme } from '@/lib/customer-themes';

/**
 * POST /api/deposit-request/notify-customer
 *
 * Push a Flex message to the customer's LINE inbox after staff
 * approves or rejects their deposit_request.
 *
 * Body:
 *   - requestId: string                 — the deposit_request id
 *   - action:    'approved' | 'rejected'
 *   - deposits?: Array<{ deposit_code, product_name, quantity, expiry_date }>
 *       (required when action='approved'; one Flex per deposit row)
 *   - reason?:   string                 — shown in the rejected Flex
 *
 * Auth: requires a Supabase session (any signed-in staff). Tenant scope is
 * enforced by RLS on `deposit_requests` so a user can only notify for
 * requests in their tenant's stores.
 */
export async function POST(request: NextRequest) {
  // ---- Auth: must be a signed-in staff member ----
  const sessionClient = await createServerSession();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, action, deposits, reason } = body as {
    requestId?: string;
    action?: 'approved' | 'rejected';
    deposits?: Array<{
      deposit_code: string;
      product_name: string;
      quantity: number;
      expiry_date: string | null;
    }>;
    reason?: string;
  };

  if (!requestId || !action || (action !== 'approved' && action !== 'rejected')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (action === 'approved' && (!deposits || deposits.length === 0)) {
    return NextResponse.json(
      { error: 'deposits[] required for approved action' },
      { status: 400 },
    );
  }

  // ---- Resolve request → customer line_user_id + store + tenant LINE config ----
  // We use the service-role client so RLS doesn't fight us, but the user has
  // already been authenticated via the session client above. The session
  // client also enforced tenant scope through RLS when reading the request,
  // so an attacker can't notify for other tenants' requests:
  const { data: reqRow, error: reqErr } = await sessionClient
    .from('deposit_requests')
    .select(
      'id, store_id, line_user_id, customer_name, status',
    )
    .eq('id', requestId)
    .maybeSingle();

  if (reqErr || !reqRow) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }
  if (!reqRow.line_user_id) {
    // No LINE user to notify — bail silently (success).
    return NextResponse.json({ success: true, skipped: 'no_line_user' });
  }

  const supabase = createServiceClient();

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name, tenant_id, line_token, line_channel_id, customer_theme')
    .eq('id', reqRow.store_id)
    .single();

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const storeTheme = isCustomerTheme(store.customer_theme)
    ? store.customer_theme
    : null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('line_mode, line_channel_token, line_channel_id')
    .eq('id', store.tenant_id)
    .maybeSingle();

  // Same precedence rule as src/lib/line/messaging.ts#getStoreLineConfig:
  // tenant config wins when tenant.line_mode='tenant' OR when the store has
  // no token of its own. Otherwise the store's per-store config takes over.
  const useTenantConfig =
    tenant?.line_mode === 'tenant' ||
    (!store.line_token && !!tenant?.line_channel_token);
  const lineToken: string | null = useTenantConfig
    ? tenant?.line_channel_token ?? null
    : store.line_token ?? null;

  if (!lineToken) {
    return NextResponse.json(
      { success: true, skipped: 'no_line_token' },
      { status: 200 },
    );
  }

  const customerName = reqRow.customer_name || 'ลูกค้า';
  const storeName = store.store_name || '';

  try {
    if (action === 'approved') {
      const messages = (deposits ?? []).map((d) =>
        depositRequestApprovedFlex({
          customer_name: customerName,
          store_name: storeName,
          deposit_code: d.deposit_code,
          product_name: d.product_name,
          quantity: d.quantity,
          expiry_date: d.expiry_date,
          theme: storeTheme,
        }),
      );
      // LINE accepts up to 5 messages per push call. If staff approves a
      // request that creates >5 deposits, chunk to stay within the limit.
      for (let i = 0; i < messages.length; i += 5) {
        const chunk = messages.slice(i, i + 5);
        await pushToCustomer(reqRow.line_user_id, chunk, lineToken);
      }
    } else {
      const flex = depositRequestRejectedFlex({
        customer_name: customerName,
        store_name: storeName,
        reason: reason || null,
        theme: storeTheme,
      });
      await pushToCustomer(reqRow.line_user_id, [flex], lineToken);
    }
  } catch (err) {
    console.error('[DepositRequest Notify] LINE push failed:', err);
    return NextResponse.json({ error: 'LINE push failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
