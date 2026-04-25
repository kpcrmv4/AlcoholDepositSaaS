'use client';

/**
 * Neon theme — chrome (header / greeting / hero / stats / search / filter
 * / fab / footer link / style block). Cards live in `cards.tsx` (Phase F).
 */

import { TenantLink } from '@/lib/tenant/link';
import {
  Search,
  Plus,
  History,
  Hourglass,
  Wine,
  Flame,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { HeaderControls } from '../_shared/header-controls';
import type { ThemeViewProps } from '../types';

export function NeonView({
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
    <div className="neon-theme min-h-screen overflow-hidden">
      <div className="neon-bg" aria-hidden />
      <div className="neon-blob neon-blob-1" aria-hidden />
      <div className="neon-blob neon-blob-2" aria-hidden />
      <div className="neon-grid" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0916]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink
            href={`/customer${navQuery}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="neon-logo">
              <Wine className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="neon-display truncate text-[15px] font-bold text-white">
                {(storeName || 'BOTTLE KEEPER').toUpperCase()}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/55">
                <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                Bottle keeper
              </p>
            </div>
          </TenantLink>

          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-violet-200/70 transition-colors hover:bg-fuchsia-400/10 hover:text-white"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-3">
        <div className="mb-3 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-300/70">
            ★ Tonight
          </p>
          <h2 className="neon-display mt-1 text-[26px] font-black leading-tight text-white">
            {displayName ?? 'Welcome'} <span className="neon-text-coral">·</span>
          </h2>
          <p className="mt-1 text-[12px] text-violet-200/55">
            {stats.totalCount} ขวดในห้องเก็บของคุณ
          </p>
        </div>

        {/* Hero */}
        <section className="relative mb-5 overflow-hidden rounded-3xl p-[1.5px]">
          <div className="neon-border-glow" />
          <div className="relative rounded-[22px] bg-[#0d0b1a]/95 p-5">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute -bottom-4 left-0 h-24 w-24 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="neon-pulse-dot" />
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/75">
                  Your Cellar · Live
                </p>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <span className="neon-display neon-text-gradient text-[64px] font-black leading-none">
                  {stats.totalCount}
                </span>
                <div className="pb-1.5">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-violet-200/70">
                    {t('bottlesLabel')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-violet-200/45">
                    kept by {storeName || 'us'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {stats.pending > 0 && (
                  <Tag color="fuchsia">
                    <Hourglass className="h-3 w-3" /> {stats.pending} {t('filterPending')}
                  </Tag>
                )}
                {stats.nearExpiry > 0 && (
                  <Tag color="cyan">
                    <Flame className="h-3 w-3" /> {stats.nearExpiry} {t('filterExpiring')}
                  </Tag>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          <Stat label={t('statTotal')} value={String(stats.inStore + stats.pendingWithdrawal)} accent="violet" icon={<Wine className="h-4 w-4" />} />
          <Stat label={t('filterExpiring')} value={String(stats.nearExpiry)} accent="coral" icon={<Flame className="h-4 w-4" />} />
          <Stat label={t('filterPendingWithdraw')} value={String(stats.pendingWithdrawal)} accent="cyan" icon={<Hourglass className="h-4 w-4" />} />
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300/45" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="neon-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-violet-200/55 hover:bg-white/5"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="-mx-5 mb-4 overflow-x-auto px-5 pb-1">
          <div className="flex gap-1.5">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide transition-all ' +
                  (filter === chip.key
                    ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-[0_0_20px_rgba(232,121,249,0.45)]'
                    : 'border border-white/[0.07] bg-[#0d0b1a]/60 text-violet-200/55 hover:text-white')
                }
              >
                <span>{chip.label}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-[11.5px] font-bold tracking-wide text-violet-200/65 hover:bg-white/[0.06]"
          >
            <History className="h-3.5 w-3.5" />
            {t('viewHistory')}
          </TenantLink>
        </div>
      </main>

      <TenantLink
        href={`/customer/deposit${navQuery}`}
        className="customer-tap fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 px-5 py-3.5 text-sm font-black text-white shadow-[0_0_28px_rgba(232,121,249,0.55)] transition active:scale-95"
        aria-label={t('ctaDeposit')}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
        <span className="neon-display tracking-wider">{t('ctaDeposit')}</span>
      </TenantLink>

      <NeonStyles />
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: 'fuchsia' | 'cyan' }) {
  const cls =
    color === 'fuchsia'
      ? 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_16px_rgba(232,121,249,0.18)]'
      : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.18)]';
  return (
    <span className={'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ' + cls}>
      {children}
    </span>
  );
}

function Stat({
  label, value, icon, accent,
}: { label: string; value: string; icon: React.ReactNode; accent: 'violet' | 'coral' | 'cyan' }) {
  const palette = {
    violet: { ring: 'ring-violet-400/30', glow: 'shadow-[0_0_24px_rgba(167,134,223,0.25)]', icon: 'text-violet-300' },
    coral: { ring: 'ring-rose-400/30', glow: 'shadow-[0_0_24px_rgba(242,95,76,0.28)]', icon: 'text-rose-300' },
    cyan: { ring: 'ring-cyan-400/30', glow: 'shadow-[0_0_24px_rgba(103,232,249,0.22)]', icon: 'text-cyan-300' },
  }[accent];
  return (
    <div className={'relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0b1a]/60 p-3 ring-1 ring-inset ' + palette.ring + ' ' + palette.glow}>
      <div className={'absolute left-3 top-3 ' + palette.icon}>{icon}</div>
      <div className="flex flex-col items-end text-right">
        <p className="neon-display text-3xl font-black leading-none text-white">{value}</p>
        <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-wider text-violet-200/55">{label}</p>
      </div>
    </div>
  );
}

function NeonStyles() {
  return (
    <style jsx global>{`
      .neon-theme { background: #07061a; color: #ecebff; font-family: 'Inter', system-ui, sans-serif; }
      .neon-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background: linear-gradient(180deg, #0a0820 0%, #06051a 60%, #02010f 100%); }
      .neon-blob { position: fixed; z-index: 1; pointer-events: none; border-radius: 999px; filter: blur(80px); opacity: 0.55; }
      .neon-blob-1 { top: -80px; right: -60px; width: 280px; height: 280px;
        background: radial-gradient(circle, #f25f4c 0%, transparent 70%); }
      .neon-blob-2 { bottom: 20%; left: -100px; width: 320px; height: 320px;
        background: radial-gradient(circle, #a786df 0%, transparent 70%); }
      .neon-grid { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.18;
        background-image:
          linear-gradient(rgba(167, 134, 223, 0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(167, 134, 223, 0.4) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%); }
      .neon-display { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; letter-spacing: -0.01em; }
      .neon-text-gradient {
        background: linear-gradient(135deg, #f25f4c 0%, #ff8a5c 35%, #a786df 100%);
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 18px rgba(242, 95, 76, 0.4)); }
      .neon-text-coral { color: #f25f4c; text-shadow: 0 0 18px rgba(242, 95, 76, 0.7); }
      .neon-logo { display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
        border-radius: 12px; background: linear-gradient(135deg, #f25f4c, #a786df 60%, #5cd6ff);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 24px rgba(232,121,249,0.45); }
      .neon-pulse-dot { height: 8px; width: 8px; border-radius: 999px; background: #f25f4c;
        box-shadow: 0 0 12px rgba(242, 95, 76, 0.95); animation: neon-pulse 1.4s ease-in-out infinite; }
      .neon-border-glow { position: absolute; inset: 0; border-radius: 24px;
        background: linear-gradient(135deg, rgba(242,95,76,0.6) 0%, rgba(167,134,223,0.5) 40%, rgba(92,214,255,0.4) 80%, transparent 100%); }
      .neon-input { height: 46px; width: 100%; border-radius: 16px;
        border: 1px solid rgba(167, 134, 223, 0.18); background: rgba(13, 11, 26, 0.7);
        padding: 0 14px 0 38px; font-size: 13.5px; color: #ecebff; outline: none; transition: all 0.15s; }
      .neon-input::placeholder { color: rgba(220, 215, 255, 0.32); }
      .neon-input:focus { border-color: rgba(242, 95, 76, 0.45); background: rgba(20, 16, 38, 0.85);
        box-shadow: 0 0 0 4px rgba(242, 95, 76, 0.1), 0 0 24px rgba(242, 95, 76, 0.15); }
      @keyframes neon-pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.55;transform:scale(0.85);} }
    `}</style>
  );
}
