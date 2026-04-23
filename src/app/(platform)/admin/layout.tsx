import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

async function getPlatformAdminOrRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin/tenants');

  const svc = createServiceClient();
  const { data: admin } = await svc
    .from('platform_admins')
    .select('id, email, display_name, role, active')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!admin) redirect('/');
  return admin;
}

const NAV = [
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/usage', label: 'Usage' },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await getPlatformAdminOrRedirect();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin/tenants" className="text-lg font-semibold">
              🛡️ Platform Admin
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-sm text-slate-500">
            {admin.display_name || admin.email}
            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs">
              {admin.role}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
