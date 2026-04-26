'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantLink } from '@/lib/tenant/link';
import { createClient } from '@/lib/supabase/client';

interface UserRow {
  id: string;
  username: string;
  role: string;
  active: boolean | null;
  display_name: string | null;
  created_at: string | null;
}
interface InvRow {
  id: string;
  email: string;
  role: string;
  store_ids: string[] | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string | null;
}
interface StoreRow {
  id: string;
  store_code: string;
  store_name: string;
}

const ROLES: ReadonlyArray<readonly [string, string]> = [
  ['owner', 'Owner'],
  ['manager', 'Manager'],
  ['accountant', 'Accountant'],
  ['hq', 'HQ'],
  ['bar', 'Bar'],
  ['staff', 'Staff'],
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES);

type Method = 'invite' | 'direct';

export default function UsersManager({
  tenantMaxUsers,
  users,
  invitations,
  stores,
}: {
  tenantMaxUsers: number;
  users: UserRow[];
  invitations: InvRow[];
  stores: StoreRow[];
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('invite');

  // Shared status messages
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setInviteUrl(null);
    const fd = new FormData(e.currentTarget);
    const storeIds = fd.getAll('store_ids') as string[];

    const res = await fetch('/api/tenant/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        role: fd.get('role'),
        store_ids: storeIds,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    const b = await res.json();
    setInviteUrl(b.accept_url);
    setMsg('✅ สร้างลิงก์เชิญแล้ว — คัดลอกส่งให้พนักงาน');
    (e.currentTarget as HTMLFormElement).reset();
    router.refresh();
  }

  async function createDirect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setInviteUrl(null);
    const fd = new FormData(e.currentTarget);
    const storeIds = fd.getAll('store_ids') as string[];

    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password'),
        role: fd.get('role'),
        displayName: fd.get('display_name') || null,
        storeIds,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    setMsg('✅ สร้างผู้ใช้แล้ว — แจ้ง username/รหัสผ่านให้พนักงาน');
    (e.currentTarget as HTMLFormElement).reset();
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm('ยกเลิกคำเชิญนี้?')) return;
    await fetch(`/api/tenant/invitations/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    if (
      !confirm(
        currentActive
          ? 'ปิดการใช้งานผู้ใช้นี้? — เขาจะ login ไม่ได้จนกว่าจะเปิดใหม่'
          : 'เปิดการใช้งานผู้ใช้นี้?',
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ active: !currentActive })
      .eq('id', userId);
    if (error) {
      setMsg(`❌ ${error.message}`);
      return;
    }
    router.refresh();
  }

  const activeCount = users.filter((u) => u.active).length;
  const pendingInvitations = invitations.filter((i) => !i.accepted_at);

  return (
    <div className="space-y-6">
      {/* Usage card */}
      <div className="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-2xl font-semibold">
          {activeCount} <span className="text-gray-400">/ {tenantMaxUsers}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">ผู้ใช้ที่เปิดใช้งาน</div>
      </div>

      {/* Method picker + active form */}
      <div className="rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <MethodTab
            active={method === 'invite'}
            onClick={() => {
              setMethod('invite');
              setMsg(null);
              setInviteUrl(null);
            }}
          >
            เชิญผ่าน Email
          </MethodTab>
          <MethodTab
            active={method === 'direct'}
            onClick={() => {
              setMethod('direct');
              setMsg(null);
              setInviteUrl(null);
            }}
          >
            สร้างผู้ใช้โดยตรง
          </MethodTab>
        </div>

        {method === 'invite' ? (
          <form onSubmit={invite} className="space-y-3 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              สร้างลิงก์เชิญให้พนักงานเปิดเองและตั้งรหัสผ่าน — เหมาะกับพนักงานที่มี email
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                name="email"
                type="email"
                placeholder="email@example.com"
                required
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <select
                name="role"
                defaultValue="staff"
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {ROLES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <StorePicker stores={stores} />
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs">{msg}</div>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'กำลังสร้าง…' : 'สร้างลิงก์เชิญ'}
              </button>
            </div>
            {inviteUrl && (
              <div className="break-all rounded bg-indigo-50 p-2 text-xs font-mono text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {inviteUrl}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={createDirect} className="space-y-3 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              สร้าง username/รหัสผ่านให้พนักงานเอง — เหมาะกับพนักงานที่ไม่มี email
              (เช่น พนักงานบาร์, ครัว) — username ใช้ login (ตัวเล็ก/ตัวเลข/._- 3-32 ตัว)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                name="username"
                placeholder="username"
                required
                pattern="[a-z0-9._-]{3,32}"
                title="ตัวเล็ก/ตัวเลข/._- ความยาว 3-32 ตัว"
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                name="password"
                type="password"
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                required
                minLength={6}
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                name="display_name"
                placeholder="ชื่อแสดง (optional)"
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <select
                name="role"
                defaultValue="staff"
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {ROLES.filter(([v]) => v !== 'owner').map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <StorePicker stores={stores} />
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs">{msg}</div>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'กำลังสร้าง…' : 'สร้างผู้ใช้'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-800">
            คำเชิญที่รอ
          </div>
          <table className="w-full text-sm">
            <tbody>
              {pendingInvitations.map((i) => (
                <tr key={i.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{i.email}</td>
                  <td className="px-4 py-2 text-xs">{ROLE_LABEL[i.role] ?? i.role}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    หมดอายุ {new Date(i.expires_at).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => revoke(i.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      ยกเลิก
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users list with row actions */}
      <div className="rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-800">
          ผู้ใช้ในบริษัท ({users.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs dark:border-gray-800 dark:bg-gray-950">
              <tr>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">ชื่อแสดง</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 font-medium">สร้างเมื่อ</th>
                <th className="px-4 py-2 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {u.display_name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.active ? (
                      <span className="text-emerald-700 dark:text-emerald-400">active</span>
                    ) : (
                      <span className="text-gray-400">inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      {u.role !== 'owner' && (
                        <TenantLink
                          href={`/users/${u.id}/permissions`}
                          className="text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          สิทธิ์
                        </TenantLink>
                      )}
                      <button
                        onClick={() => toggleActive(u.id, u.active ?? false)}
                        className={
                          u.active
                            ? 'text-rose-600 hover:underline'
                            : 'text-emerald-600 hover:underline'
                        }
                      >
                        {u.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex-1 px-4 py-2.5 text-sm font-medium transition-colors ' +
        (active
          ? 'border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')
      }
    >
      {children}
    </button>
  );
}

function StorePicker({ stores }: { stores: StoreRow[] }) {
  if (stores.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        สาขาที่เข้าถึงได้ (เลือกได้หลายสาขา)
      </div>
      <div className="flex flex-wrap gap-2">
        {stores.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
          >
            <input type="checkbox" name="store_ids" value={s.id} />
            {s.store_name}
          </label>
        ))}
      </div>
    </div>
  );
}
