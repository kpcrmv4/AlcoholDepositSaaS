'use client';

/**
 * Crimson theme — chrome (header / greeting / hero / stats / search /
 * filter / fab / footer link / style block). Cards live in cards.tsx
 * (Phase N3).
 *
 * Vibe: deep wine-red wallpaper + cream paper inserts, casual hand-drawn
 * accents. Inspired by neighborhood wine-bar / bistro Instagram aesthetics.
 */

import { TenantLink } from '@/lib/tenant/link';
import {
  Search,
  Plus,
  History,
  Wine,
  X,
  AlertCircle,
} from 'lucide-react';
import { HeaderControls } from '../_shared/header-controls';
import type { ThemeViewProps } from '../types';

export function CrimsonView({
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

  return (
    <div className="crimson-theme min-h-screen">
      <div className="crimson-bg" aria-hidden />
      <div className="crimson-paper" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-red-50/15 bg-[#5b1414]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink
            href={`/customer${navQuery}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="crimson-stamp">
              <span className="crimson-script">v</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="crimson-display truncate text-[15px] font-bold tracking-wider text-red-50">
                {(storeName || 'WINE BAR').toUpperCase()}
              </p>
              <p className="truncate text-[10.5px] uppercase tracking-[0.2em] text-red-50/55">
                Bottle Cellar · Est.
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-red-50/75 transition-colors hover:bg-red-50/10 hover:text-red-50"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-4">
        {displayName && (
          <div className="mb-4">
            <p className="crimson-script text-[20px] leading-none text-red-50/65">
              dear,
            </p>
            <h2 className="crimson-display mt-1 text-[28px] font-semibold leading-tight text-red-50">
              {displayName}
            </h2>
          </div>
        )}

        {/* Hero — cream paper card on wine background */}
        <section className="theme-surface relative mb-4 overflow-hidden p-5">
          {/* Hand-drawn squiggle decoration */}
          <svg
            viewBox="0 0 80 40"
            className="absolute right-3 top-3 h-10 w-20 opacity-40"
            aria-hidden
          >
            <path
              d="M2 20 Q 12 4, 20 20 T 40 20 T 60 20 T 78 20"
              fill="none"
              stroke="#7a1a1a"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="68" cy="14" r="1.5" fill="#7a1a1a" />
          </svg>

          <p className="crimson-script text-[18px] leading-none text-[#7a1a1a]/80">
            your cellar
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="crimson-display text-[58px] font-bold leading-none text-[#3d0a0a]">
              {stats.totalCount}
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider text-[#7a1a1a]/75">
              {t('bottlesLabel')}
            </span>
          </div>
          <p className="crimson-script mt-2 text-[15px] leading-tight text-[#7a1a1a]/75">
            {stats.pending > 0 && `${stats.pending} ${t('filterPending')}, `}
            {stats.nearExpiry > 0 && `${stats.nearExpiry} ${t('filterExpiring')}`}
            {stats.pending === 0 && stats.nearExpiry === 0 && '— เก็บไว้ที่นี่ '}
            <span className="crimson-display font-semibold text-[#3d0a0a]">
              {storeName || ''}
            </span>
          </p>
        </section>

        {/* Stats — divided by hairlines on the wine bg, cream-on-wine */}
        <div className="mb-5 grid grid-cols-3 divide-x divide-red-50/10 rounded-md border border-red-50/10 bg-[#3d0a0a]/40 px-1 py-3">
          <Stat label={t('statTotal')} value={String(stats.inStore + stats.pendingWithdrawal)} />
          <Stat label={t('filterExpiring')} value={String(stats.nearExpiry)} accent />
          <Stat label={t('statPending')} value={String(stats.pending + stats.pendingWithdrawal)} />
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search — cream input on wine bg. The leading icon sits at left
         * 14px (h-4 w-4 → 16px wide → ends at 30px), so the input needs
         * paddingLeft >= 38px. Tailwind v4 puts `pl-10` in @layer utilities
         * which is OUTRANKED by unlayered .theme-input padding rules — so
         * the previous `pl-10` class lost the cascade fight and text slid
         * back under the icon. Inline style sidesteps the layer order. */}
        <div className="relative mb-3.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a1a1a]/55" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="theme-input"
            style={{ paddingLeft: 40 }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#7a1a1a]/65 hover:bg-[#7a1a1a]/10"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter — cream pill chips on wine bg, active = solid cream */}
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
                    ? 'bg-[#faf3e8] text-[#7a1a1a]'
                    : 'border border-red-50/25 bg-transparent text-red-50/75 hover:bg-red-50/10')
                }
              >
                <span>{chip.label}</span>
                <span
                  className={
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ' +
                    (filter === chip.key
                      ? 'bg-[#7a1a1a]/15 text-[#7a1a1a]'
                      : 'bg-red-50/15 text-red-50/85')
                  }
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {children}

        <div className="mt-6 flex justify-center">
          <TenantLink
            href={`/customer/history${navQuery}`}
            className="inline-flex items-center gap-1.5 border-b border-red-50/40 pb-1 text-[12px] font-semibold tracking-wide text-red-50/75 hover:text-red-50"
          >
            <History className="h-3.5 w-3.5" />
            {t('viewHistory')}
          </TenantLink>
        </div>
      </main>

      <TenantLink
        href={`/customer/deposit${navQuery}`}
        className="customer-tap fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#faf3e8] px-5 py-3.5 text-sm font-bold text-[#7a1a1a] shadow-2xl shadow-black/40 transition active:scale-95"
        aria-label={t('ctaDeposit')}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
        <span className="crimson-display tracking-wide">{t('ctaDeposit')}</span>
      </TenantLink>

      <CrimsonStyles />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-red-50/55">
        <Wine className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <span
        className={
          'crimson-display text-xl font-bold leading-none ' +
          (accent ? 'text-[#fde68a]' : 'text-red-50')
        }
      >
        {value}
      </span>
    </div>
  );
}

function CrimsonStyles() {
  return (
    <style jsx global>{`
      .crimson-theme {
        background: #7a1a1a;
        color: #faf3e8;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .crimson-bg {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(70% 50% at 90% 0%, rgba(0,0,0,0.45), transparent 60%),
          radial-gradient(50% 40% at 0% 100%, rgba(0,0,0,0.5), transparent 60%),
          linear-gradient(180deg, #7a1a1a 0%, #5b1414 50%, #3d0a0a 100%);
      }
      .crimson-paper {
        position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.18;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.74  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      }
      .crimson-display {
        font-family: 'Fraunces', 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
        letter-spacing: -0.01em;
      }
      .crimson-script {
        font-family: 'Caveat', 'Reenie Beanie', 'Indie Flower', cursive;
        letter-spacing: 0.02em;
      }
      .crimson-stamp {
        display: flex; height: 38px; width: 38px; align-items: center; justify-content: center;
        border-radius: 999px;
        background: #faf3e8;
        color: #7a1a1a;
        font-size: 22px; font-weight: 700;
        box-shadow: inset 0 0 0 2px #7a1a1a, inset 0 0 0 2.5px #faf3e8;
      }
    `}</style>
  );
}
