import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/auth/customer-token';
import { createServiceClient } from '@/lib/supabase/server';
import { notifyStoreStaff } from '@/lib/notifications/service';
import { sendBotMessage } from '@/lib/chat/bot';

/**
 * POST /api/customer/deposit-request/cancel
 *
 * ลูกค้ายกเลิกคำขอฝากเหล้าที่ยังไม่ได้รับการอนุมัติ.
 * เก็บ `cancelled` status ไว้ใน DB (ไม่ลบ) เพื่อให้ Staff เห็นประวัติ.
 *
 * Body: { requestId, token? | accessToken? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { requestId, token, accessToken } = body as {
    requestId?: string;
    token?: string;
    accessToken?: string;
  };

  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  }

  // -----------------------------------------------------------------------
  // Verify identity
  // -----------------------------------------------------------------------
  let lineUserId: string | null = null;

  if (token) {
    lineUserId = verifyCustomerToken(token);
  } else if (accessToken) {
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { userId: string };
      lineUserId = profile.userId;
    }
  }

  if (!lineUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // -----------------------------------------------------------------------
  // Fetch request — must belong to this LINE user and still be pending.
  // -----------------------------------------------------------------------
  const { data: req } = await supabase
    .from('deposit_requests')
    .select('id, store_id, line_user_id, status, customer_name, table_number')
    .eq('id', requestId)
    .maybeSingle();

  if (!req) {
    return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 });
  }
  if (req.line_user_id !== lineUserId) {
    // Don't reveal whether the record exists for someone else.
    return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 });
  }
  if (req.status !== 'pending') {
    return NextResponse.json(
      { error: 'คำขอนี้ถูกดำเนินการแล้ว ไม่สามารถยกเลิกได้' },
      { status: 409 },
    );
  }

  // -----------------------------------------------------------------------
  // Mark as cancelled.
  // -----------------------------------------------------------------------
  const { error: updateError } = await supabase
    .from('deposit_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);

  if (updateError) {
    console.error('[DepositRequest Cancel] update error:', updateError);
    return NextResponse.json(
      { error: 'ไม่สามารถยกเลิกได้ กรุณาลองใหม่' },
      { status: 500 },
    );
  }

  // -----------------------------------------------------------------------
  // Audit trail.
  // -----------------------------------------------------------------------
  await supabase.from('audit_logs').insert({
    store_id: req.store_id,
    action_type: 'CUSTOMER_DEPOSIT_REQUEST_CANCELLED',
    table_name: 'deposit_requests',
    record_id: requestId,
    new_value: {
      cancelled_by_customer: true,
      line_user_id: lineUserId,
    },
    changed_by: null,
  });

  // -----------------------------------------------------------------------
  // Notify staff so the live /deposit/requests page reflects the change
  // without a manual refresh, and the chat room shows a system message.
  // -----------------------------------------------------------------------
  const customerLabel = req.customer_name || 'ลูกค้า';
  const tableLabel = req.table_number ? ` (โต๊ะ ${req.table_number})` : '';

  try {
    await notifyStoreStaff({
      storeId: req.store_id,
      type: 'new_deposit',
      title: 'ลูกค้ายกเลิกคำขอฝาก',
      body: `${customerLabel}${tableLabel} ยกเลิกคำขอฝากเหล้า`,
      data: { requestId, cancelled: true },
      roles: ['owner', 'manager', 'staff', 'bar'],
    });
  } catch (err) {
    console.error('[DepositRequest Cancel] push notification failed:', err);
  }

  try {
    await sendBotMessage({
      storeId: req.store_id,
      type: 'system',
      content: `❌ ${customerLabel}${tableLabel} ยกเลิกคำขอฝากเหล้า`,
      metadata: { request_id: requestId, cancelled: true },
    });
  } catch (err) {
    console.error('[DepositRequest Cancel] chat system message failed:', err);
  }

  // -----------------------------------------------------------------------
  // Mark the original deposit_request action card in chat as cancelled so
  // the row drops out of the "รอรับ" filter on the task board. We update
  // chat_messages.metadata.status directly via service role since this
  // route is server-side and not authenticated as a staff session.
  // -----------------------------------------------------------------------
  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('store_id', req.store_id)
      .eq('type', 'store')
      .eq('is_active', true)
      .maybeSingle();

    if (room) {
      const { data: cards } = await supabase
        .from('chat_messages')
        .select('id, metadata')
        .eq('room_id', room.id)
        .eq('type', 'action_card')
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      const target = (cards || []).find((c) => {
        const meta = c.metadata as Record<string, unknown> | null;
        return (
          meta?.action_type === 'deposit_request' &&
          meta?.reference_id === requestId &&
          meta?.status !== 'completed' &&
          meta?.status !== 'rejected' &&
          meta?.status !== 'cancelled'
        );
      });

      if (target) {
        const oldMeta = target.metadata as Record<string, unknown>;
        await supabase
          .from('chat_messages')
          .update({ metadata: { ...oldMeta, status: 'cancelled' } })
          .eq('id', target.id);
      }
    }
  } catch (err) {
    console.error('[DepositRequest Cancel] sync action card failed:', err);
  }

  return NextResponse.json({ success: true });
}
