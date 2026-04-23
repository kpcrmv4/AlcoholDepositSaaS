'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TenantRow {
  id: string;
  slug: string;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  plan: string;
  status: string;
  max_branches: number;
  max_users: number;
  line_mode: string;
  line_channel_id: string | null;
  line_channel_secret: string | null;
  line_channel_token: string | null;
  liff_id: string | null;
  line_basic_id: string | null;
  line_owner_group_id: string | null;
  brand_color: string | null;
  logo_url: string | null;
}

export default function TenantEditForm({ tenant }: { tenant: TenantRow }) {
  const router = useRouter();
  const [tab, setTab] = useState<'plan' | 'line' | 'branding' | 'danger'>('plan');
  const [saving, setSaving] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function savePatch(payload: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return false;
    }
    setMsg('✅ Saved');
    router.refresh();
    return true;
  }

  async function verifyLine() {
    setVerifyResult('…');
    const res = await fetch(`/api/platform/tenants/${tenant.id}/verify-line`, {
      method: 'POST',
    });
    const body = await res.json();
    if (body.ok) {
      setVerifyResult(`✅ ${body.info.displayName} (${body.info.basicId ?? body.info.userId})`);
    } else {
      setVerifyResult(`❌ ${body.error || 'verify failed'}`);
    }
  }

  async function suspend() {
    const reason = prompt('Reason for suspension? (optional)') ?? '';
    const res = await fetch(`/api/platform/tenants/${tenant.id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) router.refresh();
  }

  async function resume() {
    const res = await fetch(`/api/platform/tenants/${tenant.id}/resume`, { method: 'POST' });
    if (res.ok) router.refresh();
  }

  return (
    <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {([
          ['plan', 'Plan & limits'],
          ['line', 'LINE OA'],
          ['branding', 'Branding'],
          ['danger', 'Danger zone'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm ${
              tab === k ? 'border-b-2 border-gray-900 font-semibold' : 'text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {msg && <div className="mb-4 text-sm">{msg}</div>}

        {tab === 'plan' && (
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await savePatch({
                plan: fd.get('plan'),
                max_branches: Number(fd.get('max_branches')),
                max_users: Number(fd.get('max_users')),
              });
            }}
          >
            <Select label="Plan" name="plan" defaultValue={tenant.plan} options={[
              ['trial', 'Trial'], ['starter', 'Starter'], ['growth', 'Growth'],
              ['enterprise', 'Enterprise'], ['custom', 'Custom'],
            ]} />
            <Field label="Max branches" name="max_branches" type="number" defaultValue={tenant.max_branches} />
            <Field label="Max users" name="max_users" type="number" defaultValue={tenant.max_users} />
            <div className="col-span-2 flex justify-end">
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save plan'}
              </button>
            </div>
          </form>
        )}

        {tab === 'line' && (
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await savePatch({
                line_mode: fd.get('line_mode'),
                line_channel_id: fd.get('line_channel_id') || null,
                line_channel_secret: fd.get('line_channel_secret') || null,
                line_channel_token: fd.get('line_channel_token') || null,
                line_basic_id: fd.get('line_basic_id') || null,
                liff_id: fd.get('liff_id') || null,
                line_owner_group_id: fd.get('line_owner_group_id') || null,
              });
            }}
          >
            <Select label="Mode" name="line_mode" defaultValue={tenant.line_mode} options={[
              ['per_store', 'Per store'],
              ['tenant', 'Tenant (single OA)'],
            ]} />
            <Field label="Basic ID (e.g. @company)" name="line_basic_id" defaultValue={tenant.line_basic_id ?? ''} />
            <Field label="Channel ID" name="line_channel_id" defaultValue={tenant.line_channel_id ?? ''} />
            <Field label="LIFF ID" name="liff_id" defaultValue={tenant.liff_id ?? ''} />
            <Field label="Channel secret" name="line_channel_secret" type="password" defaultValue={tenant.line_channel_secret ?? ''} />
            <Field label="Channel access token" name="line_channel_token" type="password" defaultValue={tenant.line_channel_token ?? ''} />
            <Field label="Owner group ID" name="line_owner_group_id" defaultValue={tenant.line_owner_group_id ?? ''} />
            <div className="col-span-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500">
              <div><strong>Webhook URL:</strong> paste this into LINE Developer Console</div>
              <code className="mt-1 block font-mono">
                {process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.example.com'}/api/line/webhook
              </code>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={verifyLine}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:bg-gray-950"
              >
                🔍 Verify saved token
              </button>
              <span className="text-xs">{verifyResult}</span>
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save LINE'}
              </button>
            </div>
          </form>
        )}

        {tab === 'branding' && (
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await savePatch({
                brand_color: fd.get('brand_color'),
                logo_url: fd.get('logo_url'),
              });
            }}
          >
            <Field label="Brand color" name="brand_color" type="color" defaultValue={tenant.brand_color ?? '#0ea5e9'} />
            <Field label="Logo URL" name="logo_url" defaultValue={tenant.logo_url ?? ''} />
            <div className="col-span-2 flex justify-end">
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save branding'}
              </button>
            </div>
          </form>
        )}

        {tab === 'danger' && (
          <div className="space-y-3 text-sm">
            {tenant.status === 'suspended' ? (
              <button
                onClick={resume}
                className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                Resume tenant
              </button>
            ) : (
              <button
                onClick={suspend}
                className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                Suspend tenant
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Suspending a tenant blocks all user sessions and redirects to /suspended.
              Data is preserved and can be resumed at any time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">{label}</span>
      <input {...rest} className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm" />
    </label>
  );
}

function Select({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue?: string; options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
