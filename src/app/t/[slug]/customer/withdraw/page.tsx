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
        <Loader2 className="h-8 w-8 animate-spin theme-text-accent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-12 w-12 theme-text-danger" />
        <p className="text-sm theme-text">{authError}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="theme-surface flex h-16 w-16 items-center justify-center rounded-full">
          <Package className="h-8 w-8 theme-text-success" />
        </div>
        <h2 className="text-lg font-bold theme-text-strong">
          {t('successTitle')}
        </h2>
        <p className="text-sm theme-text-muted">{t('successSubtitle')}</p>
        <button
          onClick={() => router.push('/customer')}
          className="theme-button-primary mt-2 px-8"
        >
          {t('goHome')}
        </button>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 theme-text-faint">
        <Package className="h-12 w-12" />
        <p className="text-sm">{t('notFound')}</p>
        <button
          onClick={() => router.push('/customer')}
          className="theme-button-secondary"
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
        className="mb-4 flex items-center gap-1 text-sm theme-text-muted"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <h2 className="text-lg font-bold theme-text-strong">{t('title')}</h2>
      <p className="mt-0.5 text-sm theme-text-muted">{deposit.deposit_code}</p>

      {/* Deposit info */}
      <div className="theme-surface mt-4 p-4">
        <p className="font-semibold theme-text-strong">
          {deposit.product_name}
        </p>
        <p className="mt-1 text-sm theme-text-muted">
          {t('remaining', {
            qty: formatNumber(deposit.remaining_qty),
            store: deposit.store_name,
          })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="theme-surface mt-3 flex items-center gap-2 p-3 text-sm theme-text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Blocked day warning */}
      {blockedInfo?.blocked && (
        <div className="theme-surface mt-3 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 theme-text-warn" />
            <div>
              <p className="text-sm font-semibold theme-text-warn">
                {t('blockedDayTitle')}
              </p>
              <p className="mt-1 text-xs theme-text-muted">
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
          <label className="mb-1.5 block text-sm font-medium theme-text">
            {t('withdrawalType')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => !blockedInfo?.blocked && setWithdrawalType('in_store')}
              disabled={blockedInfo?.blocked}
              className={cn(
                'theme-surface flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all',
                withdrawalType === 'in_store'
                  ? 'theme-text-accent ring-2'
                  : 'theme-text-muted',
                blockedInfo?.blocked && 'cursor-not-allowed opacity-40',
              )}
              style={
                withdrawalType === 'in_store'
                  ? { ['--tw-ring-color' as string]: 'var(--c-accent)' }
                  : undefined
              }
            >
              <Wine className="h-4 w-4" />
              {t('inStore')}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawalType('take_home')}
              className={cn(
                'theme-surface flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all',
                withdrawalType === 'take_home'
                  ? 'theme-text-accent ring-2'
                  : 'theme-text-muted',
              )}
              style={
                withdrawalType === 'take_home'
                  ? { ['--tw-ring-color' as string]: 'var(--c-accent)' }
                  : undefined
              }
            >
              <Home className="h-4 w-4" />
              {t('takeHome')}
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1.5 block text-sm font-medium theme-text">
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
            className="theme-input"
          />
          <p className="mt-1 text-xs theme-text-faint">
            {t('maxQty', { qty: formatNumber(deposit.remaining_qty) })}
          </p>
        </div>

        {/* Table number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium theme-text">
            {t('tableNumber')}
          </label>
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder={t('tablePlaceholder')}
            className="theme-input"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium theme-text">
            {t('notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={3}
            className="theme-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !requestedQty}
          className="theme-button-primary w-full"
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
          <Loader2 className="h-8 w-8 animate-spin theme-text-accent" />
        </div>
      }
    >
      <WithdrawContent />
    </Suspense>
  );
}
