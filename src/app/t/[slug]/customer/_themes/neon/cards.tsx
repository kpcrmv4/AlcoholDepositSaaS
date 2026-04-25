'use client';

/**
 * Neon theme — bottle list. Glass cards with neon glow halos behind each
 * bottle. Pairs with chrome.tsx (Phase E).
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

const STATUS_GLOW: Record<string, string> = {
  pending_confirm: '#f25f4c',
  pending_withdrawal: '#5cd6ff',
  expired: '#f25f4c',
  in_store: '#a786df',
};

export function NeonBottleList({ props }: { props: ThemeViewProps }) {
  const { filtered, searchQuery, requestingId, onWithdraw, onOpenDetail, t } = props;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0d0b1a]/60 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-300">
          <Wine className="h-6 w-6" />
        </div>
        <p className="text-sm text-violet-200/65">
          {searchQuery ? t('noSearchResults') : t('noDeposits')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((d) => (
        <NeonCard
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

function NeonCard({
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
  const glow = STATUS_GLOW[d.status] ?? '#a786df';

  const expiryTone =
    days === null
      ? 'text-violet-200/55'
      : days <= 0 || days <= 7
        ? 'text-rose-300'
        : days <= 30
          ? 'text-amber-300'
          : 'text-cyan-300';

  if (isPending) {
    return (
      <li className="relative">
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-50 blur-md"
          style={{ background: `radial-gradient(60% 60% at 30% 50%, ${glow}38, transparent 70%)` }}
        />
        <button
          type="button"
          onClick={() => onOpenDetail(d)}
          className="customer-tap relative w-full overflow-hidden rounded-2xl border border-rose-400/25 bg-[#0d0b1a]/85 p-3.5 text-left ring-1 ring-rose-400/10 backdrop-blur-sm"
        >
          <div className="flex gap-3">
            <NeonBottle glow={glow} percent={100} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/45">
                    {d.storeName || ''}
                  </p>
                  <h3 className="neon-display mt-0.5 truncate text-[15px] font-bold text-white">
                    {d.productName}
                  </h3>
                </div>
                <NeonStatusChip status="pending_confirm" t={t} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {d.tableNumber && (
                  <span className="rounded-md border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                    โต๊ะ {d.tableNumber}
                  </span>
                )}
                <span className="font-mono text-[10.5px] text-violet-200/35">
                  แตะเพื่อยกเลิก
                </span>
              </div>
            </div>
          </div>
        </button>
      </li>
    );
  }

  return (
    <li className="relative">
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-50 blur-md"
        style={{ background: `radial-gradient(60% 60% at 30% 50%, ${glow}38, transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0b1a]/85 p-3.5 backdrop-blur-sm">
        <div className="flex gap-3">
          <NeonBottle glow={glow} percent={d.remainingPercent} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {d.code && (
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-violet-200/40">
                    {d.code}
                  </p>
                )}
                <h3 className="neon-display mt-0.5 truncate text-[15px] font-bold text-white">
                  {d.productName}
                </h3>
              </div>
              <NeonStatusChip status={d.status} t={t} />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <NeonFillBar percent={d.remainingPercent} glow={glow} />
              <span className="neon-display min-w-[36px] text-right text-[12px] font-bold text-white">
                {d.remainingPercent}%
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-violet-200/55">
                {t('bottlesLabel')}{' '}
                <span className="font-bold text-white/85">{d.remainingQty}</span>
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

            <div className="mt-3">
              {isPendingW ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[12px] font-bold text-cyan-200">
                  <Clock className="h-3.5 w-3.5" />
                  {t('pendingWithdrawal')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onWithdraw(d)}
                  disabled={!canWithdraw}
                  className="customer-tap flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-3 py-2 text-[12px] font-black text-white shadow-[0_0_18px_rgba(232,121,249,0.45)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </div>
      </div>
    </li>
  );
}

function NeonBottle({ glow, percent }: { glow: string; percent: number }) {
  const fill = Math.max(percent, 6);
  const id = glow.replace(/[^a-z0-9]/gi, '');
  return (
    <div className="relative h-[80px] w-[42px] shrink-0 self-center">
      <div className="absolute inset-0 rounded-full blur-xl" style={{ background: glow, opacity: 0.35 }} />
      <svg viewBox="0 0 42 80" className="relative h-full w-full">
        <defs>
          <linearGradient id={`ng-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={glow} stopOpacity="0.95" />
            <stop offset="1" stopColor={glow} stopOpacity="0.55" />
          </linearGradient>
          <clipPath id={`nclip-${fill}-${id}`}>
            <path d="M15 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#nclip-${fill}-${id})`}>
          <rect x="0" y={80 - (fill / 100) * 60} width="42" height="80" fill={`url(#ng-${id})`} />
        </g>
        <path
          d="M15 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z"
          fill="none" stroke={glow} strokeWidth="1" opacity="0.85"
        />
        <rect x="16" y="2" width="10" height="5" rx="1" fill="#1a1832" stroke={glow} strokeWidth="0.6" />
        <rect x="11" y="40" width="20" height="18" rx="1" fill="rgba(13, 11, 26, 0.85)"
              stroke={glow} strokeOpacity="0.4" strokeWidth="0.5" />
        <line x1="13" y1="46" x2="29" y2="46" stroke={glow} strokeWidth="0.5" opacity="0.7" />
      </svg>
    </div>
  );
}

function NeonFillBar({ percent, glow }: { percent: number; glow: string }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(percent, 4)}%`,
          background: `linear-gradient(90deg, ${glow}, #fff)`,
          boxShadow: `0 0 12px ${glow}`,
        }}
      />
    </div>
  );
}

function NeonStatusChip({ status, t }: { status: string; t: ThemeViewProps['t'] }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending_confirm: {
      label: t('pendingStaff'),
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
    },
    pending_withdrawal: {
      label: t('pendingWithdrawal'),
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200',
    },
    expired: {
      label: t('expired'),
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-rose-400/35 bg-rose-500/15 text-rose-200',
    },
    in_store: {
      label: t('inStore'),
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
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
