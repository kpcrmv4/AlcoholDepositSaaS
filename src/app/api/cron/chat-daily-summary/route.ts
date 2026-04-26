/**
 * GET /api/cron/chat-daily-summary
 *
 * Cron job: ส่งสรุปประจำวันเข้าห้องแชทสาขา
 * รวม: ฝากเหล้า, เบิกเหล้า, สต๊อก, ยืมสินค้า
 *
 * Schedule: see vercel.json. The window of "yesterday's business day" is
 * derived per-store from each store's configured hours so a bar that
 * closes at 03:00 doesn't have its 02:30 deposits dropped from the count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendBotMessage } from '@/lib/chat/bot';
import { getChatBotSettings } from '@/lib/chat/bot-settings';
import { fetchStoreHours, currentShiftWindow } from '@/lib/store/hours';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all active stores
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('active', true);

  if (!stores || stores.length === 0) {
    return NextResponse.json({ status: 'no stores' });
  }

  const results: Array<{ store: string; sent: boolean }> = [];

  for (const store of stores) {
    try {
      // Check if daily summary is enabled for this store
      const botSettings = await getChatBotSettings(store.id);
      if (!botSettings.chat_bot_daily_summary_enabled) {
        results.push({ store: store.store_name, sent: false });
        continue;
      }

      // Per-store "business day just ended" window. The cron is expected
      // to fire shortly after the store closes; `currentShiftWindow` gives
      // us the most-recently-completed shift (its endUTC is in the past
      // by the time we arrive here).
      const hours = await fetchStoreHours(supabase, store.id);
      const window = currentShiftWindow(hours);
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
