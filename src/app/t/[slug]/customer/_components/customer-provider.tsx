'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTenantMaybe } from '@/lib/tenant';
import {
  DEFAULT_CUSTOMER_THEME,
  isCustomerTheme,
  type CustomerThemeKey,
} from '@/lib/customer-themes';

interface StoreContext {
  /** store_code passed via ?store=XX (from the staff-shared LIFF URL) */
  code: string | null;
  /** store display name resolved from DB */
  name: string | null;
  /** store id resolved from DB */
  id: string | null;
  /** Customer LIFF theme picked by branch settings (defaults to 'amber') */
  customerTheme: CustomerThemeKey;
}

interface CustomerAuth {
  lineUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** 'liff' | 'token' | null (loading) */
  mode: 'liff' | 'token' | null;
  isLoading: boolean;
  error: string | null;
  /** Store context parsed from URL ?store= param */
  store: StoreContext;
}

const DEFAULT_STORE: StoreContext = {
  code: null,
  name: null,
  id: null,
  customerTheme: DEFAULT_CUSTOMER_THEME,
};

const CustomerContext = createContext<CustomerAuth>({
  lineUserId: null,
  displayName: null,
  avatarUrl: null,
  mode: null,
  isLoading: true,
  error: null,
  store: DEFAULT_STORE,
});

export function useCustomerAuth() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const storeCode = searchParams.get('store');
  const t = useTranslations('customer.provider');

  const [auth, setAuth] = useState<CustomerAuth>({
    lineUserId: null,
    displayName: null,
    avatarUrl: null,
    mode: null,
    isLoading: true,
    error: null,
    store: { code: storeCode, name: null, id: null, customerTheme: DEFAULT_CUSTOMER_THEME },
  });

  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Resolve store context from ?store=CODE parameter
  // -------------------------------------------------------------------------
  async function resolveStoreContext(code: string | null): Promise<StoreContext> {
    if (!code) return DEFAULT_STORE;
    try {
      const res = await fetch(
        `/api/public/store-lookup?code=${encodeURIComponent(code)}`,
      );
      if (!res.ok) return { code, name: null, id: null, customerTheme: DEFAULT_CUSTOMER_THEME };
      const data = await res.json();
      const theme = isCustomerTheme(data.customerTheme)
        ? data.customerTheme
        : DEFAULT_CUSTOMER_THEME;
      return {
        code,
        name: data.name || null,
        id: data.id || null,
        customerTheme: theme,
      };
    } catch {
      return { code, name: null, id: null, customerTheme: DEFAULT_CUSTOMER_THEME };
    }
  }

  // -------------------------------------------------------------------------
  // The LIFF ID lives on tenants.liff_id and is provided via TenantProvider
  // (the customer route is wrapped by /t/[slug]/layout.tsx). Falling back to
  // the legacy /api/system-settings/public endpoint kept the old behaviour
  // working when context was unavailable, but in the multi-tenant model we
  // ALWAYS have it via context, so just read it directly.
  // -------------------------------------------------------------------------
  const tenantFromCtx = useTenantMaybe();
  function fetchCentralLiffId(): string {
    return tenantFromCtx?.liff_id ?? '';
  }

  async function initAuth() {
    // Resolve store context in parallel with auth flow
    const storeContextPromise = resolveStoreContext(storeCode);

    // -------------------------------------------------------
    // Mode 1: Token mode (จาก URL ?token=xxxx)
    // -------------------------------------------------------
    if (token) {
      try {
        const res = await fetch(`/api/auth/customer-token?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          setAuth({
            lineUserId: null,
            displayName: null,
            avatarUrl: null,
            mode: null,
            isLoading: false,
            error: t('linkExpired'),
            store: await storeContextPromise,
          });
          return;
        }

        const data = await res.json();
        setAuth({
          lineUserId: data.lineUserId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          mode: 'token',
          isLoading: false,
          error: null,
          store: await storeContextPromise,
        });
        return;
      } catch {
        setAuth({
          lineUserId: null,
          displayName: null,
          avatarUrl: null,
          mode: null,
          isLoading: false,
          error: t('linkError'),
          store: await storeContextPromise,
        });
        return;
      }
    }

    // -------------------------------------------------------
    // Mode 2: LIFF mode — fetch central LIFF ID from DB
    //   → init LIFF → login → verify server-side
    // -------------------------------------------------------
    const liffId = await fetchCentralLiffId();

    if (liffId) {
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return; // จะ redirect กลับมา
        }

        // ได้ access token → verify กับ server (ใช้ service client ดึง deposits)
        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          throw new Error('No access token from LIFF');
        }

        // เก็บ access token ไว้ให้ customer page ใช้เรียก API
        sessionStorage.setItem('liff_access_token', accessToken);

        const res = await fetch('/api/auth/liff-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        if (!res.ok) {
          throw new Error('LIFF verify failed');
        }

        const data = await res.json();
        setAuth({
          lineUserId: data.lineUserId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          mode: 'liff',
          isLoading: false,
          error: null,
          store: await storeContextPromise,
        });
        return;
      } catch (err) {
        console.error('[CustomerProvider] LIFF init error:', err);
        setAuth({
          lineUserId: null,
          displayName: null,
          avatarUrl: null,
          mode: null,
          isLoading: false,
          error: t('lineConnectError'),
          store: await storeContextPromise,
        });
        return;
      }
    }

    // -------------------------------------------------------
    // ไม่มีทั้ง token และ LIFF_ID
    // -------------------------------------------------------
    setAuth({
      lineUserId: null,
      displayName: null,
      avatarUrl: null,
      mode: null,
      isLoading: false,
      error: t('openFromLine'),
      store: await storeContextPromise,
    });
  }

  return (
    <CustomerContext.Provider value={auth}>
      {children}
    </CustomerContext.Provider>
  );
}
