'use client';

/**
 * Crimson theme — bottle list. Cream paper cards floating on the wine
 * background. Hand-drawn wine-bottle SVG (different shape from the
 * whiskey bottle the other themes use). Pairs with chrome.tsx (Phase N2).
 */

import {
  Wine,
  Package,
  Clock,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ThemeViewProps, DepositItem } from '../types';

export function CrimsonBottleList({ props }: { props: ThemeViewProps }) {
  const { filtered, searchQuery, requestingId, onWithdraw, onOpenDetail, t } = props;

  if (filtered.length === 0) {
    return (
      <div className="theme-surface flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7a1a1a]/8">
          <Wine className="h-6 w-6 text-[#7a1a1a]/65" />
        </div>
        <p className="crimson-script text-[16px] text-[#7a1a1a]/75">
          {searchQuery ? t('noSearchResults') : t('noDeposits')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((d) => (
        <CrimsonCard
          key={d.id}
          d={d}
          isRequesting={requestingId === d.id}
          onWithdraw={onWithdraw}
          onOpenDetail={onOpenDetail}
          t={t}
        />
      ))}
    </ul>
  );
}

function CrimsonCard({
  d,
  isRequesting,
  onWithdraw,
  onOpenDetail,
  t,
}: {
  d: DepositItem;
  isRequesting: boolean;
  onWithdraw: (d: DepositItem) => void;
  onOpenDetail: (d: DepositItem) => void;
  t: ThemeViewProps['t'];
}) {
  const days = d.expiryDate ? daysUntil(d.expiryDate) : null;
  const isPending = d.status === 'pending_confirm';
  const isPendingW = d.status === 'pending_withdrawal';
  const isInStore = d.status === 'in_store';
  const canWithdraw = isInStore && !isRequesting;
  // ALL pending_confirm rows open the detail modal on tap. Modal then
  // shows a Cancel button only when d.isRequest is true (deposit_request
  // the customer can pull back); real deposits get info + close-only.

  const expiryTone =
    days === null
      ? 'text-[#7a1a1a]/55'
      : days <= 0
        ? 'text-rose-700'
        : days <= 7
          ? 'text-rose-700'
          : days <= 30
            ? 'text-amber-700'
            : 'text-emerald-700';

  const cardCls =
    'theme-surface relative overflow-hidden p-3.5 shadow-md shadow-black/15';

  const inner = (
    <>
      {/* Subtle hand-drawn bracket on the corner */}
      <svg
        viewBox="0 0 60 30"
        className="pointer-events-none absolute right-2 top-2 h-6 w-12 opacity-25"
        aria-hidden
      >
        <path
          d="M2 28 Q 30 6, 58 28"
          fill="none"
          stroke="#7a1a1a"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex gap-3">
        <CrimsonBottle pending={isPending} percent={isPending ? 100 : d.remainingPercent} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#7a1a1a]/55">
                {d.code || (isPending ? 'PENDING' : '')}
              </p>
              <h3 className="crimson-display mt-0.5 truncate text-[16px] font-bold text-[#3d0a0a]">
                {d.productName}
              </h3>
            </div>
            <CrimsonChip status={d.status} t={t} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-2.5 flex items-center gap-2.5">
                <CrimsonFillBar percent={d.remainingPercent} />
                <span className="crimson-display min-w-[36px] text-right text-[13px] font-bold text-[#3d0a0a]">
                  {d.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-[#7a1a1a]/65">
                  {t('bottlesLabel')}{' '}
                  <span className="crimson-display font-bold text-[#3d0a0a]">
                    {d.remainingQty}
                  </span>
                </span>
                <span className={'crimson-script text-[14px] leading-none ' + expiryTone}>
                  {days === null
                    ? t('noExpiry')
                    : days <= 0
                      ? t('expired')
                      : days === 1
                        ? t('expiresTomorrow')
                        : t('expiresInDays', { days })}
                </span>
              </div>

              {isInStore ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWithdraw(d);
                  }}
                  disabled={!canWithdraw}
                  className="customer-tap mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#7a1a1a] py-2 text-[12px] font-bold text-[#faf3e8] shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRequesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Package className="h-3.5 w-3.5" />
                  )}
                  {isRequesting ? t('requesting') : t('requestWithdrawal')}
                </button>
              ) : (
                <p className="crimson-script mt-2 text-[13px] leading-none text-[#7a1a1a]/65">
                  {isPendingW ? t('pendingWithdrawal') : t('tapToView')}
                </p>
              )}
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              {d.tableNumber && (
                <span className="rounded-sm border border-[#7a1a1a]/30 bg-[#faf3e8] px-1.5 py-0.5 text-[10px] font-bold text-[#7a1a1a]">
                  โต๊ะ {d.tableNumber}
                </span>
              )}
              <span className="crimson-script text-[13px] text-[#7a1a1a]/75">
                {d.isRequest ? t('tapToCancel') : t('tapToView')}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Whole card → modal. in_store rows include an inline ขอเบิก button
  // (with stopPropagation). div+role=button keeps HTML valid.
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(d)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail(d);
          }
        }}
        className={'customer-tap customer-focus-ring w-full cursor-pointer text-left ' + cardCls}
      >
        {inner}
      </div>
    </li>
  );
}

function CrimsonBottle({ pending, percent }: { pending?: boolean; percent: number }) {
  const fill = Math.max(percent, 6);
  // Wine-bottle silhouette: long neck, sloped shoulder, straight body.
  return (
    <div className="relative h-[80px] w-[40px] shrink-0 self-center">
      <svg viewBox="0 0 40 80" className="h-full w-full">
        <defs>
          <linearGradient id={`crim-g-${fill}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={pending ? '#7a1a1a' : '#3d0a0a'} stopOpacity="0.85" />
            <stop offset="1" stopColor={pending ? '#a52a2a' : '#7a1a1a'} stopOpacity="0.65" />
          </linearGradient>
          <clipPath id={`crim-clip-${fill}`}>
            <path d="M16 4 h8 v18 c0 3 5 6 5 14 v34 c0 3 -2 5 -5 5 h-8 c-3 0 -5 -2 -5 -5 v-34 c0 -8 5 -11 5 -14 z" />
          </clipPath>
        </defs>
        {/* Wine fill */}
        <g clipPath={`url(#crim-clip-${fill})`}>
          <rect x="0" y={80 - (fill / 100) * 56} width="40" height="80" fill={`url(#crim-g-${fill})`} />
        </g>
        {/* Bottle outline (hand-drawn-ish wobble via stroke-linejoin round) */}
        <path
          d="M16 4 h8 v18 c0 3 5 6 5 14 v34 c0 3 -2 5 -5 5 h-8 c-3 0 -5 -2 -5 -5 v-34 c0 -8 5 -11 5 -14 z"
          fill="none"
          stroke="#3d0a0a"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Foil cap */}
        <rect x="16" y="2" width="8" height="6" fill="#3d0a0a" />
        {/* Cream label band */}
        <rect x="9" y="44" width="22" height="20" fill="#faf3e8" stroke="#3d0a0a" strokeWidth="0.7" />
        {/* Hand-drawn label content */}
        <text
          x="20"
          y="55"
          textAnchor="middle"
          fontFamily="'Caveat', cursive"
          fontSize="9"
          fill="#7a1a1a"
        >
          v
        </text>
        <line x1="11" y1="60" x2="29" y2="60" stroke="#7a1a1a" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function CrimsonFillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#7a1a1a]/15">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(percent, 4)}%`,
          background: 'linear-gradient(90deg, #7a1a1a 0%, #a52a2a 100%)',
        }}
      />
    </div>
  );
}

function CrimsonChip({ status, t }: { status: string; t: ThemeViewProps['t'] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending_confirm: {
      label: t('pendingStaff'),
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-amber-700/40 text-amber-800 bg-amber-50',
    },
    pending_withdrawal: {
      label: t('pendingWithdrawal'),
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-[#7a1a1a]/40 text-[#7a1a1a] bg-[#faf3e8]',
    },
    expired: {
      label: t('expired'),
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-red-800/50 text-red-800 bg-red-50',
    },
    in_store: {
      label: t('inStore'),
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-emerald-700/40 text-emerald-800 bg-emerald-50',
    },
  };
  const it = map[status] ?? map.in_store;
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ' +
        it.cls
      }
    >
      {it.icon}
      {it.label}
    </span>
  );
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
