'use client';

/**
 * Sumi theme — chrome (header / greeting / hero / stats / search / filter
 * / fab / footer link / style block). Cards live in cards.tsx (Phase H).
 */

import { TenantLink } from '@/lib/tenant/link';
import {
  Search,
  Plus,
  History,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { HeaderControls } from '../_shared/header-controls';
import type { ThemeViewProps } from '../types';

export function SumiView({
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
    <div className="sumi-theme min-h-screen">
      <div className="sumi-paper" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-stone-300/40 bg-[#fbf7ef]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-6 py-3.5">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="sumi-seal">
              <span>蔵</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="sumi-serif truncate text-[16px] font-medium text-stone-900">
                {storeName || 'Bottle Cellar'}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Bottle Cellar · 酒蔵
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-6 pb-32 pt-6">
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">
            ・ Konbanwa ・
          </p>
          <h2 className="sumi-serif mt-1.5 text-[26px] font-semibold leading-tight text-stone-900">
            {displayName ?? 'いらっしゃいませ'}
          </h2>
          <p className="mt-1 text-[12.5px] text-stone-500">
            ยินดีต้อนรับกลับสู่ห้องเก็บขวดของคุณ
          </p>
        </div>

        {/* Hero — divider lines, big number */}
        <section className="mb-7 border-y border-stone-300/60 py-5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Your Cellar
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="sumi-serif text-[64px] font-light leading-[0.85] text-stone-900">
                  {stats.totalCount}
                </span>
                <span className="text-[13px] font-medium text-stone-600">
                  {t('bottlesLabel')}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-stone-500">
                kept by {storeName || 'us'}
              </p>
            </div>
            <button className="sumi-text-link group inline-flex items-center gap-1 self-start pt-2">
              ดูทั้งหมด
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        {/* Stats */}
        <div className="mb-7 grid grid-cols-3 gap-0">
          <SumiStat label={t('statTotal')} value={String(stats.inStore + stats.pendingWithdrawal)} />
          <SumiStat label={t('filterExpiring')} value={String(stats.nearExpiry)} accent />
          <SumiStat label={t('filterPendingWithdraw')} value={String(stats.pendingWithdrawal)} />
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search — minimal underline only */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="sumi-input"
          />
        </div>

        {/* Filter — underline tabs (Sumi-style) */}
        <div className="-mx-6 mb-6 overflow-x-auto px-6">
          <div className="flex gap-6 border-b border-stone-300/60">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={
                  'relative -mb-px flex shrink-0 items-center gap-1.5 pb-3 text-[12.5px] font-medium tracking-wide transition-colors ' +
                  (filter === chip.key
                    ? 'text-stone-900'
                    : 'text-stone-400 hover:text-stone-600')
                }
              >
                <span>{chip.label}</span>
                <span
                  className={
                    'rounded-sm px-1 text-[10px] font-bold leading-none ' +
                    (filter === chip.key ? 'text-stone-700' : 'text-stone-400')
                  }
                >
                  {chip.count}
                </span>
                {filter === chip.key && (
                  <span className="absolute inset-x-0 -bottom-px h-[2px] bg-stone-900" />
                )}
              </button>
            ))}
          </div>
        </div>

        {children}

        <div className="mt-8 flex justify-center">
          <TenantLink
            href={`/customer/history${navQuery}`}
            className="sumi-text-link inline-flex items-center gap-1.5 text-[11.5px]"
          >
            <History className="h-3.5 w-3.5" />
            {t('viewHistory')}
          </TenantLink>
        </div>
      </main>

      <TenantLink
        href={`/customer/deposit${navQuery}`}
        className="customer-tap fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 bg-stone-900 px-5 py-3.5 text-sm font-medium tracking-wide text-stone-50 shadow-xl shadow-stone-900/15 transition active:scale-95"
        aria-label={t('ctaDeposit')}
        style={{ borderRadius: '2px' }}
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        <span className="sumi-serif">{t('ctaDeposit')}</span>
      </TenantLink>

      <SumiStyles />
    </div>
  );
}

function SumiStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-l border-stone-300/60 px-4 first:border-l-0 first:pl-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p
        className={
          'sumi-serif mt-1.5 text-[28px] font-light leading-none ' +
          (accent ? 'sumi-accent-text' : 'text-stone-900')
        }
      >
        {value}
        {accent && <span className="sumi-tick" />}
      </p>
    </div>
  );
}

function SumiStyles() {
  return (
    <style jsx global>{`
      .sumi-theme { background: #fbf7ef; color: #1c1917; font-family: 'Inter', system-ui, sans-serif; }
      .sumi-paper {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(ellipse at 80% 0%, rgba(149,115,79,0.05), transparent 60%),
          radial-gradient(ellipse at 0% 100%, rgba(120,53,15,0.04), transparent 60%),
          #fbf7ef;
      }
      .sumi-paper::after {
        content: ''; position: absolute; inset: 0; opacity: 0.5;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      }
      .sumi-serif { font-family: 'Cormorant Garamond', 'Noto Serif JP', 'Playfair Display', Georgia, serif; }
      .sumi-seal {
        display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
        border-radius: 4px; background: #9b2c2c; color: #fbf7ef;
        font-family: 'Noto Serif JP', serif; font-size: 18px; font-weight: 600;
        box-shadow: inset 0 0 0 1.5px #fbf7ef, inset 0 0 0 2.5px #9b2c2c, 0 1px 2px rgba(120,30,30,0.3);
      }
      .sumi-text-link {
        font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em;
        color: #1c1917; padding: 2px 0; border-bottom: 1px solid #1c1917;
        background: transparent; border-top: none; border-left: none; border-right: none; cursor: pointer;
      }
      .sumi-text-link:hover { opacity: 0.7; }
      .sumi-input {
        height: 44px; width: 100%; border: 0; border-bottom: 1px solid #d6d3d1;
        background: transparent; padding: 0 0 0 24px;
        font-size: 14px; color: #1c1917; outline: none; transition: border 0.15s;
      }
      .sumi-input::placeholder { color: #a8a29e; }
      .sumi-input:focus { border-bottom-color: #1c1917; }
      .sumi-accent-text { color: #9b2c2c; position: relative; display: inline-flex; align-items: baseline; }
      .sumi-tick { display: inline-block; margin-left: 4px; height: 5px; width: 5px;
        border-radius: 999px; background: #9b2c2c; }
    `}</style>
  );
}
