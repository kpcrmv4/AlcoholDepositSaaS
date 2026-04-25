'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TenantLink as Link } from '@/lib/tenant/link';
import { useCustomerAuth } from './_components/customer-provider';
import { formatNumber, daysUntil } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  Search,
  Wine,
  Clock,
  Package,
  Loader2,
  AlertCircle,
  Hourglass,
  CheckCircle2,
  X,
  Plus,
  History,
  TrendingDown,
  Boxes,
} from 'lucide-react';

interface DepositItem {
  id: string;
  code: string;
  productName: string;
  remainingPercent: number;
  remainingQty: number;
  expiryDate: string | null;
  status: string;
  storeName: string;
  depositDate: string;
  storeId: string | null;
}

type FilterKey = 'all' | 'pending' | 'in_store' | 'pending_withdrawal' | 'expiring';

const NEAR_EXPIRY_DAYS = 7;

export default function CustomerPage() {
  const {
    lineUserId,
    displayName,
    mode,
    isLoading: authLoading,
    error: authError,
    store,
  } = useCustomerAuth();
  const searchParams = useSearchParams();
  const t = useTranslations('customer.home');

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  // Preserve LIFF/token query across links
  const navQuery = useMemo(() => {
    const token = searchParams.get('token');
    const storeCode = searchParams.get('store');
    const parts: string[] = [];
    if (token) parts.push(`token=${encodeURIComponent(token)}`);
    if (storeCode) parts.push(`store=${encodeURIComponent(storeCode)}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [searchParams]);

  const getAuthPayload = useCallback(() => {
    if (mode === 'token') {
      const token = searchParams.get('token');
      return { token };
    }
    return { accessToken: sessionStorage.getItem('liff_access_token') };
  }, [mode, searchParams]);

  const loadDeposits = useCallback(async () => {
    if (!lineUserId) return;
    setIsLoading(true);

    try {
      const auth = getAuthPayload();
      let res: Response;

      if (auth.token) {
        const qs = new URLSearchParams({ token: auth.token });
        if (store.id) qs.set('storeId', store.id);
        else if (store.code) qs.set('storeCode', store.code);
        res = await fetch(`/api/customer/deposits?${qs.toString()}`);
      } else if (auth.accessToken) {
        res = await fetch('/api/customer/deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: auth.accessToken,
            storeId: store.id ?? null,
            storeCode: store.code ?? null,
          }),
        });
      } else {
        setError(t('loadError'));
        setIsLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setDeposits(mapDeposits(data.deposits));
      } else {
        setError(t('loadError'));
      }
    } catch {
      setError(t('loadError'));
    }

    setIsLoading(false);
  }, [lineUserId, getAuthPayload, t, store.id, store.code]);

  useEffect(() => {
    if (lineUserId) {
      loadDeposits();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [lineUserId, authLoading, loadDeposits]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapDeposits(raw: any[]): DepositItem[] {
    return raw.map((d) => ({
      id: d.id,
      code: d.deposit_code,
      productName: d.product_name,
      remainingPercent: d.remaining_percent ?? 0,
      remainingQty: d.remaining_qty ?? 0,
      expiryDate: d.expiry_date,
      status: d.status,
      storeName: d.store?.store_name || '',
      depositDate: d.created_at,
      storeId: d.store_id || null,
    }));
  }

  const handleRequestWithdrawal = async (deposit: DepositItem) => {
    setRequestingId(deposit.id);
    setError(null);

    try {
      const auth = getAuthPayload();
      const res = await fetch('/api/customer/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: deposit.id,
          customerName: displayName || 'ลูกค้า',
          token: auth.token || undefined,
          accessToken: auth.accessToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Request failed');
      }

      setDeposits((prev) =>
        prev.map((d) =>
          d.id === deposit.id ? { ...d, status: 'pending_withdrawal' } : d,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg && msg !== 'Request failed' ? `${t('withdrawError')} (${msg})` : t('withdrawError'),
      );
    } finally {
      setRequestingId(null);
    }
  };

  // ----------------------------------------------------------------------
  // Stats / filters
  // ----------------------------------------------------------------------
  const stats = useMemo(() => {
    let total = 0;
    let nearExpiry = 0;
    let pending = 0;
    let pendingWithdrawal = 0;
    let inStore = 0;

    for (const d of deposits) {
      if (d.status === 'pending_confirm') pending++;
      else if (d.status === 'pending_withdrawal') {
        pendingWithdrawal++;
        total += d.remainingQty || 0;
      } else if (d.status === 'in_store') {
        inStore++;
        total += d.remainingQty || 0;
      }
      if (d.expiryDate && d.status !== 'pending_confirm') {
        const days = daysUntil(d.expiryDate);
        if (days >= 0 && days <= NEAR_EXPIRY_DAYS) nearExpiry++;
      }
    }
    return { total, nearExpiry, pending, pendingWithdrawal, inStore };
  }, [deposits]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = deposits;
    if (filter === 'pending') {
      list = list.filter((d) => d.status === 'pending_confirm');
    } else if (filter === 'in_store') {
      list = list.filter((d) => d.status === 'in_store');
    } else if (filter === 'pending_withdrawal') {
      list = list.filter((d) => d.status === 'pending_withdrawal');
    } else if (filter === 'expiring') {
      list = list.filter((d) => {
        if (!d.expiryDate || d.status === 'pending_confirm') return false;
        const days = daysUntil(d.expiryDate);
        return days >= 0 && days <= NEAR_EXPIRY_DAYS;
      });
    }

    if (q) {
      list = list.filter(
        (d) =>
          d.code.toLowerCase().includes(q) ||
          d.productName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [deposits, filter, searchQuery]);

  // ----------------------------------------------------------------------
  // Loading / error states
  // ----------------------------------------------------------------------
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{authError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="customer-tap customer-focus-ring rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: t('filterAll'), count: deposits.length },
    { key: 'pending', label: t('filterPending'), count: stats.pending },
    { key: 'in_store', label: t('filterInStore'), count: stats.inStore },
    { key: 'pending_withdrawal', label: t('filterPendingWithdraw'), count: stats.pendingWithdrawal },
    { key: 'expiring', label: t('filterExpiring'), count: stats.nearExpiry },
  ];

  return (
    <div className="px-4 pb-8 pt-4">
      {/* Greeting */}
      {displayName && (
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('welcomeBack')}
          </p>
          <h2 className="mt-0.5 text-lg font-bold leading-tight text-slate-900 dark:text-slate-50">
            {displayName}
          </h2>
        </div>
      )}

      {/* Stats hero */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatCard
          label={t('statTotal')}
          value={formatNumber(stats.total)}
          icon={<Boxes className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label={t('statNearExpiry', { days: NEAR_EXPIRY_DAYS })}
          value={String(stats.nearExpiry)}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label={t('statPending')}
          value={String(stats.pending + stats.pendingWithdrawal)}
          icon={<Hourglass className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      {/* Primary CTA */}
      <Link
        href={`/customer/deposit${navQuery}`}
        className="customer-tap customer-focus-ring mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-500/25 transition-transform active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        <span>{t('ctaDeposit')}</span>
      </Link>

      {/* Error banner */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="customer-focus-ring h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="-mx-4 mb-3 overflow-x-auto px-4 pb-1">
        <div className="flex gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={cn(
                'customer-tap customer-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === chip.key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800',
              )}
            >
              <span>{chip.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  filter === chip.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <section className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/40 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Wine className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchQuery ? t('noSearchResults') : t('noDeposits')}
            </p>
          </div>
        ) : (
          filtered.map((deposit) => (
            <DepositCard
              key={deposit.id}
              deposit={deposit}
              isRequesting={requestingId === deposit.id}
              onWithdraw={handleRequestWithdrawal}
            />
          ))
        )}
      </section>

      {/* Footer link to history */}
      <div className="mt-6 flex justify-center">
        <Link
          href={`/customer/history${navQuery}`}
          className="customer-tap customer-focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <History className="h-3.5 w-3.5" />
          {t('viewHistory')}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'indigo' | 'amber' | 'slate';
}) {
  const toneClasses = {
    indigo:
      'from-indigo-50 to-white text-indigo-600 dark:from-indigo-950/40 dark:to-slate-900 dark:text-indigo-400',
    amber:
      'from-amber-50 to-white text-amber-600 dark:from-amber-950/30 dark:to-slate-900 dark:text-amber-400',
    slate:
      'from-slate-100 to-white text-slate-600 dark:from-slate-800/40 dark:to-slate-900 dark:text-slate-300',
  }[tone];

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl border border-slate-200 bg-gradient-to-br p-3 shadow-sm dark:border-slate-800',
        toneClasses,
      )}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <span className="text-xl font-bold leading-none text-slate-900 dark:text-slate-50">
        {value}
      </span>
    </div>
  );
}

function DepositCard({
  deposit,
  isRequesting,
  onWithdraw,
}: {
  deposit: DepositItem;
  isRequesting: boolean;
  onWithdraw: (d: DepositItem) => void;
}) {
  const t = useTranslations('customer.home');
  const days = deposit.expiryDate ? daysUntil(deposit.expiryDate) : null;
  const isPendingConfirm = deposit.status === 'pending_confirm';
  const isPendingWithdrawal = deposit.status === 'pending_withdrawal';
  const isInStore = deposit.status === 'in_store';
  const canWithdraw = isInStore && !isRequesting;

  const expiryTone =
    days === null
      ? 'text-slate-500 dark:text-slate-400'
      : days <= 0
        ? 'text-red-600 dark:text-red-400'
        : days <= 7
          ? 'text-red-500 dark:text-red-400'
          : days <= 30
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
            {deposit.productName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {deposit.code}
            </span>
            <StatusBadge status={deposit.status} />
          </div>
        </div>
      </div>

      {/* Detail row — only for non-pending */}
      {!isPendingConfirm && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
            <DetailCol label={t('remaining')} value={`${deposit.remainingPercent}%`} />
            <DetailCol label={t('bottlesLabel')} value={formatNumber(deposit.remainingQty)} />
            <DetailCol
              label={t('daysLeftLabel')}
              value={
                days === null
                  ? t('noExpiry')
                  : days <= 0
                    ? t('expired')
                    : days === 1
                      ? t('expiresTomorrow')
                      : t('expiresInDays', { days })
              }
              valueClassName={cn('text-xs', expiryTone)}
            />
          </div>

          {/* Action */}
          <div className="mt-3">
            {isPendingWithdrawal ? (
              <div className="customer-tap flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                {t('pendingWithdrawal')}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onWithdraw(deposit)}
                disabled={!canWithdraw}
                className="customer-tap customer-focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {isRequesting ? t('requesting') : t('requestWithdrawal')}
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function DetailCol({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-50',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('customer.home');
  if (status === 'pending_confirm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        <Hourglass className="h-2.5 w-2.5" />
        {t('pendingStaff')}
      </span>
    );
  }
  if (status === 'pending_withdrawal') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
        <Clock className="h-2.5 w-2.5" />
        {t('pendingWithdrawal')}
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
        <AlertCircle className="h-2.5 w-2.5" />
        {t('expired')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      <CheckCircle2 className="h-2.5 w-2.5" />
      {t('inStore')}
    </span>
  );
}
