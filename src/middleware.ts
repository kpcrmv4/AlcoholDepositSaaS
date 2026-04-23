import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/invite',                       // /invite/{token}
  '/api/auth/register',
  '/api/auth/callback',
  '/api/line/webhook',
  '/api/cron',
  '/api/chat/bot-message',
  '/api/public',
];

const CUSTOMER_ROUTES = ['/customer', '/t/'];   // /t/{slug}/customer is also allowed for customers
const ADMIN_ROUTES = ['/admin', '/api/platform'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/icons')) return true;
  if (pathname === '/manifest.json') return true;
  if (pathname === '/sw.js') return true;
  return false;
}

function extractSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/t\/([^/]+)(?:\/|$)/);
  return m?.[1] ?? null;
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isCustomerPath(pathname: string): boolean {
  if (pathname === '/customer' || pathname.startsWith('/customer/')) return true;
  // /t/{slug}/customer/... is also a customer path
  if (/^\/t\/[^/]+\/customer(?:\/|$)/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Platform admin fast path ─────────────────────────────────────────
  // Platform admins live in their own table (platform_admins). They bypass
  // the normal tenant/profile flow and are only allowed on /admin/* paths.
  if (isAdminPath(pathname)) {
    const { data: platformAdmin } = await supabase
      .from('platform_admins')
      .select('id, active')
      .eq('id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (!platformAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    response.headers.set('x-platform-admin', '1');
    response.headers.set('x-user-id', user.id);
    return response;
  }

  // ── Resolve user's profile (tenant scoped) ───────────────────────────
  // Read role from JWT app_metadata for speed; fallback to DB.
  let role: string | null = (user.app_metadata?.role as string) || null;
  let tenantId: string | null = (user.app_metadata?.tenant_id as string) || null;

  if (!role || !tenantId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      // Possibly a platform admin trying to access tenant pages — send home
      const { data: platformAdmin } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('id', user.id)
        .eq('active', true)
        .maybeSingle();

      if (platformAdmin) {
        return NextResponse.redirect(new URL('/admin/tenants', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    role = profile.role;
    tenantId = profile.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.redirect(new URL('/login?error=no-tenant', request.url));
  }

  // ── /t/{slug}/ path: verify slug matches user's tenant ───────────────
  const urlSlug = extractSlugFromPath(pathname);
  if (urlSlug) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, status')
      .eq('slug', urlSlug)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.redirect(new URL('/login?error=tenant-not-found', request.url));
    }
    if (tenant.id !== tenantId) {
      return NextResponse.redirect(new URL('/login?error=tenant-mismatch', request.url));
    }
    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      return NextResponse.redirect(new URL('/suspended', request.url));
    }

    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
  } else {
    response.headers.set('x-tenant-id', tenantId);
  }

  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-role', role ?? 'staff');

  // ── Role gating ──────────────────────────────────────────────────────
  if (role === 'customer') {
    if (!isCustomerPath(pathname)) {
      return NextResponse.redirect(new URL('/customer', request.url));
    }
  } else {
    if (isCustomerPath(pathname) && pathname.startsWith('/customer')) {
      // non-customer can still view /t/{slug}/customer in staff-preview mode
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
