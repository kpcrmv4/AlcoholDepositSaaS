import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant/server';
import { invalidateTenantLiffIdCache } from '@/lib/line/customer-entry-url';

/**
 * GET /api/tenant/line
 * Return the tenant's LINE config with secrets REDACTED (just presence flags).
 */
export async function GET() {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (!g.ctx.isTenantAdmin && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('tenants')
    .select('line_mode, line_channel_id, line_basic_id, liff_id, line_owner_group_id, line_channel_secret, line_channel_token')
    .eq('id', g.ctx.tenant.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    line_mode: data.line_mode,
    line_channel_id: data.line_channel_id,
    line_basic_id: data.line_basic_id,
    liff_id: data.liff_id,
    line_owner_group_id: data.line_owner_group_id,
    has_channel_secret: !!data.line_channel_secret,
    has_channel_token: !!data.line_channel_token,
  });
}

/**
 * PATCH /api/tenant/line
 * Update LINE config. Owner only. Empty strings clear the value.
 */
export async function PATCH(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = new Set([
    'line_mode', 'line_channel_id', 'line_channel_secret', 'line_channel_token',
    'line_basic_id', 'liff_id', 'line_owner_group_id',
  ]);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) update[k] = v === '' ? null : v;
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('tenants')
    .update(update)
    .eq('id', g.ctx.tenant.id)
    .select('line_mode, line_channel_id, line_basic_id, liff_id, line_owner_group_id, line_channel_secret, line_channel_token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  invalidateTenantLiffIdCache(g.ctx.tenant.id);

  // Whenever the channel token changes, derive the bot's user ID + basic ID
  // from /v2/bot/info and persist them. The webhook resolver matches incoming
  // events by `line_bot_user_id` (LINE's webhook destination is the bot's
  // user ID, NOT the numeric Channel ID), so without this step a freshly
  // saved token routes nowhere.
  if (typeof update.line_channel_token === 'string' && update.line_channel_token) {
    try {
      const infoRes = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${update.line_channel_token}` },
      });
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { userId?: string; basicId?: string };
        const patch: Record<string, unknown> = {};
        if (info.userId) patch.line_bot_user_id = info.userId;
        if (info.basicId && !data.line_basic_id) patch.line_basic_id = info.basicId;
        if (Object.keys(patch).length > 0) {
          await svc.from('tenants').update(patch).eq('id', g.ctx.tenant.id);
        }
      }
    } catch {
      // Don't fail the save just because /v2/bot/info is down — caller can
      // hit Verify later to populate.
    }
  }

  return NextResponse.json({
    line_mode: data.line_mode,
    line_channel_id: data.line_channel_id,
    line_basic_id: data.line_basic_id,
    liff_id: data.liff_id,
    line_owner_group_id: data.line_owner_group_id,
    has_channel_secret: !!data.line_channel_secret,
    has_channel_token: !!data.line_channel_token,
  });
}
