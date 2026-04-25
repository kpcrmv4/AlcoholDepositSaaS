'use client';

import { Suspense, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TenantLink as Link } from '@/lib/tenant/link';
import { useLocale } from 'next-intl';
import { Wine, Loader2, Megaphone, Languages, Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { Locale } from '@/i18n/config';
import {
  CustomerProvider,
  useCustomerAuth,
} from './_components/customer-provider';
import './customer-theme.css';

/**
 * The main customer home (`/t/{slug}/customer`) renders its own theme
 * chrome (header / hero / FAB) per the store's customer_theme. For all
 * the customer SUB-pages (deposit form, history, withdraw confirm,
 * promotions) we keep the original slate/indigo header so they stay
 * consistent — those pages haven't been re-themed yet.
 */
function isMainCustomerPath(pathname: string): boolean {
  return /\/t\/[^/]+\/customer\/?$/.test(pathname);
}

// ---------------------------------------------------------------------------
// Header (slate/indigo) — used for sub-pages only.
// ---------------------------------------------------------------------------
function CustomerHeader() {
  const { store } = useCustomerAuth();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const router = useRouter();
  const { theme, toggleTheme, setLocale } = useAppStore();

  const token = searchParams.get('token');
  const storeCode = searchParams.get('store');
  const queryParts: string[] = [];
  if (token) queryParts.push(`token=${encodeURIComponent(token)}`);
  if (storeCode) queryParts.push(`store=${encodeURIComponent(storeCode)}`);
  const navQuery = queryParts.length ? `?${queryParts.join('&')}` : '';

  const switchLocale = () => {
    const next: Locale = locale === 'th' ? 'en' : 'th';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    setLocale(next);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Link
          href={`/customer${navQuery}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30">
            <Wine className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
              Bottle Keeper
            </h1>
            <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {store.name || 'Customer Portal'}
            </span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/customer/promotions${navQuery}`}
            className="customer-focus-ring flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            aria-label="Promotions"
          >
            <Megaphone className="h-[18px] w-[18px]" />
          </Link>

          <button
            type="button"
            onClick={switchLocale}
            className="customer-focus-ring flex h-9 items-center gap-1 rounded-full px-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            aria-label="Switch language"
          >
            <Languages className="h-[18px] w-[18px]" />
            <span className="text-[11px] font-bold uppercase">
              {locale === 'th' ? 'EN' : 'TH'}
            </span>
          </button>

          <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    </header>
  );
}

function ThemeToggleButton({
  theme,
  onToggle,
}: {
  theme: 'light' | 'dark';
  onToggle: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      className="customer-focus-ring flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
      aria-label="Toggle theme"
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )
      ) : (
        <Sun className="h-[18px] w-[18px] opacity-0" />
      )}
    </button>
  );
}

function CustomerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const themed = isMainCustomerPath(pathname);

  // On the main customer page the per-store theme owns header + background.
  if (themed) {
    return (
      <CustomerProvider>
        <main className="relative min-h-screen">{children}</main>
      </CustomerProvider>
    );
  }

  // Sub-pages keep the original slate/indigo chrome.
  return (
    <CustomerProvider>
      <div className="customer-theme relative flex min-h-screen flex-col">
        <CustomerHeader />
        <main className="relative z-[5] flex-1">{children}</main>
      </div>
    </CustomerProvider>
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
        <div className="customer-theme flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <CustomerLayoutInner>{children}</CustomerLayoutInner>
    </Suspense>
  );
}
