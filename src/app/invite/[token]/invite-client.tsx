'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Invitation {
  email: string;
  role: string;
  expired: boolean;
  accepted: boolean;
  tenant_name: string;
  tenant_slug: string | null;
  brand_color: string;
  logo_url: string | null;
}

interface SessionInfo {
  email: string | null;
  matches: boolean;
}

export default function InviteClient({
  token,
  invitation,
  session,
}: {
  token: string;
  invitation: Invitation;
  session: SessionInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  const brandBadge = invitation.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={invitation.logo_url} alt="" className="mx-auto h-16 w-16 rounded" />
  ) : (
    <div
      className="mx-auto flex h-16 w-16 items-center justify-center rounded text-2xl font-bold text-white"
      style={{ background: invitation.brand_color }}
    >
      {invitation.tenant_name.charAt(0)}
    </div>
  );

  const header = (
    <div className="space-y-1.5 text-center">
      {brandBadge}
      <h1 className="text-xl font-semibold">คุณได้รับคำเชิญ</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        เข้าร่วม <strong>{invitation.tenant_name}</strong> ในตำแหน่ง{' '}
        <code>{invitation.role}</code>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        สำหรับอีเมล <code>{invitation.email}</code>
      </p>
    </div>
  );

  if (invitation.expired) {
    return (
      <div className="space-y-3 text-center">
        <div className="text-4xl">⌛</div>
        <h1 className="text-lg font-semibold">คำเชิญหมดอายุแล้ว</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          กรุณาติดต่อผู้ที่เชิญคุณเพื่อสร้างลิงก์ใหม่
        </p>
      </div>
    );
  }

  if (invitation.accepted) {
    return (
      <div className="space-y-3 text-center">
        <div className="text-4xl">✅</div>
        <h1 className="text-lg font-semibold">คำเชิญนี้ใช้ไปแล้ว</h1>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ไปที่หน้าแรก
        </Link>
      </div>
    );
  }

  // ── Case A: already signed in with the matching email — one-click accept ──
  if (session.email && session.matches) {
    async function accept() {
      setBusy(true);
      setError(null);
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' });
      setBusy(false);
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || res.statusText);
        return;
      }
      const b = await res.json();
      if (b.tenant_slug) router.push(`/t/${b.tenant_slug}`);
      else router.push('/');
    }

    return (
      <div className="space-y-5">
        {header}
        {error && (
          <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </div>
        )}
        <button
          onClick={accept}
          disabled={busy}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'กำลังยืนยัน…' : 'ยืนยันการเข้าร่วม'}
        </button>
      </div>
    );
  }

  // ── Case B: signed in with the wrong email ──
  if (session.email && !session.matches) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          คุณ login อยู่ด้วยอีเมล <code>{session.email}</code> แต่คำเชิญนี้ส่งถึง{' '}
          <code>{invitation.email}</code>. กรุณาออกจากระบบแล้ว login
          ด้วยอีเมลที่ถูกเชิญ.
        </div>
        <Link
          href={`/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
          className="block w-full rounded bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          ไปหน้า login
        </Link>
      </div>
    );
  }

  // ── Case C: not signed in — signup (default) or login ──
  async function signup() {
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันไม่ตรงกัน');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invite/${token}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, displayName }),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 409 && b.code === 'EMAIL_EXISTS') {
      setError(b.error || 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณา login');
      setMode('login');
      return;
    }
    if (!res.ok) {
      setError(b.error || res.statusText);
      return;
    }

    if (b.needs_login) {
      router.push(
        `/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`,
      );
      return;
    }
    if (b.tenant_slug) router.push(`/t/${b.tenant_slug}`);
    else router.push('/');
  }

  return (
    <div className="space-y-5">
      {header}

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </div>
      )}

      {mode === 'signup' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signup();
          }}
          className="space-y-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              ชื่อที่แสดง (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ชื่อเล่นของคุณ"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              ตั้งรหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              autoComplete="new-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชีและเข้าร่วม'}
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            มีบัญชีอยู่แล้ว?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              login เพื่อยืนยัน
            </button>
          </p>
        </form>
      ) : (
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            กด login ด้วยอีเมล <code>{invitation.email}</code>{' '}
            ก่อนแล้วระบบจะพากลับมาหน้านี้เพื่อยืนยันคำเชิญ.
          </p>
          <Link
            href={`/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
            className="block w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            ไปหน้า login
          </Link>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className="text-xs text-gray-500 hover:underline dark:text-gray-400"
          >
            ← ย้อนกลับไปสร้างบัญชีใหม่
          </button>
        </div>
      )}
    </div>
  );
}
