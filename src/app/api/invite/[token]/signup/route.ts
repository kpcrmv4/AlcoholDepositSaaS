import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invite/{token}/signup
 * Body: { password: string, displayName?: string }
 *
 * One-shot invite acceptance for a brand-new user:
 *   1. Look up the invitation (must be unused, not expired)
 *   2. Create (or find) the auth user for invitation.email with the given
 *      password — email is auto-confirmed because the invite link itself
 *      proves the address is reachable
 *   3. Upsert profile with tenant_id + role from the invitation
 *   4. Assign to invited stores (if any)
 *   5. Mark invitation accepted
 *   6. Sign the caller in with the new credentials so the following redirect
 *      lands in the tenant dashboard
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  let body: { password?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const password = (body.password ?? '').toString();
  const displayName = (body.displayName ?? '').toString().trim() || null;

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  const { data: inv, error: invErr } = await svc
    .from('tenant_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json(
      { error: 'คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว' },
      { status: 404 },
    );
  }

  const email = inv.email.toLowerCase();

  // 1. Create auth user (email auto-confirmed). If the email already exists
  // we short-circuit and ask the caller to log in instead.
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      invitation_token: token,
      tenant_id: inv.tenant_id,
      role: inv.role,
    },
  });

  if (createErr || !created?.user) {
    // Supabase returns 422 when email already exists
    const msg = createErr?.message || '';
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      return NextResponse.json(
        {
          error: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณา login ก่อนยืนยันคำเชิญ',
          code: 'EMAIL_EXISTS',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg || 'สร้างบัญชีไม่สำเร็จ' }, { status: 400 });
  }

  const userId = created.user.id;

  // 2. Profile — handle_new_user may already have created it from metadata.
  const { data: existing } = await svc
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    await svc.from('profiles').insert({
      id: userId,
      tenant_id: inv.tenant_id,
      username: email,
      role: inv.role,
      display_name: displayName,
      active: true,
    });
  } else {
    await svc
      .from('profiles')
      .update({
        tenant_id: inv.tenant_id,
        role: inv.role,
        active: true,
        ...(displayName ? { display_name: displayName } : {}),
      })
      .eq('id', userId);
  }

  // 3. Store assignments
  if (inv.store_ids && inv.store_ids.length > 0) {
    const rows = inv.store_ids.map((storeId: string) => ({
      user_id: userId,
      store_id: storeId,
    }));
    await svc.from('user_stores').upsert(rows, { onConflict: 'user_id,store_id' });
  }

  // 4. Mark invitation used
  await svc
    .from('tenant_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', inv.id);

  // 5. Sign the caller in so the redirect into /t/{slug} sees a valid session
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    // User is set up — they can still log in manually
    return NextResponse.json({
      ok: true,
      needs_login: true,
      email,
    });
  }

  const { data: tenant } = await svc
    .from('tenants')
    .select('slug')
    .eq('id', inv.tenant_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    tenant_slug: tenant?.slug ?? null,
    role: inv.role,
  });
}
