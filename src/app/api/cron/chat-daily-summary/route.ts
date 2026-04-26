/**
 * GET /api/cron/chat-daily-summary
 *
 * Cron job: ส่งสรุปประจำวันเข้าห้องแชทสาขา
 * รวม: ฝากเหล้า, เบิกเหล้า, สต๊อก, ยืมสินค้า
 *
 * Schedule: hourly (see vercel.json). On each tick, only stores whose
 * `chat_bot_daily_summary_send_time` falls in the current Bangkok hour
 * are processed — this lets each branch pick its own send time without
 * needing one cron entry per branch. The "business day just ended"
 * window is derived per-store from each store's configured hours.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendBotMessage } from '@/lib/chat/bot';
import { getChatBotSettings } from '@/lib/chat/bot-settings';
import {
  bangkokParts,
  fetchStoreHours,
  currentShiftWindow,
} from '@/lib/store/hours';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Pick stores whose configured send time falls in the current Bangkok
  // hour. The TIME column is half-open at the second level — to allow
  // any minute within the same hour we filter to [HH:00, HH+1:00).
  const bk = bangkokParts();
  const hourStart = `${String(bk.hour).padStart(2, '0')}:00:00`;
  const hourEnd = `${String((bk.hour + 1) % 24).padStart(2, '0')}:00:00`;

  // Find stores ready to receive their summary right now. Use a join
  // through store_settings so we only fetch the rows we'll act on.
  let storeQuery = supabase
    .from('store_settings')
    .select('store_id, chat_bot_daily_summary_send_time, stores!inner(id, store_name, active)')
    .eq('chat_bot_daily_summary_enabled', true)
    .eq('stores.active', true)
    .gte('chat_bot_daily_summary_send_time', hourStart);
  // Wrapping past midnight (HH=23 → HH+1=24/00): the SQL range degenerates,
  // so just check >= hourStart in that case.
  if (hourEnd !== '00:00:00') {
    storeQuery = storeQuery.lt('chat_bot_daily_summary_send_time', hourEnd);
  }

  const { data: rows, error: storesErr } = await storeQuery;
  if (storesErr) {
    console.error('[Daily Summary] store query failed', storesErr);
    return NextResponse.json({ error: storesErr.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ status: 'no stores in this hour', hour: bk.hour });
  }

  // Flatten: PostgREST returns the joined `stores` as a single object on
  // !inner joins, but the Supabase type system can't always tell — narrow
  // it explicitly here. The cast bypasses stale generated types that
  // don't yet know about chat_bot_daily_summary_send_time.
  type Joined = {
    store_id: string;
    stores: { id: string; store_name: string } | { id: string; store_name: string }[] | null;
  };
  const stores: Array<{ id: string; store_name: string }> = (rows as unknown as Joined[])
    .map((r) => (Array.isArray(r.stores) ? r.stores[0] : r.stores))
    .filter((s): s is { id: string; store_name: string } => !!s && !!s.id);

  const results: Array<{ store: string; sent: boolean }> = [];

  for (const store of stores) {
    try {
      // Settings already filtered by the query, but re-load here so we
      // can grab timeouts/priorities consistently with other call sites.
      const botSettings = await getChatBotSettings(store.id);
      if (!botSettings.chat_bot_daily_summary_enabled) {
        results.push({ store: store.store_name, sent: false });
        continue;
      }

      // Per-store "business day just ended" window. With send_time set
      // to occur after close, currentShiftWindow returns the most-
      // recently-completed shift.
      const hours = await fetchStoreHours(supabase, store.id);
      const window = currentShiftWindow(hours);

      // Defensive: a DB trigger already rejects send_time inside open
      // hours, but if anything bypasses it (manual SQL edit, trigger
      // disabled mid-deploy, etc.) the cron must still refuse rather
      // than summarise a shift that isn't over yet.
      if (window.endUTC.getTime() > Date.now()) {
        console.warn(
          `[Daily Summary] Skipping ${store.store_name}: current shift hasn't ended (ends ${window.endUTC.toISOString()})`,
        );
        results.push({ store: store.store_name, sent: false });
        continue;
      }

      const startUTC = window.startUTC.toISOString();
      const endUTC = window.endUTC.toISOString();
      const [bizY, bizM, bizD] = window.businessDate.split('-').map(Number);
      const dateLabel = new Date(Date.UTC(bizY, bizM - 1, bizD)).toLocaleDateString(
        'th-TH',
        { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
      );

      // Fetch all stats in parallel
      const [depositsResult, withdrawalsResult, comparisonsResult, borrowsResult] =
        await Promise.all([
          // Deposits created during this store's business day
          supabase
            .from('deposits')
            .select('id, status', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .gte('created_at', startUTC)
            .lte('created_at', endUTC),

          // Withdrawals completed during this store's business day
          supabase
            .from('withdrawals')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .eq('status', 'completed')
            .gte('created_at', startUTC)
            .lte('created_at', endUTC),

          // Stock comparisons pending explanation
          supabase
            .from('comparisons')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .eq('status', 'pending'),

          // Active borrow requests (pending or approved)
          supabase
            .from('borrows')
            .select('id', { count: 'exact', head: true })
            .or(`from_store_id.eq.${store.id},to_store_id.eq.${store.id}`)
            .in('status', ['pending_approval', 'approved']),
        ]);

      const newDeposits = depositsResult.count ?? 0;
      const completedWithdrawals = withdrawalsResult.count ?? 0;
      const pendingExplanations = comparisonsResult.count ?? 0;
      const activeBorrows = borrowsResult.count ?? 0;

      // Also get currently active deposits
      const { count: activeDepositsCount } = await supabase
        .from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('status', 'in_store');

      const activeDeposits = activeDepositsCount ?? 0;

      // Get expiring soon (within 3 days from now)
      const nowUTC = new Date().toISOString();
      const in3DaysUTC = new Date(Date.now() + 3 * 86400000).toISOString();

      const { count: expiringSoonCount } = await supabase
        .from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('status', 'in_store')
        .gt('expiry_date', nowUTC)
        .lte('expiry_date', in3DaysUTC);

      const expiringSoon = expiringSoonCount ?? 0;

      // Skip if nothing to report
      if (
        newDeposits === 0 &&
        completedWithdrawals === 0 &&
        pendingExplanations === 0 &&
        activeBorrows === 0 &&
        activeDeposits === 0
      ) {
        results.push({ store: store.store_name, sent: false });
        continue;
      }

      // Build summary card with structured metadata
      const summaryData = {
        type: 'daily_summary' as const,
        date_label: dateLabel,
        new_deposits: newDeposits,
        withdrawals_today: completedWithdrawals,
        active_deposits: activeDeposits,
        expiring_soon: expiringSoon,
        expiring_days: 3,
        pending_explanations: pendingExplanations,
        active_borrows: activeBorrows,
      };

      await sendBotMessage({
        storeId: store.id,
        type: 'system',
        content: `📊 สรุปประจำวัน — ${dateLabel}`,
        metadata: summaryData,
      });

      results.push({ store: store.store_name, sent: true });
    } catch (err) {
      console.error(`[Daily Summary] Error for store ${store.store_name}:`, err);
      results.push({ store: store.store_name, sent: false });
    }
  }

  return NextResponse.json({ success: true, results });
}
