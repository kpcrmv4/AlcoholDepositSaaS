'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTenantPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: String(fd.get('slug') || '').toLowerCase(),
      company_name: fd.get('company_name'),
      contact_email: fd.get('contact_email'),
      contact_phone: fd.get('contact_phone'),
      legal_name: fd.get('legal_name'),
      tax_id: fd.get('tax_id'),
      plan: fd.get('plan') || 'trial',
      max_branches: Number(fd.get('max_branches') || 1),
      max_users: Number(fd.get('max_users') || 10),
      line_mode: fd.get('line_mode') || 'per_store',
      status: 'trial',
      trial_ends_at: fd.get('trial_days')
        ? new Date(Date.now() + Number(fd.get('trial_days')) * 86400_000).toISOString()
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
      <h1 className="text-2xl font-semibold">Create new tenant</h1>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Company</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company name *" name="company_name" required />
            <Field label="Slug (URL) *" name="slug" required placeholder="bar-somchai" />
            <Field label="Contact email *" name="contact_email" required type="email" />
            <Field label="Contact phone" name="contact_phone" />
            <Field label="Legal name" name="legal_name" />
            <Field label="Tax ID" name="tax_id" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Plan" name="plan" defaultValue="trial" options={[
              { value: 'trial', label: 'Trial' },
              { value: 'starter', label: 'Starter' },
              { value: 'growth', label: 'Growth' },
              { value: 'enterprise', label: 'Enterprise' },
              { value: 'custom', label: 'Custom' },
            ]} />
            <Field label="Trial days" name="trial_days" type="number" defaultValue="14" />
            <Field label="Max branches" name="max_branches" type="number" defaultValue="1" />
            <Field label="Max users" name="max_users" type="number" defaultValue="10" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">LINE</h2>
          <Select label="LINE mode" name="line_mode" defaultValue="per_store" options={[
            { value: 'per_store', label: 'Per store (each branch has its own OA)' },
            { value: 'tenant', label: 'Tenant (single OA for all branches)' },
          ]} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
            Channel ID / secret / token are set from the tenant detail page after creation.
          </p>
        </section>

        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded px-4 py-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create tenant'}
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
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">{label}</span>
      <input
        {...rest}
        className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
      />
    </label>
  );
}

function Select({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue?: string; options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
