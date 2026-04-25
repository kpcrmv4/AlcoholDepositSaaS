import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/invite',                       // /invite/{token}
  '/api/auth/register',
  '/api/auth/callback',
  '/api/invite',                   // /api/invite/{token}/accept — auths itself
  '/api/line/webhook',
  '/api/cron',
  '/api/chat/bot-message',
  '/api/public',
  '/suspended',
];

const ADMIN_ROUTES = ['/admin', '/api/platform'];

// Legacy (single-tenant) paths that should redirect to the tenant-scoped
// equivalent. These are page routes only — APIs stay flat.
const LEGACY_PAGE_ROOTS = [
  '/overview', '/deposit', '/stock', '/bar-approval', '/borrow',
  '/transfer', '/hq-warehouse', '/commission', '/performance', '/activity',
  '/announcements', '/chat', '/my-tasks', '/notifications', '/profile',
  '/reports', '/print-listener', '/store-overview', '/users', '/guide',
  '/settings',
];

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

function isLegacyPagePath(pathname: string): boolean {
  return LEGACY_PAGE_ROOTS.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isCustomerLegacyPath(pathname: string): boolean {
  return pathname === '/customer' || pathname.startsWith('/customer/');
}

/**
 * Customer LIFF pages run inside the LINE in-app browser with no Supabase
 * session — auth is handled client-side via the LIFF SDK / customer-token
 * URL param. The middleware MUST NOT redirect them to /login, otherwise
 * tapping the "เริ่มต้นใช้งาน" Flex button bounces the user to the staff
 * login screen instead of opening the deposit portal.
 */
function isCustomerLiffPath(pathname: string): boolean {
  return /^\/t\/[^/]+\/customer(\/.*)?$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Surface the pathname into the request headers so RSC layouts can
  // branch on it (e.g. t/[slug]/layout.tsx skips its auth guard when
  // the user is on /customer/*).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  if (isPublic(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (isCustomerLiffPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
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

  // ── Platform admin fast path (/admin/*) ──────────────────────────────
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

  // ── Load user's profile ──────────────────────────────────────────────
  let role: string | null = (user.app_metadata?.role as string) || null;
  let tenantId: string | null = (user.app_metadata?.tenant_id as string) || null;

  if (!role || !tenantId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      // Platform admin trying to visit tenant pages → send to admin
      const { data: admin } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('id', user.id)
        .eq('active', true)
        .maybeSingle();
      if (admin) return NextResponse.redirect(new URL('/admin/tenants', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }
    role = profile.role;
    tenantId = profile.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.redirect(new URL('/login?error=no-tenant', request.url));
  }

  // Fetch tenant slug + status for routing
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, status')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.redirect(new URL('/login?error=tenant-not-found', request.url));
  }
  if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
    return NextResponse.redirect(new URL('/suspended', request.url));
  }

  const slug = tenant.slug;

  // ── Legacy path redirect ─────────────────────────────────────────────
  // /overview → /t/{slug}/overview, /customer → /t/{slug}/customer, etc.
  if (isLegacyPagePath(pathname)) {
    const newUrl = new URL(`/t/${slug}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }
  if (isCustomerLegacyPath(pathname)) {
    const newUrl = new URL(`/t/${slug}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }

  // ── /t/{slug}/ validation ────────────────────────────────────────────
  const urlSlug = extractSlugFromPath(pathname);
  if (urlSlug) {
    if (urlSlug !== slug) {
      // User is on another tenant's URL — reject
      return NextResponse.redirect(new URL(`/t/${slug}/overview`, request.url));
    }
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', slug);
  } else {
    response.headers.set('x-tenant-id', tenant.id);
  }

  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-role', role ?? 'staff');

  // ── Role gating: customer must stay in /customer ─────────────────────
  if (role === 'customer') {
    const isCustomerScoped =
      pathname === `/t/${slug}/customer` || pathname.startsWith(`/t/${slug}/customer/`);
    if (!isCustomerScoped) {
      return NextResponse.redirect(new URL(`/t/${slug}/customer`, request.url));
    }
  } else {
    // Non-customer cannot access customer scope
    if (pathname.startsWith(`/t/${slug}/customer`)) {
      return NextResponse.redirect(new URL(`/t/${slug}/overview`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
