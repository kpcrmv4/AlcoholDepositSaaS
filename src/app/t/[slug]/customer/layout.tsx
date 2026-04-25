'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CustomerProvider } from './_components/customer-provider';

/**
 * The customer LIFF layout intentionally renders only the auth provider +
 * a body container. Each per-store theme (amber/neon/sumi/sunset) owns its
 * full visual chrome — header, background, FAB, etc. — so that a tenant
 * picking "Sumi" gets a coherent washi-paper experience instead of a purple
 * sticky header above a sumi body.
 *
 * The actual theme renderer lives in `_themes/index.tsx` and is selected by
 * `page.tsx` based on `useCustomerAuth().store.customerTheme`.
 */
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
      <CustomerProvider>{children}</CustomerProvider>
    </Suspense>
  );
}
