'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LineConfig {
  line_mode: string;
  line_channel_id: string;
  line_basic_id: string;
  liff_id: string;
  line_owner_group_id: string;
  has_channel_secret: boolean;
  has_channel_token: boolean;
}

export default function LineForm({ initial }: { initial: LineConfig }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      line_mode: fd.get('line_mode'),
      line_channel_id: fd.get('line_channel_id'),
      line_basic_id: fd.get('line_basic_id'),
      liff_id: fd.get('liff_id'),
      line_owner_group_id: fd.get('line_owner_group_id'),
    };
    const secret = String(fd.get('line_channel_secret') || '');
    const token = String(fd.get('line_channel_token') || '');
    if (secret) payload.line_channel_secret = secret;
    if (token) payload.line_channel_token = token;

    const res = await fetch('/api/tenant/line', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    setMsg('✅ บันทึกแล้ว');
    router.refresh();
  }

  async function verify() {
    setVerifying(true);
    setVerifyMsg('…');
    const res = await fetch('/api/tenant/line/verify', { method: 'POST' });
    setVerifying(false);
    const b = await res.json();
    if (b.ok) {
      setVerifyMsg(`✅ ${b.info.displayName} (${b.info.basicId ?? b.info.userId})`);
    } else {
      setVerifyMsg(`❌ ${b.error || 'verify failed'}`);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
    >
      {msg && <div className="text-sm">{msg}</div>}

      <Select
        label="โหมดการใช้งาน LINE"
        name="line_mode"
        defaultValue={initial.line_mode}
        options={[
          ['per_store', 'แยกต่อสาขา (แต่ละสาขามี OA ของตัวเอง)'],
          ['tenant', 'ใช้ OA เดียวทั้งบริษัท'],
        ]}
        help="‘แยกต่อสาขา’ = เติม LINE config ที่หน้า settings ของแต่ละสาขา. ‘OA เดียว’ = ใช้ค่าในหน้านี้กับทุกสาขา"
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Basic ID (เช่น @company)" name="line_basic_id" defaultValue={initial.line_basic_id} />
        <Field label="Channel ID" name="line_channel_id" defaultValue={initial.line_channel_id} />
        <Field label="LIFF ID" name="liff_id" defaultValue={initial.liff_id} />
        <Field label="Owner group ID" name="line_owner_group_id" defaultValue={initial.line_owner_group_id} />
        <Field
          label={`Channel secret ${initial.has_channel_secret ? '(ตั้งไว้แล้ว — ปล่อยว่างถ้าไม่แก้)' : ''}`}
          name="line_channel_secret"
          type="password"
          placeholder={initial.has_channel_secret ? '•••••••' : ''}
        />
        <Field
          label={`Channel access token ${initial.has_channel_token ? '(ตั้งไว้แล้ว — ปล่อยว่างถ้าไม่แก้)' : ''}`}
          name="line_channel_token"
          type="password"
          placeholder={initial.has_channel_token ? '•••••••' : ''}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={verify}
            disabled={verifying || !initial.has_channel_token}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            🔍 ทดสอบการเชื่อมต่อ
          </button>
          {verifyMsg && <span className="text-xs">{verifyMsg}</span>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        {...rest}
        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
    </label>
  );
}

function Select({
  label, name, defaultValue, options, help,
}: {
  label: string; name: string; defaultValue?: string;
  options: Array<[string, string]>; help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {help && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p>}
    </label>
  );
}
