'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  username: string;
  role: string;
  active: boolean;
  display_name: string | null;
  created_at: string;
}
interface InvRow {
  id: string;
  email: string;
  role: string;
  store_ids: string[] | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}
interface StoreRow {
  id: string;
  store_code: string;
  store_name: string;
}

const ROLES = [
  ['owner', 'Owner'],
  ['manager', 'Manager'],
  ['accountant', 'Accountant'],
  ['hq', 'HQ'],
  ['bar', 'Bar'],
  ['staff', 'Staff'],
];

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
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
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
    setInviting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    const b = await res.json();
    setInviteUrl(b.accept_url);
    setMsg('✅ สร้างลิงก์เชิญแล้ว — คัดลอกส่งให้พนักงาน');
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm('ยกเลิกคำเชิญนี้?')) return;
    await fetch(`/api/tenant/invitations/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-2xl font-semibold">
          {activeCount} <span className="text-gray-400">/ {tenantMaxUsers}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">ผู้ใช้ที่เปิดใช้งาน</div>
      </div>

      {/* Invite form */}
      <form
        onSubmit={invite}
        className="space-y-3 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="text-sm font-semibold">เชิญพนักงานใหม่</div>
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
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {stores.length > 0 && (
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
        )}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs">{msg}</div>
          <button
            type="submit"
            disabled={inviting}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? 'กำลังสร้าง…' : 'สร้างลิงก์เชิญ'}
          </button>
        </div>
        {inviteUrl && (
          <div className="break-all rounded bg-indigo-50 p-2 text-xs font-mono text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            {inviteUrl}
          </div>
        )}
      </form>

      {/* Pending invitations */}
      {invitations.filter((i) => !i.accepted_at).length > 0 && (
        <div className="rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-800">
            คำเชิญที่รอ
          </div>
          <table className="w-full text-sm">
            <tbody>
              {invitations.filter((i) => !i.accepted_at).map((i) => (
                <tr key={i.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{i.email}</td>
                  <td className="px-4 py-2 text-xs">{i.role}</td>
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

      {/* Users list */}
      <div className="rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-800">
          ผู้ใช้ในบริษัท ({users.length})
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs dark:border-gray-800 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-2 font-medium">Username</th>
              <th className="px-4 py-2 font-medium">ชื่อแสดง</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 font-medium">สร้างเมื่อ</th>
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
                    {u.role}
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
                  {new Date(u.created_at).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
