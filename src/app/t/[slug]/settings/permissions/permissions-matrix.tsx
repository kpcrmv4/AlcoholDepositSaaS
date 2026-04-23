'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row { role: string; permission_key: string; enabled: boolean }
interface PermDef { key: string; group: string }

export default function PermissionsMatrix({
  roles,
  permissionDefs,
  initial,
}: {
  roles: string[];
  permissionDefs: PermDef[];
  initial: Row[];
}) {
  const router = useRouter();
  const initialMap = useMemo(() => {
    const m = new Map<string, boolean>();
    initial.forEach((r) => m.set(`${r.role}:${r.permission_key}`, r.enabled));
    return m;
  }, [initial]);

  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function effective(role: string, key: string): boolean {
    if (role === 'owner') return true; // Owner always has all — not toggleable
    const k = `${role}:${key}`;
    if (overrides.has(k)) return overrides.get(k)!;
    return initialMap.get(k) ?? false;
  }

  function toggle(role: string, key: string) {
    if (role === 'owner') return;
    const k = `${role}:${key}`;
    const next = !effective(role, key);
    const copy = new Map(overrides);
    copy.set(k, next);
    setOverrides(copy);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const changes = Array.from(overrides.entries()).map(([k, v]) => {
      const [role, permission_key] = k.split(':');
      return { role, permission_key, enabled: v };
    });
    const res = await fetch('/api/tenant/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    setMsg('✅ บันทึกแล้ว');
    setOverrides(new Map());
    router.refresh();
  }

  // Group permissions by "group" label
  const byGroup = useMemo(() => {
    const g = new Map<string, PermDef[]>();
    permissionDefs.forEach((p) => {
      if (!g.has(p.group)) g.set(p.group, []);
      g.get(p.group)!.push(p);
    });
    return Array.from(g.entries());
  }, [permissionDefs]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left font-medium dark:bg-gray-950">Permission</th>
              {roles.map((r) => (
                <th key={r} className="px-3 py-2 text-center text-xs font-medium capitalize">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byGroup.map(([group, items]) => (
              <>
                <tr key={`${group}-h`} className="bg-gray-50 dark:bg-gray-950">
                  <td colSpan={roles.length + 1} className="px-4 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {group}
                  </td>
                </tr>
                {items.map((p) => (
                  <tr key={p.key} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="sticky left-0 bg-white px-4 py-2 font-mono text-xs dark:bg-gray-900">
                      {p.key}
                    </td>
                    {roles.map((r) => (
                      <td key={r} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={effective(r, p.key)}
                          onChange={() => toggle(r, p.key)}
                          disabled={r === 'owner'}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs">{msg}</div>
        <button
          onClick={save}
          disabled={overrides.size === 0 || saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก…' : `บันทึก ${overrides.size ? `(${overrides.size})` : ''}`}
        </button>
      </div>
    </div>
  );
}
