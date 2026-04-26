'use client';

/**
 * Sunset theme — bottle list. Soft white cards with warm sunset edge
 * glow + tropical bottle SVG (sun on the label). Pairs with chrome.tsx
 * (Phase I).
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

const STATUS_LIQUID: Record<string, string> = {
  pending_confirm: '#d97706',
  pending_withdrawal: '#92400e',
  expired: '#9f1239',
  in_store: '#ea580c',
};

export function SunsetBottleList({ props }: { props: ThemeViewProps }) {
  const { filtered, searchQuery, requestingId, onWithdraw, onOpenDetail, t } = props;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/85 bg-white/55 px-6 py-10 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-200/70 text-orange-700">
          <Wine className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-orange-900/65">
          {searchQuery ? t('noSearchResults') : t('noDeposits')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((d) => (
        <SunsetCard
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

function SunsetCard({
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
  const liquid = STATUS_LIQUID[d.status] ?? '#ea580c';

  const expiryTone =
    days === null
      ? 'text-orange-800/55'
      : days <= 0
        ? 'text-red-700'
        : days <= 7
          ? 'text-rose-600'
          : days <= 30
            ? 'text-amber-700'
            : 'text-teal-700';

  const wrapperBase =
    'relative overflow-hidden rounded-[22px] border bg-white p-3.5 shadow-md shadow-orange-200/40 ';
  const wrapperCls = isPending
    ? wrapperBase + 'border-amber-300/70 bg-amber-50/85'
    : wrapperBase + 'border-white';

  const bodyContent = (
    <>
      {/* Soft sunset edge */}
      <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-200/60 to-transparent blur-2xl" />
      <div className="relative flex gap-3">
        <SunsetBottle liquid={liquid} percent={isPending ? 100 : d.remainingPercent} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {d.code && (
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-orange-700/55">
                  {d.code}
                </p>
              )}
              <h3 className="sunset-display mt-0.5 truncate text-[16px] font-black text-orange-950">
                {d.productName}
              </h3>
            </div>
            <SunsetChip status={d.status} t={t} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-2.5 flex items-center gap-2.5">
                <SunsetFillBar percent={d.remainingPercent} />
                <span className="sunset-display min-w-[36px] text-right text-[13px] font-black text-orange-950">
                  {d.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-orange-900/55">
                  {t('bottlesLabel')}{' '}
                  <span className="text-orange-950">{d.remainingQty}</span>
                </span>
                <span className={'font-bold ' + expiryTone}>
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
                  className="customer-tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-2 text-[12px] font-black text-white shadow-md shadow-orange-400/40 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRequesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Package className="h-3.5 w-3.5" />
                  )}
                  {isRequesting ? t('requesting') : t('requestWithdrawal')}
                </button>
              ) : (
                <p className="mt-2 text-[10.5px] font-semibold text-orange-900/55">
                  {isPendingW ? t('pendingWithdrawal') : t('tapToView')}
                </p>
              )}
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              {d.tableNumber && (
                <span className="rounded-full border border-amber-400/60 bg-white/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  โต๊ะ {d.tableNumber}
                </span>
              )}
              <span className="font-medium text-[10.5px] text-orange-900/65">
                {d.isRequest ? t('tapToCancel') : t('tapToView')}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Whole card is the tap target → opens the detail modal. in_store rows
  // also include an inline 'ขอเบิก' button (with stopPropagation) as a
  // fast path; div+role=button avoids invalid nested buttons.
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
        className={'customer-tap customer-focus-ring w-full cursor-pointer text-left ' + wrapperCls}
      >
        {bodyContent}
      </div>
    </li>
  );
}

function SunsetBottle({ liquid, percent }: { liquid: string; percent: number }) {
  const fill = Math.max(percent, 6);
  const id = liquid.replace(/[^a-z0-9]/gi, '');
  return (
    <div className="relative h-[78px] w-[42px] shrink-0 self-center">
      <div className="absolute -inset-1 rounded-full opacity-30 blur-xl" style={{ background: liquid }} />
      <svg viewBox="0 0 42 78" className="relative h-full w-full">
        <defs>
          <linearGradient id={`sun-g-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liquid} stopOpacity="1" />
            <stop offset="1" stopColor={liquid} stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={`sun-clip-${fill}-${id}`}>
            <path d="M15 4 h12 v13 c0 2 6 4 6 11 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -7 6 -9 6 -11 z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#sun-clip-${fill}-${id})`}>
          <rect x="0" y={78 - (fill / 100) * 60} width="42" height="78" fill={`url(#sun-g-${id})`} />
        </g>
        <path
          d="M15 4 h12 v13 c0 2 6 4 6 11 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -7 6 -9 6 -11 z"
          fill="none" stroke="#7c2d12" strokeWidth="1.2" strokeLinejoin="round"
        />
        <rect x="16" y="2" width="10" height="5" rx="1.5" fill="#7c2d12" />
        <rect x="11" y="38" width="20" height="18" rx="2" fill="#fff7ed" stroke="#7c2d12" strokeWidth="0.6" />
        <circle cx="21" cy="44" r="2.5" fill="#f97316" />
        <line x1="13" y1="50" x2="29" y2="50" stroke="#7c2d12" strokeWidth="0.4" />
        <line x1="14" y1="53" x2="28" y2="53" stroke="#7c2d12" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function SunsetFillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-amber-400 shadow-sm"
        style={{ width: `${Math.max(percent, 4)}%` }}
      />
    </div>
  );
}

function SunsetChip({ status, t }: { status: string; t: ThemeViewProps['t'] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending_confirm: {
      label: t('pendingStaff'),
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-amber-400/60 bg-amber-100 text-amber-800',
    },
    pending_withdrawal: {
      label: t('pendingWithdrawal'),
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-teal-400/60 bg-teal-100 text-teal-800',
    },
    expired: {
      label: t('expired'),
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-red-400/60 bg-red-100 text-red-800',
    },
    in_store: {
      label: t('inStore'),
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-emerald-400/60 bg-emerald-100 text-emerald-800',
    },
  };
  const it = map[status] ?? map.in_store;
  return (
    <span className={'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ' + it.cls}>
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
