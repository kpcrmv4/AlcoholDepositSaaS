'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  CustomerProvider,
  useCustomerAuth,
} from './_components/customer-provider';
import { ThemedSubShell } from './_themes/sub-shell';
import './customer-theme.css';

/**
 * The main customer home (`/t/{slug}/customer`) renders its own complete
 * theme chrome (header / hero / FAB) via ThemedCustomerView. ALL the
 * other customer routes (deposit / history / withdraw / promotions /
 * settings / etc.) get wrapped here in <ThemedSubShell> so they share
 * the same per-store theme background + brand header — the entire LIFF
 * feels like one product.
 */
function isMainCustomerPath(pathname: string): boolean {
  return /\/t\/[^/]+\/customer\/?$/.test(pathname);
}

function CustomerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { store } = useCustomerAuth();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const storeCode = searchParams.get('store');
  const queryParts: string[] = [];
  if (token) queryParts.push(`token=${encodeURIComponent(token)}`);
  if (storeCode) queryParts.push(`store=${encodeURIComponent(storeCode)}`);
  const navQuery = queryParts.length ? `?${queryParts.join('&')}` : '';

  // Main customer page: ThemedCustomerView owns the full chrome.
  if (isMainCustomerPath(pathname)) {
    return <main className="relative min-h-screen">{children}</main>;
  }

  // Sub-pages: themed bg + brand header from the per-store theme.
  return (
    <ThemedSubShell
      themeKey={store.customerTheme}
      storeName={store.name}
      navQuery={navQuery}
    >
      <main className="relative">{children}</main>
    </ThemedSubShell>
  );
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      }
    >
      <CustomerProvider>
        <CustomerLayoutInner>{children}</CustomerLayoutInner>
      </CustomerProvider>
    </Suspense>
  );
}
