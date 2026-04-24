'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TRIAL_DAYS = 7;

interface CreatedResult {
  tenant: { id: string; slug: string; company_name: string };
  owner_credentials: {
    email: string;
    temp_password: string;
    user_id: string;
  };
}

export default function NewTenantPage() {
  const router = useRouter();
  const t = useTranslations('platformAdmin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<'trial' | 'pro'>('trial');
  const [created, setCreated] = useState<CreatedResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const selectedPlan = (fd.get('plan') as 'trial' | 'pro') || 'trial';

    const payload = {
      slug: String(fd.get('slug') || '').toLowerCase(),
      company_name: fd.get('company_name'),
      contact_email: fd.get('contact_email'),
      contact_phone: fd.get('contact_phone'),
      legal_name: fd.get('legal_name'),
      tax_id: fd.get('tax_id'),
      plan: selectedPlan,
      max_branches: Number(fd.get('max_branches') || 1),
      max_users: Number(fd.get('max_users') || 10),
      line_mode: fd.get('line_mode') || 'per_store',
      status: selectedPlan === 'trial' ? 'trial' : 'active',
      trial_ends_at:
        selectedPlan === 'trial'
          ? new Date(Date.now() + TRIAL_DAYS * 86400_000).toISOString()
          : null,
    };

    const res = await fetch('/api/platform/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `HTTP ${res.status}`);
      setSubmitting(false);
      return;
    }

    const body = (await res.json()) as CreatedResult;
    setCreated(body);
    setSubmitting(false);
  }

  if (created) {
    return (
      <CreatedCredentials
        result={created}
        onContinue={() => router.push(`/admin/tenants/${created.tenant.id}`)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('newTenant.title')}</h1>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('newTenant.companyHeading')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${t('newTenant.companyName')} *`} name="company_name" required />
            <Field label={`${t('newTenant.slug')} *`} name="slug" required placeholder={t('newTenant.slugPlaceholder')} />
            <Field label={`${t('newTenant.contactEmail')} *`} name="contact_email" required type="email" />
            <Field label={t('newTenant.contactPhone')} name="contact_phone" />
            <Field label={t('newTenant.legalName')} name="legal_name" />
            <Field label={t('newTenant.taxId')} name="tax_id" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('newTenant.planHeading')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('newTenant.plan')}</span>
              <select
                name="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value as 'trial' | 'pro')}
                className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
              >
                <option value="trial">{t('plans.trial')}</option>
                <option value="pro">{t('plans.pro')}</option>
              </select>
            </label>
            <Field label={t('newTenant.maxBranches')} name="max_branches" type="number" defaultValue="1" />
            <Field label={t('newTenant.maxUsers')} name="max_users" type="number" defaultValue="10" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('newTenant.trialDaysHint')}
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('newTenant.lineHeading')}</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('newTenant.lineMode')}</span>
            <select
              name="line_mode"
              defaultValue="per_store"
              className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
            >
              <option value="per_store">{t('lineMode.per_store')}</option>
              <option value="tenant">{t('lineMode.tenant')}</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('newTenant.lineHint')}
          </p>
        </section>

        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {t('newTenant.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? t('newTenant.submitting') : t('newTenant.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreatedCredentials({
  result,
  onContinue,
}: {
  result: CreatedResult;
  onContinue: () => void;
}) {
  const t = useTranslations('platformAdmin');
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const combined = `${t('credentials.loginUrl')}: ${typeof window !== 'undefined' ? window.location.origin : ''}/login
${t('credentials.email')}: ${result.owner_credentials.email}
${t('credentials.tempPassword')}: ${result.owner_credentials.temp_password}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        ✅ {t('credentials.successMsg', { company: result.tenant.company_name })}
      </div>

      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-semibold">⚠️ {t('credentials.warnTitle')}</p>
        <p className="mt-1 text-xs">{t('credentials.warnBody')}</p>
      </div>

      <section className="space-y-3 rounded border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">{t('credentials.heading')}</h2>

        <CredRow
          label={t('credentials.email')}
          value={result.owner_credentials.email}
          copied={copied === 'email'}
          onCopy={() => copy('email', result.owner_credentials.email)}
        />

        <CredRow
          label={t('credentials.tempPassword')}
          value={result.owner_credentials.temp_password}
          copied={copied === 'password'}
          onCopy={() => copy('password', result.owner_credentials.temp_password)}
          mono
        />

        <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('credentials.copyAllHint')}
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 dark:text-gray-200">{combined}</pre>
          <button
            type="button"
            onClick={() => copy('all', combined)}
            className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            {copied === 'all' ? t('credentials.copied') : t('credentials.copyAll')}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('credentials.instruction')}
        </p>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('credentials.continue')}
        </button>
      </div>
    </div>
  );
}

function CredRow({
  label,
  value,
  copied,
  onCopy,
  mono = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  const t = useTranslations('platformAdmin');
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</div>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 select-all rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950 ${
            mono ? 'font-mono tracking-wider' : ''
          }`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-gray-300 px-3 py-2 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {copied ? t('credentials.copied') : t('credentials.copy')}
        </button>
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        {...rest}
        className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
      />
    </label>
  );
}
