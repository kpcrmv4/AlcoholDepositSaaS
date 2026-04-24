import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/tenant';

/**
 * GET /api/platform/audit?tenant_id=&limit=100
 * Stream tenant-level audit log (platform admin actions).
 */
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id') || '';
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

  const supabase = createServiceClient();
  let query = supabase
    .from('tenant_audit_logs')
    .select(
      'id, tenant_id, platform_admin_id, action, payload, ip_address, ' +
      'user_agent, created_at, tenants(slug, company_name), ' +
      'platform_admins(email, display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data ?? [] });
}
