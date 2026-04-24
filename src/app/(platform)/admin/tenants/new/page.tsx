'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TRIAL_DAYS = 7;

export default function NewTenantPage() {
  const router = useRouter();
  const t = useTranslations('platformAdmin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<'trial' | 'pro'>('trial');

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

    const { tenant } = await res.json();
    router.push(`/admin/tenants/${tenant.id}`);
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
