'use client';

/**
 * Amber theme — bottle list. Renders the deposit cards using the amber
 * palette (warm whiskey hues, cream label, gold fill bar). Pairs with
 * `chrome.tsx` (Phase C) which provides header/hero/filter/fab.
 *
 * Status statuses (4): pending_confirm | in_store | pending_withdrawal | expired
 */

import {
  Wine,
  Clock,
  Hourglass,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { ThemeViewProps, DepositItem } from '../types';

export function AmberBottleList({ props }: { props: ThemeViewProps }) {
  const { filtered, searchQuery, onOpenDetail, t } = props;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-amber-200/15 bg-amber-200/[0.03] px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200/10 text-amber-200/55">
          <Wine className="h-6 w-6" />
        </div>
        <p className="text-sm text-amber-200/65">
          {searchQuery ? t('noSearchResults') : t('noDeposits')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {filtered.map((d) => (
        <AmberCard key={d.id} d={d} onOpenDetail={onOpenDetail} t={t} />
      ))}
    </ul>
  );
}

function AmberCard({
  d,
  onOpenDetail,
  t,
}: {
  d: DepositItem;
  onOpenDetail: (d: DepositItem) => void;
  t: ThemeViewProps['t'];
}) {
  const days = d.expiryDate ? daysUntil(d.expiryDate) : null;
  const isPending = d.status === 'pending_confirm';
  const isPendingW = d.status === 'pending_withdrawal';

  const expiryTone =
    days === null
      ? 'text-amber-200/55'
      : days <= 0
        ? 'text-rose-300'
        : days <= 7
          ? 'text-rose-300'
          : days <= 30
            ? 'text-amber-300'
            : 'text-emerald-300/85';

  // ALL pending_confirm rows open the detail modal on tap. The modal
  // (in page.tsx) decides whether to render a Cancel button — only
  // deposit_requests (d.isRequest=true) get one; real deposits in
  // pending_confirm get info + close.
  if (isPending) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onOpenDetail(d)}
          className="customer-tap w-full overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-b from-amber-950/70 to-[#1a130d] p-3.5 text-left shadow-lg shadow-black/30 transition hover:border-amber-300/40"
        >
          <div className="flex gap-3">
            <AmberBottleSvg hue="#7a3b0f" percent={100} pending />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="amber-serif truncate text-[15px] font-semibold text-amber-50">
                    {d.productName}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {d.tableNumber && (
                      <span className="rounded-md bg-amber-200/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200/85">
                        โต๊ะ {d.tableNumber}
                      </span>
                    )}
                  </div>
                </div>
                <AmberStatusChip status="pending_confirm" t={t} />
              </div>
              <p className="mt-2 text-[11px] text-amber-300/80">
                {d.isRequest ? t('tapToCancel') : t('tapToView')}
              </p>
            </div>
          </div>
        </button>
      </li>
    );
  }

  // Tappable card — opens detail modal. Withdraw / cancel actions live
  // inside the modal, not on the card.
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenDetail(d)}
        className="customer-tap w-full overflow-hidden rounded-2xl border border-amber-200/10 bg-gradient-to-b from-[#1c150f] to-[#13100c] p-3.5 text-left shadow-lg shadow-black/30 transition hover:border-amber-200/25"
      >
        <div className="flex gap-3">
          <AmberBottleSvg hue="#a06b32" percent={d.remainingPercent} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="amber-serif truncate text-[15px] font-semibold text-amber-50">
                  {d.productName}
                </h3>
                {d.code && (
                  <span className="mt-0.5 inline-block font-mono text-[10.5px] text-amber-200/40">
                    {d.code}
                  </span>
                )}
              </div>
              <AmberStatusChip status={d.status} t={t} />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <AmberFillBar percent={d.remainingPercent} />
              <span className="amber-serif min-w-[34px] text-right text-[12px] font-semibold text-amber-100">
                {d.remainingPercent}%
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-amber-200/55">
                {t('bottlesLabel')} ·{' '}
                <span className="font-semibold text-amber-100/85">{d.remainingQty}</span>
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

            <p className="mt-2 text-[10.5px] font-medium text-amber-200/55">
              {isPendingW ? t('pendingWithdrawal') : t('tapToView')}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

function AmberFillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-amber-950/60 ring-1 ring-inset ring-amber-200/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 shadow-[0_0_8px_rgba(245,180,90,0.5)]"
        style={{ width: `${Math.max(percent, 4)}%` }}
      />
    </div>
  );
}

function AmberBottleSvg({
  hue,
  percent,
  pending,
}: {
  hue: string;
  percent: number;
  pending?: boolean;
}) {
  const fill = pending ? 100 : Math.max(percent, 6);
  const clipId = `amb-clip-${fill}-${hue.slice(1)}`;
  const gradId = `amb-grad-${hue.slice(1)}`;
  return (
    <div className="relative h-[78px] w-[44px] shrink-0 self-center">
      <svg viewBox="0 0 44 78" className="h-full w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={hue} stopOpacity="0.95" />
            <stop offset="1" stopColor={hue} stopOpacity="0.5" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M16 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y={78 - (fill / 100) * 60} width="44" height="78" fill={`url(#${gradId})`} />
        </g>
        <path
          d="M16 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z"
          fill="none"
          stroke="rgba(245, 200, 130, 0.35)"
          strokeWidth="1"
        />
        <rect x="17" y="2" width="10" height="5" rx="1" fill="#1a1108" stroke="rgba(245, 200, 130, 0.4)" />
        <rect x="11" y="38" width="22" height="20" rx="1" fill="rgba(250, 240, 220, 0.92)" />
        <line x1="13" y1="44" x2="31" y2="44" stroke="#1a1108" strokeWidth="0.6" />
        <line x1="13" y1="48" x2="27" y2="48" stroke="#1a1108" strokeWidth="0.4" />
        <line x1="13" y1="52" x2="29" y2="52" stroke="#1a1108" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function AmberStatusChip({ status, t }: { status: string; t: ThemeViewProps['t'] }) {
  if (status === 'pending_confirm')
    return (
      <Chip cls="border-amber-300/30 bg-amber-300/10 text-amber-200">
        <Hourglass className="h-2.5 w-2.5" /> {t('pendingStaff')}
      </Chip>
    );
  if (status === 'pending_withdrawal')
    return (
      <Chip cls="border-sky-300/25 bg-sky-300/10 text-sky-200">
        <Clock className="h-2.5 w-2.5" /> {t('pendingWithdrawal')}
      </Chip>
    );
  if (status === 'expired')
    return (
      <Chip cls="border-rose-300/30 bg-rose-300/10 text-rose-200">
        <AlertCircle className="h-2.5 w-2.5" /> {t('expired')}
      </Chip>
    );
  return (
    <Chip cls="border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
      <CheckCircle2 className="h-2.5 w-2.5" /> {t('inStore')}
    </Chip>
  );
}

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
        cls
      }
    >
      {children}
    </span>
  );
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
