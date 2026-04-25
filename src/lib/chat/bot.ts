/**
 * Chat Bot Helper
 *
 * ส่ง Action Card / Bot message เข้าห้องแชทสาขา
 * เรียกใช้จาก server-side (API routes, server actions)
 *
 * Implementation note: this used to do an internal HTTP fetch to
 * /api/chat/bot-message, which silently failed in production whenever the
 * NEXT_PUBLIC_APP_URL env var wasn't set or the server-to-self call timed
 * out. We now insert + broadcast in-process via the service-role client so
 * there is no network roundtrip and no env-var coupling.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getChatBotSettings, isBotTypeEnabled, getTimeoutForType, getPriorityForType } from '@/lib/chat/bot-settings';
import { broadcastToChannel, broadcastToMany } from '@/lib/supabase/broadcast';
import { sendPushToUser, type PushPayload } from '@/lib/notifications/push';
import type {
  ActionCardMetadata,
  ChatMessage,
  UnreadBadgePayload,
} from '@/types/chat';

interface SendBotMessageParams {
  storeId: string;
  type: 'text' | 'action_card' | 'system';
  content: string;
  metadata?: ActionCardMetadata | Record<string, unknown> | null;
}

/**
 * Insert a bot message into the store's chat room and fan out broadcasts +
 * push notifications. Runs entirely in-process via the service-role client.
 *
 * Returns false (and logs the reason) on any failure — callers treat this
 * as fire-and-forget so a missing chat room or LINE config never blocks the
 * user-facing flow that triggered the notification.
 */
export async function sendBotMessage(params: SendBotMessageParams): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('[Chat Bot] missing Supabase env vars; cannot send bot message');
      return false;
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Find the store's chat room.
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .eq('store_id', params.storeId)
      .eq('type', 'store')
      .eq('is_active', true)
      .maybeSingle();

    if (!room) {
      console.warn('[Chat Bot] no active store chat room for store', params.storeId);
      return false;
    }

    // 2. Honour bot-type toggles for action cards (timeout + priority overrides).
    let metadata = params.metadata ? { ...params.metadata } : null;
    if (params.type === 'action_card' && metadata) {
      const actionType = (metadata as ActionCardMetadata).action_type;
      if (actionType) {
        const settings = await getChatBotSettings(params.storeId);
        if (!isBotTypeEnabled(settings, actionType)) {
          return true; // disabled per store setting — silently skip
        }
        (metadata as ActionCardMetadata).timeout_minutes = getTimeoutForType(settings, actionType);
        (metadata as ActionCardMetadata).priority = getPriorityForType(settings, actionType);
      }
    }

    // 3. Insert via SECURITY DEFINER RPC (same path the API route uses).
    const { data: messageId, error: insertErr } = await supabase.rpc('insert_bot_message', {
      p_room_id: room.id,
      p_type: params.type,
      p_content: params.content,
      p_metadata: metadata,
    });
    if (insertErr || !messageId) {
      console.error('[Chat Bot] insert_bot_message failed:', insertErr);
      return false;
    }

    // 4. Build payload for downstream broadcasts.
    const message: ChatMessage = {
      id: messageId as string,
      room_id: room.id,
      sender_id: null,
      type: params.type,
      content: params.content,
      metadata: metadata,
      created_at: new Date().toISOString(),
      archived_at: null,
      sender: null,
    };

    // 5. Realtime broadcast — room channel + per-member badge.
    try {
      await broadcastToChannel(supabase, `chat:room:${room.id}`, 'new_message', {
        type: 'new_message',
        message,
      } as unknown as Record<string, unknown>);

      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('room_id', room.id);

      if (members && members.length > 0) {
        const badgePayload: UnreadBadgePayload = {
          room_id: room.id,
          sender_id: 'bot',
          sender_name: 'Bot',
          preview: params.content?.slice(0, 100) || 'Action Card ใหม่',
          type: params.type,
        };
        await broadcastToMany(
          supabase,
          members.map((m) => ({
            channel: `chat:badge:${m.user_id}`,
            event: 'new_message_badge',
            payload: badgePayload as unknown as Record<string, unknown>,
          })),
        );

        // Fire-and-forget push notifications to each member.
        const pushPayload: PushPayload = {
          title: room.name || 'แชท',
          body: `Bot: ${params.content?.slice(0, 100) || 'มีรายการใหม่'}`,
          url: `/chat/${room.id}`,
          data: {
            type: 'chat_message',
            room_id: room.id,
            sender_id: 'bot',
            url: `/chat/${room.id}`,
          },
        };
        Promise.allSettled(
          members.map((m) => sendPushToUser(m.user_id, pushPayload)),
        ).catch((err) => console.error('[Chat Bot] push fan-out failed:', err));
      }
    } catch (broadcastErr) {
      // The message is already persisted — broadcast failure shouldn't fail
      // the whole operation.
      console.error('[Chat Bot] broadcast/push failed:', broadcastErr);
    }

    // 6. Update pinned summary for action cards (best-effort).
    if (params.type === 'action_card') {
      try {
        await updateRoomPinnedSummary(supabase, room.id);
      } catch (err) {
        console.error('[Chat Bot] update pinned summary failed:', err);
      }
    }

    return true;
  } catch (error) {
    console.error('[Chat Bot] sendBotMessage failed:', error);
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateRoomPinnedSummary(supabase: any, roomId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: cards } = await supabase
    .from('chat_messages')
    .select('metadata')
    .eq('room_id', roomId)
    .eq('type', 'action_card')
    .is('archived_at', null)
    .gte('created_at', today.toISOString());

  if (!cards) return;

  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  for (const card of cards as { metadata: Record<string, unknown> | null }[]) {
    const status = card.metadata?.status as string | undefined;
    if (status === 'pending' || status === 'pending_bar') pending++;
    else if (status === 'claimed') inProgress++;
    else if (status === 'completed') completed++;
  }

  await supabase
    .from('chat_rooms')
    .update({
      pinned_summary: {
        pending_count: pending,
        in_progress_count: inProgress,
        completed_today: completed,
        updated_at: new Date().toISOString(),
      },
    })
    .eq('id', roomId);
}

// ==========================================
// Pre-built Action Card builders
// ==========================================

/**
 * สร้าง Action Card สำหรับรายการฝากใหม่
 */
export function buildDepositActionCard(deposit: {
  id: string;
  deposit_code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  table_number?: string | null;
  notes?: string | null;
}): SendBotMessageParams & { storeId: string } {
  const meta: ActionCardMetadata = {
    action_type: 'deposit_claim',
    reference_id: deposit.deposit_code,
    reference_table: 'deposits',
    status: 'pending',
    claimed_by: null,
    claimed_by_name: null,
    claimed_at: null,
    completed_at: null,
    timeout_minutes: 15,
    priority: 'normal',
    summary: {
      customer: deposit.customer_name,
      items: `${deposit.product_name} x${deposit.quantity}`,
      note: deposit.table_number
        ? `โต๊ะ ${deposit.table_number}`
        : deposit.notes || undefined,
    },
  };

  return {
    storeId: '', // caller must set
    type: 'action_card',
    content: `รายการฝากใหม่ ${deposit.deposit_code} — ${deposit.customer_name}`,
    metadata: meta,
  };
}

/**
 * สร้าง Action Card สำหรับคำขอเบิก
 */
export function buildWithdrawalActionCard(withdrawal: {
  id: string;
  deposit_code: string;
  customer_name: string;
  product_name: string;
  requested_qty: number;
  table_number?: string | null;
  notes?: string | null;
}): Omit<SendBotMessageParams, 'storeId'> {
  const meta: ActionCardMetadata = {
    action_type: 'withdrawal_claim',
    reference_id: withdrawal.deposit_code,
    reference_table: 'withdrawals',
    status: 'pending',
    claimed_by: null,
    claimed_by_name: null,
    claimed_at: null,
    completed_at: null,
    timeout_minutes: 15,
    priority: 'normal',
    summary: {
      customer: withdrawal.customer_name,
      items: `${withdrawal.product_name} x${withdrawal.requested_qty}`,
      note: withdrawal.table_number
        ? `โต๊ะ ${withdrawal.table_number}`
        : withdrawal.notes || undefined,
    },
  };

  return {
    type: 'action_card',
    content: `คำขอเบิกเหล้า ${withdrawal.deposit_code} — ${withdrawal.customer_name}`,
    metadata: meta,
  };
}

/**
 * สร้าง Action Card สำหรับสต๊อกไม่ตรง
 */
export function buildStockExplainActionCard(comparison: {
  comp_date: string;
  store_id: string;
  discrepancy_count: number;
  items_preview: string;
}): Omit<SendBotMessageParams, 'storeId'> {
  const meta: ActionCardMetadata = {
    action_type: 'stock_explain',
    reference_id: comparison.comp_date,
    reference_table: 'comparisons',
    status: 'pending',
    claimed_by: null,
    claimed_by_name: null,
    claimed_at: null,
    completed_at: null,
    timeout_minutes: 60, // สต๊อกให้เวลามากกว่า
    priority: 'normal',
    summary: {
      items: `${comparison.discrepancy_count} รายการไม่ตรง`,
      note: comparison.items_preview,
    },
  };

  return {
    type: 'action_card',
    content: `สต๊อกไม่ตรง ${comparison.discrepancy_count} รายการ — วันที่ ${comparison.comp_date}`,
    metadata: meta,
  };
}

/**
 * สร้าง Action Card สำหรับคำขอยืมสินค้า
 *
 * `reference_id` = borrow.id (UUID) → ใช้สำหรับเรียก API
 * `summary.code` = borrow_code (BRW-...) → ใช้สำหรับแสดงผลใน UI
 */
export function buildBorrowActionCard(borrow: {
  id: string;
  borrow_code?: string | null;
  from_store_name: string;
  items_preview: string;
  notes?: string | null;
}): Omit<SendBotMessageParams, 'storeId'> {
  const meta: ActionCardMetadata = {
    action_type: 'borrow_approve',
    reference_id: borrow.id,
    reference_table: 'borrows',
    status: 'pending',
    claimed_by: null,
    claimed_by_name: null,
    claimed_at: null,
    completed_at: null,
    timeout_minutes: 30,
    priority: 'normal',
    summary: {
      customer: borrow.from_store_name,
      items: borrow.items_preview,
      note: borrow.notes || undefined,
      code: borrow.borrow_code || undefined,
    },
  };

  const codeSuffix = borrow.borrow_code ? ` ${borrow.borrow_code}` : '';
  return {
    type: 'action_card',
    content: `คำขอยืมสินค้า${codeSuffix} จาก ${borrow.from_store_name}`,
    metadata: meta,
  };
}
