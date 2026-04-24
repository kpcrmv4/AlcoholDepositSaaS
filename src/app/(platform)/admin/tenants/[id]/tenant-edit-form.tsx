'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('platformAdmin');
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
    setMsg(t('tenantDetail.planSaved'));
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
    const reason = prompt(t('tenantDetail.suspendReasonPrompt')) ?? '';
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

  // Legacy plans that may still exist in DB — show alongside trial/pro so admins
  // can still read/reassign the current value, but funnel new selections into pro.
  const LEGACY_PLANS = ['starter', 'growth', 'enterprise', 'custom'];
  const needsLegacyOption = LEGACY_PLANS.includes(tenant.plan);

  return (
    <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {([
          ['plan', t('tenantDetail.tabPlan')],
          ['line', t('tenantDetail.tabLine')],
          ['branding', t('tenantDetail.tabBranding')],
          ['danger', t('tenantDetail.tabDanger')],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm ${
              tab === k
                ? 'border-b-2 border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('newTenant.plan')}</span>
              <select
                name="plan"
                defaultValue={tenant.plan}
                className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
              >
                <option value="trial">{t('plans.trial')}</option>
                <option value="pro">{t('plans.pro')}</option>
                {needsLegacyOption && (
                  <option value={tenant.plan}>
                    {t(`plans.${tenant.plan}` as 'plans.starter')}
                  </option>
                )}
              </select>
            </label>
            <Field label={t('newTenant.maxBranches')} name="max_branches" type="number" defaultValue={tenant.max_branches} />
            <Field label={t('newTenant.maxUsers')} name="max_users" type="number" defaultValue={tenant.max_users} />
            <div className="col-span-2 flex justify-end">
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? t('tenantDetail.planSaving') : t('tenantDetail.planSave')}
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('tenantDetail.lineMode')}</span>
              <select
                name="line_mode"
                defaultValue={tenant.line_mode}
                className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
              >
                <option value="per_store">{t('lineMode.per_store')}</option>
                <option value="tenant">{t('lineMode.tenant')}</option>
              </select>
            </label>
            <Field label={t('tenantDetail.lineBasicId')} name="line_basic_id" defaultValue={tenant.line_basic_id ?? ''} />
            <Field label={t('tenantDetail.lineChannelId')} name="line_channel_id" defaultValue={tenant.line_channel_id ?? ''} />
            <Field label={t('tenantDetail.liffId')} name="liff_id" defaultValue={tenant.liff_id ?? ''} />
            <Field label={t('tenantDetail.lineSecret')} name="line_channel_secret" type="password" defaultValue={tenant.line_channel_secret ?? ''} />
            <Field label={t('tenantDetail.lineToken')} name="line_channel_token" type="password" defaultValue={tenant.line_channel_token ?? ''} />
            <Field label={t('tenantDetail.lineOwnerGroup')} name="line_owner_group_id" defaultValue={tenant.line_owner_group_id ?? ''} />
            <div className="col-span-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-xs text-gray-600 dark:text-gray-400">
              <div><strong>{t('tenantDetail.lineWebhookLabel')}</strong> {t('tenantDetail.lineWebhookHint')}</div>
              <code className="mt-1 block font-mono">
                {process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.example.com'}/api/line/webhook
              </code>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={verifyLine}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('tenantDetail.lineVerify')}
              </button>
              <span className="text-xs">{verifyResult}</span>
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? t('tenantDetail.planSaving') : t('tenantDetail.lineSave')}
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
            <Field label={t('tenantDetail.brandColor')} name="brand_color" type="color" defaultValue={tenant.brand_color ?? '#0ea5e9'} />
            <Field label={t('tenantDetail.logoUrl')} name="logo_url" defaultValue={tenant.logo_url ?? ''} />
            <div className="col-span-2 flex justify-end">
              <button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? t('tenantDetail.planSaving') : t('tenantDetail.brandingSave')}
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
                {t('tenantDetail.resumeButton')}
              </button>
            ) : (
              <button
                onClick={suspend}
                className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
              >
                {t('tenantDetail.suspendButton')}
              </button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('tenantDetail.dangerDescription')}
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
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input {...rest} className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm" />
    </label>
  );
}
