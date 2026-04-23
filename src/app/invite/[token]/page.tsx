import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import InviteClient from './invite-client';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Params) {
  const { token } = await params;

  const svc = createServiceClient();
  const { data: inv } = await svc
    .from('tenant_invitations')
    .select(
      'id, email, role, accepted_at, expires_at, ' +
      'tenants(slug, company_name, logo_url, brand_color)',
    )
    .eq('token', token)
    .maybeSingle();

  if (!inv) notFound();

  const expired = new Date(inv.expires_at).getTime() < Date.now();
  const accepted = !!inv.accepted_at;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <InviteClient
          token={token}
          invitation={{
            email: inv.email,
            role: inv.role,
            expired,
            accepted,
            tenant_name: (inv.tenants as any)?.company_name ?? 'unknown tenant',
            tenant_slug: (inv.tenants as any)?.slug ?? null,
            brand_color: (inv.tenants as any)?.brand_color ?? '#4f46e5',
            logo_url: (inv.tenants as any)?.logo_url ?? null,
          }}
        />
      </div>
    </div>
  );
}
