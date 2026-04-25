'use client';

/**
 * Amber theme — chrome (header / greeting / hero / stats / search / filter
 * / fab / footer link / style block). The bottle list itself is rendered
 * by `AmberView`'s children — supplied separately in `cards.tsx` (Phase D).
 *
 * This keeps the chrome file under ~250 lines and isolated from card-list
 * concerns.
 */

import { useSyncExternalStore } from 'react';
import { TenantLink } from '@/lib/tenant/link';
import {
  Search,
  Plus,
  History,
  Hourglass,
  X,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { HeaderControls } from '../_shared/header-controls';
import type { ThemeViewProps } from '../types';

export function AmberView({
  props,
  children,
}: {
  props: ThemeViewProps;
  children: React.ReactNode;
}) {
  const {
    displayName,
    storeName,
    stats,
    filterChips,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    navQuery,
    error,
    t,
  } = props;

  // Time-of-day greeting — useSyncExternalStore so SSR renders the safe
  // 'Good evening' default and the client swaps to the local-time greeting
  // post-hydration without warnings.
  const greetingKey = useSyncExternalStore(
    () => () => {},
    () => {
      const h = new Date().getHours();
      return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    },
    () => 'evening' as const,
  );
  const greeting =
    greetingKey === 'morning'
      ? 'Good morning'
      : greetingKey === 'afternoon'
        ? 'Good afternoon'
        : 'Good evening';

  return (
    <div className="amber-theme min-h-screen">
      <div className="amber-bg" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-amber-200/10 bg-[#13100c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink
            href={`/customer${navQuery}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="amber-monogram">
              <span>{(storeName || 'SB').slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="amber-serif truncate text-[15px] font-semibold tracking-wide text-amber-50">
                {storeName || 'Bottle Keeper'}
              </p>
              <p className="truncate text-[10.5px] uppercase tracking-[0.18em] text-amber-200/50">
                Bottle Keeper · Cellar
              </p>
            </div>
          </TenantLink>

          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-amber-200/70 transition-colors hover:bg-amber-200/10 hover:text-amber-100"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-4">
        {displayName && (
          <div className="mb-4">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-amber-200/50">
              {greeting}
            </p>
            <h2 className="amber-serif mt-1 text-2xl font-semibold leading-tight text-amber-50">
              {displayName}
            </h2>
          </div>
        )}

        {/* Hero */}
        <section className="relative mb-4 overflow-hidden rounded-[22px] border border-amber-200/15 bg-gradient-to-br from-[#221913] via-[#1a130d] to-[#0f0a06] p-5 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent" />
          <div className="relative">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-amber-200/55">
              Your Cellar
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="amber-serif text-5xl font-semibold leading-none text-amber-50">
                {stats.totalCount}
              </span>
              <span className="text-sm font-medium text-amber-200/70">
                {t('bottlesLabel')}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-amber-100/55">
              {stats.pending > 0 && `${stats.pending} ${t('filterPending')} · `}
              {stats.nearExpiry > 0 && `${stats.nearExpiry} ${t('filterExpiring')}`}
              {stats.pending === 0 && stats.nearExpiry === 0 && t('inStore')}
            </p>
          </div>
        </section>

        {/* Stats pills */}
        <div className="mb-5 flex items-stretch divide-x divide-amber-200/10 rounded-2xl border border-amber-200/10 bg-[#1a130d]/80 px-1 py-2.5">
          <Pill label={t('statTotal')} value={String(stats.inStore + stats.pendingWithdrawal)} />
          <Pill label={t('filterExpiring')} value={String(stats.nearExpiry)} accent />
          <Pill label={t('statPending')} value={String(stats.pending + stats.pendingWithdrawal)} />
        </div>

        {/* CTA */}
        <TenantLink
          href={`/customer/deposit${navQuery}`}
          className="customer-tap mb-4 hidden w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-300/15 to-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span className="amber-serif tracking-wide">{t('ctaDeposit')}</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        </TenantLink>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-900/20 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="amber-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-amber-200/60 hover:bg-amber-200/10"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="-mx-5 mb-4 overflow-x-auto px-5 pb-1">
          <div className="flex gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ' +
                  (filter === chip.key
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#1a1108] shadow-sm shadow-amber-500/30'
                    : 'border border-amber-200/15 bg-[#0f0a06] text-amber-200/65 hover:border-amber-200/30 hover:text-amber-100')
                }
              >
                <span>{chip.label}</span>
                <span
                  className={
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ' +
                    (filter === chip.key
                      ? 'bg-[#1a1108]/15 text-[#1a1108]'
                      : 'bg-amber-200/10 text-amber-200/70')
                  }
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List slot — supplied by parent */}
        {children}

        {/* Footer */}
        <div className="mt-6 flex justify-center">
          <TenantLink
            href={`/customer/history${navQuery}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/10 bg-amber-200/[0.04] px-4 py-2 text-[11.5px] font-semibold tracking-wide text-amber-200/65 hover:bg-amber-200/[0.08]"
          >
            <History className="h-3.5 w-3.5" />
            {t('viewHistory')}
          </TenantLink>
        </div>
      </main>

      {/* FAB */}
      <TenantLink
        href={`/customer/deposit${navQuery}`}
        className="amber-fab fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3.5 text-sm font-bold text-[#1a1108] shadow-2xl shadow-amber-500/30 transition active:scale-95"
        aria-label={t('ctaDeposit')}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
        <span className="amber-serif tracking-wide">{t('ctaDeposit')}</span>
      </TenantLink>

      <AmberStyles />
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2">
      <div
        className={
          'flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] ' +
          (accent ? 'text-amber-300/85' : 'text-amber-200/55')
        }
      >
        <Hourglass className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <span
        className={
          'amber-serif text-xl font-semibold leading-none ' +
          (accent ? 'text-amber-300' : 'text-amber-50')
        }
      >
        {value}
      </span>
    </div>
  );
}

function AmberStyles() {
  return (
    <style jsx global>{`
      .amber-theme { background: #0d0907; color: #f3e9d6; font-family: 'Inter', system-ui, sans-serif; }
      .amber-bg {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(80% 50% at 80% -10%, rgba(245, 180, 90, 0.18), transparent 60%),
          radial-gradient(60% 40% at 0% 30%, rgba(212, 165, 116, 0.08), transparent 70%),
          linear-gradient(180deg, #110b07 0%, #0a0705 60%, #06040a 100%);
      }
      .amber-serif {
        font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
        letter-spacing: 0.01em;
      }
      .amber-monogram {
        display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
        border-radius: 10px;
        background: linear-gradient(135deg, #f5d28a, #c89554 50%, #6d4621);
        color: #1a1108; font-weight: 800; letter-spacing: 0.06em; font-size: 11px;
        box-shadow: inset 0 1px 0 rgba(255,230,180,0.5), 0 4px 12px rgba(150,90,30,0.35);
      }
      .amber-input {
        height: 44px; width: 100%;
        border-radius: 14px; border: 1px solid rgba(245, 200, 130, 0.12);
        background: rgba(15, 10, 6, 0.7); padding: 0 14px 0 38px;
        font-size: 13.5px; color: #f3e9d6; outline: none; transition: all 0.15s;
      }
      .amber-input::placeholder { color: rgba(245, 230, 200, 0.32); }
      .amber-input:focus {
        border-color: rgba(245, 200, 130, 0.4); background: rgba(20, 14, 9, 0.85);
        box-shadow: 0 0 0 4px rgba(245, 200, 130, 0.08);
      }
    `}</style>
  );
}
