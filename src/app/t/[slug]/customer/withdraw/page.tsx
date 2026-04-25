'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTenantRouter } from '@/lib/tenant';
import { useTranslations } from 'next-intl';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  ArrowLeft,
  Package,
  Loader2,
  AlertCircle,
  Home,
  Wine,
} from 'lucide-react';
import { useCustomerAuth } from '../_components/customer-provider';

interface DepositInfo {
  id: string;
  deposit_code: string;
  product_name: string;
  remaining_qty: number;
  store_id: string;
  store_name: string;
}

interface BlockedDayInfo {
  blocked: boolean;
  calendarDay: string;
  blockedDays: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WithdrawContent() {
  const searchParams = useSearchParams();
  const router = useTenantRouter();
  const depositId = searchParams.get('depositId');
  const t = useTranslations('customer.withdraw');

  const {
    displayName,
    mode,
    isLoading: authLoading,
    error: authError,
  } = useCustomerAuth();

  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestedQty, setRequestedQty] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<BlockedDayInfo | null>(null);
  const [withdrawalType, setWithdrawalType] = useState<'in_store' | 'take_home'>('in_store');

  const getAuthPayload = useCallback(() => {
    if (mode === 'token') {
      return { token: searchParams.get('token') || undefined };
    }
    if (typeof window === 'undefined') return {};
    const accessToken = sessionStorage.getItem('liff_access_token');
    return accessToken ? { accessToken } : {};
  }, [mode, searchParams]);

  const loadDeposit = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const auth = getAuthPayload();
        let res: Response;
        if (auth.token) {
          res = await fetch(
            `/api/customer/deposits?token=${encodeURIComponent(auth.token)}`,
          );
        } else if (auth.accessToken) {
          res = await fetch('/api/customer/deposits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: auth.accessToken }),
          });
        } else {
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const list = (data.deposits || []) as Array<{
          id: string;
          deposit_code: string;
          product_name: string;
          remaining_qty: number;
          status: string;
          store_id: string;
          store?: { store_name: string };
        }>;

        const target = list.find((d) => d.id === id);
        if (!target || target.status !== 'in_store') {
          setIsLoading(false);
          return;
        }

        setDeposit({
          id: target.id,
          deposit_code: target.deposit_code,
          product_name: target.product_name,
          remaining_qty: target.remaining_qty,
          store_id: target.store_id,
          store_name: target.store?.store_name || '',
        });
        setRequestedQty(String(target.remaining_qty));

        // Compute blocked-day info using Bangkok calendar day
        const now = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        );
        const calendarDay = DAY_NAMES[now.getDay()];
        // Default block list — server is the source of truth and will reject
        // a blocked attempt regardless of what we show.
        const blockedDays = ['Fri', 'Sat'];
        const blocked = blockedDays.includes(calendarDay);
        setBlockedInfo({ blocked, calendarDay, blockedDays });
        if (blocked) setWithdrawalType('take_home');
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthPayload],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!depositId) {
      setIsLoading(false);
      return;
    }
    loadDeposit(depositId);
  }, [authLoading, depositId, loadDeposit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposit || !requestedQty) return;

    const qty = parseFloat(requestedQty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > deposit.remaining_qty) {
      setError(t('errorQtyRange', { max: deposit.remaining_qty }));
      return;
    }

    if (blockedInfo?.blocked && withdrawalType !== 'take_home') {
      setError(t('errorBlockedDay'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const auth = getAuthPayload();
      const res = await fetch('/api/customer/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: deposit.id,
          customerName: displayName || 'ลูกค้า',
          requestedQty: qty,
          tableNumber: tableNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          withdrawalType,
          token: auth.token,
          accessToken: auth.accessToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Request failed');
      }

      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg && msg !== 'Request failed' ? `${t('errorSubmit')} (${msg})` : t('errorSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-sm text-gray-600 dark:text-slate-300">{authError}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <Package className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          {t('successTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('successSubtitle')}
        </p>
        <button
          onClick={() => router.push('/customer')}
          className="mt-2 rounded-full bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t('goHome')}
        </button>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-gray-400 dark:text-slate-500">
        <Package className="h-12 w-12" />
        <p className="text-sm">{t('notFound')}</p>
        <button
          onClick={() => router.push('/customer')}
          className="rounded-full border border-gray-300 dark:border-slate-700 px-6 py-2 text-sm font-medium text-gray-600 dark:text-slate-300"
        >
          {t('goHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
        {t('title')}
      </h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
        {deposit.deposit_code}
      </p>

      {/* Deposit info */}
      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
        <p className="font-semibold text-gray-900 dark:text-slate-100">
          {deposit.product_name}
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          {t('remaining', {
            qty: formatNumber(deposit.remaining_qty),
            store: deposit.store_name,
          })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Blocked day warning */}
      {blockedInfo?.blocked && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/40">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {t('blockedDayTitle')}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {t('blockedDaySubtitle')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Withdrawal type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('withdrawalType')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => !blockedInfo?.blocked && setWithdrawalType('in_store')}
              disabled={blockedInfo?.blocked}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-colors',
                withdrawalType === 'in_store'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-500 dark:border-slate-800 dark:text-slate-400',
                blockedInfo?.blocked && 'cursor-not-allowed opacity-40',
              )}
            >
              <Wine className="h-4 w-4" />
              {t('inStore')}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawalType('take_home')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-colors',
                withdrawalType === 'take_home'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-500 dark:border-slate-800 dark:text-slate-400',
              )}
            >
              <Home className="h-4 w-4" />
              {t('takeHome')}
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('quantity')}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            max={deposit.remaining_qty}
            value={requestedQty}
            onChange={(e) => setRequestedQty(e.target.value)}
            placeholder="0"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
            {t('maxQty', { qty: formatNumber(deposit.remaining_qty) })}
          </p>
        </div>

        {/* Table number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('tableNumber')}
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder={t('tablePlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={3}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !requestedQty}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  );
}

export default function CustomerWithdrawPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }
    >
      <WithdrawContent />
    </Suspense>
  );
}
