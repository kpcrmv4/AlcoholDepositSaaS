import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/platform/tenants/{id}/verify-line
 * Verify the tenant's LINE Channel token by calling /v2/bot/info.
 * Optionally accepts a {token} in the body to test a token before saving;
 * otherwise reads tenants.line_channel_token.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let providedToken: string | null = null;
  try {
    const body = await request.json();
    providedToken = body?.token ? String(body.token) : null;
  } catch { /* no body ok */ }

  const supabase = createServiceClient();
  let token = providedToken;

  if (!token) {
    const { data } = await supabase
      .from('tenants')
      .select('line_channel_token')
      .eq('id', id)
      .maybeSingle();
    token = (data?.line_channel_token as string | null) ?? null;
  }

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'No LINE channel token configured' },
      { status: 400 },
    );
  }

  const response = await fetch('https://api.line.me/v2/bot/info', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    return NextResponse.json(
      { ok: false, status: response.status, error: errorBody },
      { status: 200 },
    );
  }

  const info = (await response.json()) as {
    userId: string;
    basicId: string;
    displayName: string;
    pictureUrl?: string;
    premiumId?: string;
    chatMode?: string;
    markAsReadMode?: string;
  };

  return NextResponse.json({ ok: true, info });
}
