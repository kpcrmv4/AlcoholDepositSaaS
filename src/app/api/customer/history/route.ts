import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/auth/customer-token';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET  /api/customer/history?token=xxx
 * POST /api/customer/history   { accessToken: string }
 *
 * Returns the customer's deposits (all statuses) and withdrawals
 * (all statuses), sorted by created_at desc. Used by the customer
 * history page which has no Supabase session.
 */

const DEPOSIT_SELECT =
  'id, deposit_code, product_name, quantity, status, created_at, store:stores(store_name)';
const WITHDRAWAL_SELECT =
  'id, product_name, requested_qty, status, created_at, store:stores(store_name)';

async function loadHistory(lineUserId: string) {
  const supabase = createServiceClient();

  const [depositsRes, withdrawalsRes] = await Promise.all([
    supabase
      .from('deposits')
      .select(DEPOSIT_SELECT)
      .eq('line_user_id', lineUserId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('withdrawals')
      .select(WITHDRAWAL_SELECT)
      .eq('line_user_id', lineUserId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return {
    deposits: depositsRes.data || [],
    withdrawals: withdrawalsRes.data || [],
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const lineUserId = verifyCustomerToken(token);
  if (!lineUserId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  return NextResponse.json(await loadHistory(lineUserId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accessToken } = body as { accessToken?: string };

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 });
  }

  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!verifyRes.ok) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
  }

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 401 });
  }

  const profile = (await profileRes.json()) as { userId: string };
  return NextResponse.json(await loadHistory(profile.userId));
}
