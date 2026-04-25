'use client';

import { useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { TenantLink } from '@/lib/tenant/link';
import { Megaphone, Languages, Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { Locale } from '@/i18n/config';

/**
 * Shared right-side header controls for the customer LIFF themes:
 *   [ Promotions ]  [ Lang switch ]  [ Light/Dark toggle ]
 *
 * Visuals are theme-driven through props. Each theme passes its own
 * `iconButtonClass` (and optional `langLabelClass`) so the icons sit
 * naturally in that theme's header chrome — instead of forcing an indigo
 * hover ring on top of a neon/sumi/sunset header.
 */
export function HeaderControls({
  iconButtonClass,
  langLabelClass,
  promotionsAriaLabel = 'Promotions',
  langAriaLabel = 'Switch language',
  themeAriaLabel = 'Toggle theme',
}: {
  iconButtonClass: string;
  langLabelClass?: string;
  promotionsAriaLabel?: string;
  langAriaLabel?: string;
  themeAriaLabel?: string;
}) {
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

  // Avoid hydration mismatch on the OS-theme icon — server renders the
  // pre-mount placeholder, client swaps to the resolved icon after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      <TenantLink
        href={`/customer/promotions${navQuery}`}
        className={iconButtonClass}
        aria-label={promotionsAriaLabel}
      >
        <Megaphone className="h-[17px] w-[17px]" />
      </TenantLink>

      <button
        type="button"
        onClick={switchLocale}
        className={iconButtonClass}
        aria-label={langAriaLabel}
        style={{ width: 'auto', paddingLeft: 10, paddingRight: 10 }}
      >
        <Languages className="h-[17px] w-[17px]" />
        <span className={langLabelClass ?? 'ml-1 text-[10.5px] font-bold uppercase'}>
          {locale === 'th' ? 'EN' : 'TH'}
        </span>
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        className={iconButtonClass}
        aria-label={themeAriaLabel}
      >
        {mounted ? (
          theme === 'dark' ? (
            <Sun className="h-[17px] w-[17px]" />
          ) : (
            <Moon className="h-[17px] w-[17px]" />
          )
        ) : (
          <Sun className="h-[17px] w-[17px] opacity-0" />
        )}
      </button>
    </div>
  );
}
