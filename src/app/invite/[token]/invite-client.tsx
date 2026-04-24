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

export default function InviteClient({
  token,
  invitation,
}: {
  token: string;
  invitation: Invitation;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function accept() {
    setAccepting(true);
    setError(null);
    const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' });
    setAccepting(false);
    if (res.status === 401) {
      router.push(`/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`);
      return;
    }
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || res.statusText);
      return;
    }
    const b = await res.json();
    if (b.tenant_slug) {
      router.push(`/t/${b.tenant_slug}`);
    } else {
      router.push('/');
    }
  }

  return (
    <div className="space-y-4 text-center">
      {invitation.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invitation.logo_url} alt="" className="mx-auto h-16 w-16 rounded" />
      ) : (
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded text-2xl font-bold text-white"
          style={{ background: invitation.brand_color }}
        >
          {invitation.tenant_name.charAt(0)}
        </div>
      )}
      <div>
        <h1 className="text-xl font-semibold">คุณได้รับคำเชิญ</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          เข้าร่วม <strong>{invitation.tenant_name}</strong> ในตำแหน่ง <code>{invitation.role}</code>
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          สำหรับอีเมล <code>{invitation.email}</code>
        </p>
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </div>
      )}

      <button
        onClick={accept}
        disabled={accepting}
        className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {accepting ? 'กำลังยืนยัน…' : 'ยืนยันการเข้าร่วม'}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-500">
        ต้อง login ด้วยอีเมล <strong>{invitation.email}</strong> ก่อนจึงจะยืนยันได้
      </p>
    </div>
  );
}
