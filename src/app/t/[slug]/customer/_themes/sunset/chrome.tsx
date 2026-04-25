'use client';

/**
 * Sunset theme — chrome (header / greeting / hero / stats / search / filter
 * / fab / footer link / style block). Cards live in cards.tsx (Phase J).
 */

import { TenantLink } from '@/lib/tenant/link';
import {
  Search,
  Plus,
  History,
  Hourglass,
  Wine,
  Flame,
  Sun,
  X,
  AlertCircle,
} from 'lucide-react';
import { HeaderControls } from '../_shared/header-controls';
import type { ThemeViewProps } from '../types';

export function SunsetView({
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
    <div className="sunset-theme min-h-screen overflow-hidden">
      <div className="sunset-sky" aria-hidden />
      <div className="sunset-sun" aria-hidden />
      <div className="sunset-water" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-white/30 bg-gradient-to-b from-orange-50/85 to-rose-50/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="sunset-logo">
              <Sun className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="sunset-display truncate text-[16px] font-extrabold text-orange-950">
                {storeName || 'Beach Cellar'}
              </p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700/70">
                Beach Cellar · Aloha
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-orange-700 transition-colors hover:bg-orange-200/60 hover:text-orange-950"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-3">
        <div className="mb-3 mt-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-orange-600">
            ☼ Aloha · เย็นนี้
          </p>
          <h2 className="sunset-display mt-1 text-[26px] font-black leading-tight text-orange-950">
            {displayName ?? 'Welcome'}
          </h2>
          <p className="mt-1 text-[12.5px] font-medium text-orange-900/65">
            ฟ้ากำลังเปลี่ยนสี · {stats.totalCount} ขวดของคุณรออยู่
          </p>
        </div>

        {/* Hero — gradient sky card with sun decoration */}
        <section className="relative mb-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-300 via-rose-300 to-amber-200 p-5 shadow-xl shadow-orange-300/40">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-200 to-orange-300 opacity-90 blur-md" />
          <div className="absolute right-2 top-2 h-20 w-20 rounded-full border-2 border-white/50" />
          <div className="relative">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-orange-950/70">
              Your Cellar
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="sunset-display text-[60px] font-black leading-none text-orange-950 drop-shadow-sm">
                {stats.totalCount}
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-wide text-orange-900/75">
                {t('bottlesLabel')}
              </span>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-orange-900/65">
              เก็บไว้ที่ {storeName || 'us'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.pending > 0 && (
                <Pill icon={<Hourglass className="h-3 w-3" />}>
                  {stats.pending} {t('filterPending')}
                </Pill>
              )}
              {stats.nearExpiry > 0 && (
                <Pill icon={<Flame className="h-3 w-3" />}>
                  {stats.nearExpiry} {t('filterExpiring')}
                </Pill>
              )}
            </div>
          </div>
        </section>

        {/* Stats — chunky rounded cards */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          <Stat label={t('statTotal')} value={String(stats.inStore + stats.pendingWithdrawal)} icon={<Wine className="h-4 w-4" />} accent="orange" />
          <Stat label={t('filterExpiring')} value={String(stats.nearExpiry)} icon={<Flame className="h-4 w-4" />} accent="rose" />
          <Stat label={t('filterPendingWithdraw')} value={String(stats.pendingWithdrawal)} icon={<Hourglass className="h-4 w-4" />} accent="teal" />
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50/85 px-3 py-2 text-xs text-rose-800 backdrop-blur-sm">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative mb-3.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="sunset-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-orange-700 hover:bg-orange-200/60"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="-mx-5 mb-4 overflow-x-auto px-5">
          <div className="flex gap-1.5 rounded-full border border-white/70 bg-white/55 p-1 backdrop-blur-sm">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold tracking-wide transition-all ' +
                  (filter === chip.key
                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-400/40'
                    : 'text-orange-900/60 hover:text-orange-900')
                }
              >
                <span>{chip.label}</span>
                <span className={
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none ' +
                  (filter === chip.key ? 'bg-white/25' : 'bg-orange-200/60 text-orange-900')
                }>
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
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/65 px-4 py-2 text-[11.5px] font-bold tracking-wide text-orange-900 backdrop-blur-sm hover:bg-white/85"
          >
            <History className="h-3.5 w-3.5" />
            {t('viewHistory')}
          </TenantLink>
        </div>
      </main>

      <TenantLink
        href={`/customer/deposit${navQuery}`}
        className="customer-tap fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-400/50 transition active:scale-95"
        aria-label={t('ctaDeposit')}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
        <span className="sunset-display tracking-wide">{t('ctaDeposit')}</span>
      </TenantLink>

      <SunsetStyles />
    </div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1 text-[11px] font-bold text-orange-950 backdrop-blur-sm">
      {icon}
      {children}
    </span>
  );
}

function Stat({
  label, value, icon, accent,
}: { label: string; value: string; icon: React.ReactNode; accent: 'orange' | 'rose' | 'teal' }) {
  const palette = {
    orange: { bg: 'from-orange-100 to-amber-50', icon: 'bg-orange-200 text-orange-700', text: 'text-orange-950' },
    rose: { bg: 'from-rose-100 to-orange-50', icon: 'bg-rose-200 text-rose-700', text: 'text-rose-950' },
    teal: { bg: 'from-teal-100 to-cyan-50', icon: 'bg-teal-200 text-teal-700', text: 'text-teal-950' },
  }[accent];
  return (
    <div className={'relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br p-3.5 shadow-md shadow-orange-200/40 ' + palette.bg}>
      <div className={'absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full ' + palette.icon}>
        {icon}
      </div>
      <div className="flex flex-col items-end text-right">
        <p className={'sunset-display text-3xl font-black leading-none ' + palette.text}>{value}</p>
        <p className={'mt-2 text-[10.5px] font-bold uppercase tracking-wider opacity-65 ' + palette.text}>{label}</p>
      </div>
    </div>
  );
}

function SunsetStyles() {
  return (
    <style jsx global>{`
      .sunset-theme { background: #fff7ed; color: #431407; font-family: 'Inter', system-ui, sans-serif; }
      .sunset-sky { position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background: linear-gradient(180deg, #fed7aa 0%, #fecaca 28%, #fda4af 50%, #fde68a 78%, #fef3c7 100%); }
      .sunset-sun { position: fixed; top: 32%; left: 50%; transform: translateX(-50%); z-index: 1;
        height: 320px; width: 320px; border-radius: 999px; pointer-events: none;
        background: radial-gradient(circle, #fef08a 0%, rgba(254,215,170,0.4) 40%, transparent 70%); }
      .sunset-water { position: fixed; bottom: 0; left: 0; right: 0; height: 28%; z-index: 1; pointer-events: none;
        background: linear-gradient(180deg, rgba(254,202,202,0.6) 0%, rgba(252,165,165,0.7) 30%, rgba(248,113,113,0.85) 100%); }
      .sunset-water::after { content: ''; position: absolute; inset: 0;
        background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 8px); }
      .sunset-display { font-family: 'Fraunces', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; letter-spacing: -0.015em; }
      .sunset-logo { display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
        border-radius: 999px; background: linear-gradient(135deg, #fb923c 0%, #f43f5e 100%); color: #fff;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(251,146,60,0.45); }
      .sunset-input { height: 46px; width: 100%; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.85); background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
        padding: 0 16px 0 42px; font-size: 13.5px; font-weight: 500; color: #431407;
        outline: none; transition: all 0.15s; box-shadow: 0 4px 14px rgba(251,146,60,0.18); }
      .sunset-input::placeholder { color: rgba(124,45,18,0.45); }
      .sunset-input:focus { border-color: #fb923c; background: rgba(255,255,255,0.95); }
    `}</style>
  );
}
