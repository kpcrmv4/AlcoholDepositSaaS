import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/customer/promotions?tenantSlug=XX
 *
 * Returns active customer-facing announcements for the given tenant.
 * No identity required — any LIFF visitor can read promotions for the
 * tenant whose LIFF they opened.
 *
 * Filters applied:
 *   - tenant_id resolved from slug
 *   - active = true
 *   - target_audience IN ('customer', 'all')
 *   - start_date <= now
 *   - end_date IS NULL OR end_date >= now
 */
export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenantSlug');

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing tenantSlug' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Resolve tenant from slug (active tenants only)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ promotions: [] });
  }

  const now = new Date().toISOString();

  const { data } = await supabase
    .from('announcements')
    .select(
      'id, title, body, image_url, type, start_date, end_date, store:stores(store_name)',
    )
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .in('target_audience', ['customer', 'all'])
    .lte('start_date', now)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ promotions: data || [] });
}
