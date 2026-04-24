'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant } from '@/lib/tenant/types';

export default function CompanyForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/tenant/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: fd.get('company_name'),
        legal_name: fd.get('legal_name'),
        tax_id: fd.get('tax_id'),
        contact_email: fd.get('contact_email'),
        contact_phone: fd.get('contact_phone'),
        country: fd.get('country'),
        timezone: fd.get('timezone'),
        brand_color: fd.get('brand_color'),
        logo_url: fd.get('logo_url'),
      }),
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

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
    >
      {msg && <div className="text-sm">{msg}</div>}

      <div className="grid grid-cols-2 gap-4">
        <Field label="ชื่อบริษัท *" name="company_name" required defaultValue={tenant.company_name} />
        <Field label="ชื่อนิติบุคคล" name="legal_name" defaultValue={tenant.legal_name ?? ''} />
        <Field label="เลขผู้เสียภาษี" name="tax_id" defaultValue="" />
        <Field label="อีเมลติดต่อ *" name="contact_email" type="email" required defaultValue={tenant.contact_email} />
        <Field label="เบอร์โทร" name="contact_phone" defaultValue={tenant.contact_phone ?? ''} />
        <Field label="ประเทศ" name="country" defaultValue={tenant.country} />
        <Field label="Timezone" name="timezone" defaultValue={tenant.timezone} />
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Branding</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="สีหลัก" name="brand_color" type="color" defaultValue={tenant.brand_color ?? '#4f46e5'} />
          <Field label="โลโก้ URL" name="logo_url" defaultValue={tenant.logo_url ?? ''} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
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
