import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/tenant/server';

export async function GET() {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (!g.ctx.isTenantAdmin && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from('tenant_invitations')
    .select('id, email, role, store_ids, accepted_at, expires_at, created_at')
    .eq('tenant_id', g.ctx.tenant.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const g = await requireTenantContext();
  if (!g.ok) return g.response;
  if (g.ctx.userRole !== 'owner' && !g.ctx.isPlatformAdmin) {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? 'staff');
  const storeIds = Array.isArray(body.store_ids) ? (body.store_ids as string[]) : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  if (!['owner', 'accountant', 'manager', 'bar', 'staff', 'hq'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const svc = createServiceClient();

  const { data, error } = await svc
    .from('tenant_invitations')
    .insert({
      tenant_id: g.ctx.tenant.id,
      email,
      role,
      store_ids: storeIds,
      token,
      invited_by: g.ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${token}`;
  return NextResponse.json({ invitation: data, accept_url: acceptUrl }, { status: 201 });
}
