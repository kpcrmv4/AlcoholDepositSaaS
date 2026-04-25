import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant/server';

/**
 * POST /api/tenant/line/verify
 * Verify the tenant's saved (or body-provided) LINE channel token by
 * calling /v2/bot/info. Owner only.
 */
export async function POST(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let providedToken: string | null = null;
  try {
    const body = await request.json();
    providedToken = body?.token ? String(body.token) : null;
  } catch { /* ignore */ }

  let token = providedToken;
  if (!token) {
    const svc = createServiceClient();
    const { data } = await svc
      .from('tenants')
      .select('line_channel_token')
      .eq('id', g.ctx.tenant.id)
      .maybeSingle();
    token = (data?.line_channel_token as string | null) ?? null;
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'No LINE token configured' }, { status: 400 });
  }

  const res = await fetch('https://api.line.me/v2/bot/info', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    return NextResponse.json({ ok: false, status: res.status, error: errorBody });
  }

  const info = (await res.json()) as { userId?: string; basicId?: string };

  // Persist bot user ID (and basic ID if not already set) so the webhook
  // resolver has something to match LINE's webhook `destination` against.
  if (info.userId) {
    const svc = createServiceClient();
    const patch: Record<string, unknown> = { line_bot_user_id: info.userId };
    if (info.basicId) {
      const { data: cur } = await svc
        .from('tenants')
        .select('line_basic_id')
        .eq('id', g.ctx.tenant.id)
        .maybeSingle();
      if (!cur?.line_basic_id) patch.line_basic_id = info.basicId;
    }
    await svc.from('tenants').update(patch).eq('id', g.ctx.tenant.id);
  }

  return NextResponse.json({ ok: true, info });
}
