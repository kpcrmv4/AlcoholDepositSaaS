'use client';

/**
 * Sumi theme — bottle list. Hairline-separated rows (not boxed cards),
 * black ink line-art bottle, single-pixel progress bar with a notch.
 * Pairs with chrome.tsx (Phase G).
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

export function SumiBottleList({ props }: { props: ThemeViewProps }) {
  const { filtered, searchQuery, requestingId, onWithdraw, onOpenDetail, t } = props;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-stone-300/60 bg-stone-50/40 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200/60 text-stone-500">
          <Wine className="h-6 w-6" />
        </div>
        <p className="text-sm text-stone-500">
          {searchQuery ? t('noSearchResults') : t('noDeposits')}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-stone-300/50">
      {filtered.map((d) => (
        <SumiRow
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

function SumiRow({
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

  const expiryTone =
    days === null
      ? 'text-stone-500'
      : days <= 0
        ? 'text-red-700'
        : days <= 7
          ? 'text-red-600'
          : days <= 30
            ? 'text-amber-700'
            : 'text-stone-600';

  return (
    <li className="py-4">
      <div className="flex items-start gap-4">
        <SumiBottle percent={isPending ? 100 : d.remainingPercent} pending={isPending} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {d.code && (
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500">
                  {d.code}
                </p>
              )}
              <h3 className="sumi-serif mt-0.5 truncate text-[17px] font-medium text-stone-900">
                {d.productName}
              </h3>
            </div>
            <SumiInkChip status={d.status} t={t} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <SumiFillBar percent={d.remainingPercent} />
                <span className="sumi-serif min-w-[34px] text-right text-[13px] font-medium tabular-nums text-stone-900">
                  {d.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">
                  {t('bottlesLabel')} ·{' '}
                  <span className="font-semibold text-stone-700">{d.remainingQty}</span>
                </span>
                <span className={'font-medium ' + expiryTone}>
                  {days === null
                    ? t('noExpiry')
                    : days <= 0
                      ? t('expired')
                      : days === 1
                        ? t('expiresTomorrow')
                        : t('expiresInDays', { days })}
                </span>
              </div>

              <div className="mt-3">
                {isPendingW ? (
                  <div className="flex items-center gap-2 text-[12px] font-medium text-stone-600">
                    <Clock className="h-3.5 w-3.5" />
                    {t('pendingWithdrawal')}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onWithdraw(d)}
                    disabled={!canWithdraw}
                    className="customer-tap inline-flex items-center gap-2 bg-stone-900 px-4 py-2 text-[12px] font-medium tracking-wide text-stone-50 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderRadius: '2px' }}
                  >
                    {isRequesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Package className="h-3.5 w-3.5" />
                    )}
                    {isRequesting ? t('requesting') : t('requestWithdrawal')}
                  </button>
                )}
              </div>
            </>
          ) : d.isRequest ? (
            <button
              type="button"
              onClick={() => onOpenDetail(d)}
              className="customer-tap mt-2 flex items-center gap-2 self-start text-left"
            >
              {d.tableNumber && (
                <span className="border border-stone-300/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-700">
                  โต๊ะ {d.tableNumber}
                </span>
              )}
              <span className="sumi-text-link text-[11px]">{t('tapToCancel')}</span>
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              {d.tableNumber && (
                <span className="border border-stone-300/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-700">
                  โต๊ะ {d.tableNumber}
                </span>
              )}
              <span className="text-[11px] font-medium text-stone-500">
                {t('waitingStaffConfirm')}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SumiFillBar({ percent }: { percent: number }) {
  const w = Math.max(percent, 4);
  return (
    <div className="relative h-[2px] flex-1 bg-stone-300/60">
      <div className="absolute inset-y-0 left-0 bg-stone-900" style={{ width: `${w}%` }} />
      <div className="absolute -top-[3px] h-2 w-px bg-stone-900" style={{ left: `${w}%` }} />
    </div>
  );
}

function SumiBottle({ percent, pending }: { percent: number; pending?: boolean }) {
  const fill = Math.max(percent, 6);
  return (
    <div className="relative h-[64px] w-[36px] shrink-0">
      <svg viewBox="0 0 36 64" className="h-full w-full">
        <defs>
          <clipPath id={`sumi-clip-${fill}`}>
            <path d="M13 4 h10 v10 c0 2 5 3 5 10 v32 c0 3 -2 4 -5 4 h-10 c-3 0 -5 -1 -5 -4 v-32 c0 -7 5 -8 5 -10 z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#sumi-clip-${fill})`}>
          <rect
            x="0" y={64 - (fill / 100) * 50} width="36" height="64"
            fill={pending ? '#d4d0c5' : '#2c2823'}
            opacity={pending ? '0.4' : '0.85'}
          />
        </g>
        <path
          d="M13 4 h10 v10 c0 2 5 3 5 10 v32 c0 3 -2 4 -5 4 h-10 c-3 0 -5 -1 -5 -4 v-32 c0 -7 5 -8 5 -10 z"
          fill="none" stroke="#1c1917" strokeWidth="1.2" strokeLinejoin="round"
        />
        <rect x="14" y="2" width="8" height="4" fill="#1c1917" />
        <rect x="9" y="32" width="18" height="14" fill="#fbf7ef" stroke="#1c1917" strokeWidth="0.8" />
        <line x1="11" y1="37" x2="25" y2="37" stroke="#1c1917" strokeWidth="0.5" />
        <line x1="11" y1="40" x2="22" y2="40" stroke="#1c1917" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function SumiInkChip({ status, t }: { status: string; t: ThemeViewProps['t'] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending_confirm: {
      label: t('pendingStaff'),
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-amber-700/40 text-amber-800 bg-amber-50',
    },
    pending_withdrawal: {
      label: t('pendingWithdrawal'),
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-stone-700/40 text-stone-700 bg-stone-100',
    },
    expired: {
      label: t('expired'),
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-red-700/40 text-red-700 bg-red-50',
    },
    in_store: {
      label: t('inStore'),
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-stone-300 text-stone-600 bg-transparent',
    },
  };
  const it = map[status] ?? map.in_store;
  return (
    <span className={'inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ' + it.cls}>
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
