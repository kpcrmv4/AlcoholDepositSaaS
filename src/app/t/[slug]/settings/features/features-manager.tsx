'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store { id: string; store_code: string; store_name: string }
interface Feature { store_id: string; feature_key: string; enabled: boolean }
interface FeatureDef { key: string; label: string }

export default function FeaturesManager({
  stores,
  features,
  featureKeys,
}: {
  stores: Store[];
  features: Feature[];
  featureKeys: FeatureDef[];
}) {
  const router = useRouter();
  const initialMap = useMemo(() => {
    const m = new Map<string, boolean>();
    features.forEach((f) => m.set(`${f.store_id}:${f.feature_key}`, f.enabled));
    return m;
  }, [features]);

  const [dirty, setDirty] = useState<Map<string, Map<string, boolean>>>(new Map());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(storeId: string, key: string) {
    const mapKey = `${storeId}:${key}`;
    const current = dirty.get(storeId)?.get(key);
    const effectiveCurrent = current !== undefined ? current : (initialMap.get(mapKey) ?? true);
    const next = !effectiveCurrent;
    const copy = new Map(dirty);
    const storeMap = new Map(copy.get(storeId) ?? []);
    storeMap.set(key, next);
    copy.set(storeId, storeMap);
    setDirty(copy);
  }

  function currentValue(storeId: string, key: string): boolean {
    const d = dirty.get(storeId)?.get(key);
    if (d !== undefined) return d;
    const v = initialMap.get(`${storeId}:${key}`);
    return v === undefined ? true : v;
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      for (const [storeId, changes] of dirty.entries()) {
        const featuresPayload: Record<string, boolean> = {};
        for (const [k, v] of changes.entries()) featuresPayload[k] = v;
        const res = await fetch(`/api/tenant/features/${storeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: featuresPayload }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || res.statusText);
        }
      }
      setDirty(new Map());
      setMsg('✅ บันทึกแล้ว');
      router.refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'error'}`);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = dirty.size > 0;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left font-medium dark:bg-gray-950">ฟังก์ชั่น</th>
              {stores.map((s) => (
                <th key={s.id} className="px-3 py-2 text-center text-xs font-medium">
                  {s.store_code}
                  <div className="text-[10px] font-normal text-gray-500">{s.store_name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureKeys.map((f) => (
              <tr key={f.key} className="border-b border-gray-100 dark:border-gray-800">
                <td className="sticky left-0 bg-white px-4 py-2 font-medium dark:bg-gray-900">
                  {f.label}
                  <div className="font-mono text-[10px] text-gray-400">{f.key}</div>
                </td>
                {stores.map((s) => (
                  <td key={s.id} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={currentValue(s.id, f.key)}
                      onChange={() => toggle(s.id, f.key)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
            {stores.length === 0 && (
              <tr>
                <td colSpan={1} className="px-4 py-8 text-center text-sm text-gray-500">
                  ยังไม่มีสาขาใน tenant นี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs">{msg}</div>
        <button
          onClick={save}
          disabled={!hasChanges || saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}
