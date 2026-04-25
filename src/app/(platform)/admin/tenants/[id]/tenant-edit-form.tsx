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
  owner_user_id: string | null;
}

interface ResetResult {
  email: string;
  temp_password: string;
}

interface ModuleEntry {
  key: string;
  label: string;
  group: string;
}

const MODULE_CATALOG: ModuleEntry[] = [
  { key: 'overview',                 label: 'Overview',                  group: 'หลัก' },
  { key: 'chat',                     label: 'Chat',                      group: 'หลัก' },
  { key: 'stock',                    label: 'Stock / Count / OCR',       group: 'คลังสินค้า' },
  { key: 'deposit',                  label: 'Deposit / Withdrawal',      group: 'คลังสินค้า' },
  { key: 'transfer',                 label: 'Transfer between branches', group: 'คลังสินค้า' },
  { key: 'borrow',                   label: 'Borrow between branches',   group: 'คลังสินค้า' },
  { key: 'hq-warehouse',             label: 'HQ Warehouse',              group: 'คลังสินค้า' },
  { key: 'commission',               label: 'Commission / AE',           group: 'คลังสินค้า' },
  { key: 'reports',                  label: 'Reports',                   group: 'รายงาน' },
  { key: 'activity',                 label: 'Activity log',              group: 'รายงาน' },
  { key: 'performance-staff',        label: 'Performance — staff',       group: 'วิเคราะห์' },
  { key: 'performance-stores',       label: 'Performance — stores',      group: 'วิเคราะห์' },
  { key: 'performance-operations',   label: 'Performance — operations',  group: 'วิเคราะห์' },
  { key: 'performance-customers',    label: 'Performance — customers',   group: 'วิเคราะห์' },
  { key: 'guide',                    label: 'Guide',                     group: 'ช่วยเหลือ' },
  { key: 'announcements',            label: 'Announcements',             group: 'ระบบ' },
  { key: 'users',                    label: 'Users',                     group: 'ระบบ' },
  { key: 'settings',                 label: 'Settings (in-app)',         group: 'ระบบ' },
];

export default function TenantEditForm({
  tenant,
  modulesEnabled,
}: {
  tenant: TenantRow;
  modulesEnabled: Record<string, boolean>;
}) {
  const router = useRouter();
  const t = useTranslations('platformAdmin');
  const [tab, setTab] = useState<'plan' | 'line' | 'branding' | 'modules' | 'danger'>('plan');
  const [saving, setSaving] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [resetCopied, setResetCopied] = useState<string | null>(null);
  const [moduleState, setModuleState] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    for (const m of MODULE_CATALOG) seed[m.key] = modulesEnabled[m.key] ?? false;
    return seed;
  });

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

  async function resetOwnerPassword() {
    if (!confirm(t('tenantDetail.resetPasswordConfirm'))) return;
    const res = await fetch(`/api/platform/tenants/${tenant.id}/reset-owner-password`, {
      method: 'POST',
    });
    const body = await res.json();
    if (!res.ok) {
      setMsg(`❌ ${body.error || res.statusText}`);
      return;
    }
    setResetResult({ email: body.email, temp_password: body.temp_password });
  }

  async function copyToClipboard(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setResetCopied(key);
    setTimeout(() => setResetCopied(null), 1500);
  }

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function hardDeleteTenant() {
    if (deleteConfirmText.trim() !== tenant.company_name) return;
    setDeleting(true);
    setMsg(null);
    const res = await fetch(`/api/platform/tenants/${tenant.id}/hard-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: deleteConfirmText.trim() }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      setDeleting(false);
      return;
    }
    router.push('/admin/tenants');
  }

  async function saveModules() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/platform/tenants/${tenant.id}/modules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: moduleState }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setMsg(`❌ ${b.error || res.statusText}`);
      return;
    }
    setMsg(t('tenantDetail.modulesUpdated'));
    router.refresh();
  }

  const moduleGroups = MODULE_CATALOG.reduce<Record<string, ModuleEntry[]>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  // Legacy plans that may still exist in DB — show alongside trial/pro so admins
  // can still read/reassign the current value, but funnel new selections into pro.
  const LEGACY_PLANS = ['starter', 'growth', 'enterprise', 'custom'];
  const needsLegacyOption = LEGACY_PLANS.includes(tenant.plan);

  return (
    <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {([
          ['plan', t('tenantDetail.tabPlan')],
          ['line', t('tenantDetail.tabLine')],
          ['branding', t('tenantDetail.tabBranding')],
          ['modules', t('tenantDetail.tabModules')],
          ['danger', t('tenantDetail.tabDanger')],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm ${
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

        {tab === 'modules' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('tenantDetail.modulesIntro')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  for (const m of MODULE_CATALOG) all[m.key] = true;
                  setModuleState(all);
                }}
                className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('tenantDetail.modulesEnableAll')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const none: Record<string, boolean> = {};
                  for (const m of MODULE_CATALOG) none[m.key] = false;
                  setModuleState(none);
                }}
                className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('tenantDetail.modulesDisableAll')}
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(moduleGroups).map(([groupName, mods]) => (
                <div key={groupName}>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {groupName}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {mods.map((m) => (
                      <label
                        key={m.key}
                        className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900"
                      >
                        <input
                          type="checkbox"
                          checked={moduleState[m.key] ?? false}
                          onChange={(e) =>
                            setModuleState((prev) => ({ ...prev, [m.key]: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="flex-1">{m.label}</span>
                        <code className="text-[10px] text-gray-400">{m.key}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveModules}
                disabled={saving}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? t('tenantDetail.modulesSaving') : t('tenantDetail.modulesSave')}
              </button>
            </div>
          </div>
        )}

        {tab === 'danger' && (
          <div className="space-y-6 text-sm">
            <div className="space-y-2">
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

            <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              {tenant.owner_user_id ? (
                <>
                  <button
                    onClick={resetOwnerPassword}
                    className="rounded bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                  >
                    🔑 {t('tenantDetail.resetPasswordButton')}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('tenantDetail.resetPasswordHint')}
                  </p>
                </>
              ) : (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  ⚠️ {t('tenantDetail.noOwnerWarning')}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-rose-100 pt-4 dark:border-rose-950/50">
              <div className="rounded border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
                <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  ⚠️ {t('tenantDetail.hardDeleteHeading')}
                </div>
                <p className="mt-1 text-xs text-rose-800 dark:text-rose-300">
                  {t('tenantDetail.hardDeleteHint')}
                </p>
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-rose-900 dark:text-rose-200">
                    {t('tenantDetail.hardDeleteConfirmLabel', { company: tenant.company_name })}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={tenant.company_name}
                    className="w-full rounded border border-rose-300 bg-white px-3 py-2 text-sm dark:border-rose-700 dark:bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={hardDeleteTenant}
                    disabled={deleting || deleteConfirmText.trim() !== tenant.company_name}
                    className="rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? t('tenantDetail.hardDeleteSubmitting') : `🗑️ ${t('tenantDetail.hardDeleteButton')}`}
                  </button>
                </div>
              </div>
            </div>

            {resetResult && (
              <div className="space-y-3 rounded border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  ✅ {t('credentials.resetTitle')}
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">{t('credentials.email')}</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 select-all rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                      {resetResult.email}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('email', resetResult.email)}
                      className="rounded border border-gray-300 px-3 py-2 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      {resetCopied === 'email' ? t('credentials.copied') : t('credentials.copy')}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">{t('credentials.tempPassword')}</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 select-all rounded border border-gray-200 bg-white px-3 py-2 font-mono text-sm tracking-wider dark:border-gray-700 dark:bg-gray-900">
                      {resetResult.temp_password}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('password', resetResult.temp_password)}
                      className="rounded border border-gray-300 px-3 py-2 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      {resetCopied === 'password' ? t('credentials.copied') : t('credentials.copy')}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('credentials.warnBody')}
                </p>
              </div>
            )}
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
