'use client';

/**
 * Customer LIFF home — deposit list. Owns all data fetching, filter and
 * search state, and the withdraw/cancel handlers; delegates the actual
 * render to the per-store theme renderer (`ThemedCustomerView`) chosen
 * via `useCustomerAuth().store.customerTheme`.
 *
 * The pending-request detail/cancel modal stays at this layer (rendered
 * outside the theme tree) so each theme doesn't have to reimplement
 * modal styling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';
import type { Locale } from '@/i18n/config';
import { useCustomerAuth } from './_components/customer-provider';
import { daysUntil, formatThaiDate, formatNumber } from '@/lib/utils/format';
import {
  Loader2,
  AlertCircle,
  X,
  Package,
  Clock,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';
import { ThemedCustomerView } from './_themes';
import type {
  DepositItem,
  FilterKey,
  ThemeStats,
  FilterChip,
} from './_themes/types';
import { NEAR_EXPIRY_DAYS } from './_themes/types';

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
  const locale = useLocale();
  const router = useRouter();
  const { theme: appTheme, toggleTheme: onToggleAppTheme, setLocale } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [detail, setDetail] = useState<DepositItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Preserve LIFF/token query across links
  const navQuery = useMemo(() => {
    const token = searchParams.get('token');
    const storeCode = searchParams.get('store');
    const parts: string[] = [];
    if (token) parts.push(`token=${encodeURIComponent(token)}`);
    if (storeCode) parts.push(`store=${encodeURIComponent(storeCode)}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }, [searchParams]);

  const onSwitchLocale = useCallback(() => {
    const next: Locale = locale === 'th' ? 'en' : 'th';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    setLocale(next);
    router.refresh();
  }, [locale, router, setLocale]);

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
      code: d.deposit_code || '',
      productName: d.product_name,
      remainingPercent: d.remaining_percent ?? 0,
      remainingQty: d.remaining_qty ?? 0,
      expiryDate: d.expiry_date,
      status: d.status,
      storeName: d.store?.store_name || '',
      depositDate: d.created_at,
      storeId: d.store_id || null,
      isRequest: d.is_request === true,
      requestId: d.request_id || null,
      tableNumber: d.table_number ?? null,
      photoUrl: d.customer_photo_url ?? null,
      notes: d.notes ?? null,
      customerName: d.customer_name ?? null,
      customerPhone: d.customer_phone ?? null,
    }));
  }

  const handleCancelRequest = async () => {
    if (!detail || !detail.isRequest || !detail.requestId) return;
    setIsCancelling(true);
    setError(null);

    try {
      const auth = getAuthPayload();
      const res = await fetch('/api/customer/deposit-request/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: detail.requestId,
          token: auth.token || undefined,
          accessToken: auth.accessToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Cancel failed');
      }

      setDeposits((prev) => prev.filter((d) => d.id !== detail.id));
      setDetail(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'ไม่สามารถยกเลิกคำขอได้');
    } finally {
      setIsCancelling(false);
    }
  };

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
  const stats: ThemeStats = useMemo(() => {
    let totalQty = 0;
    let nearExpiry = 0;
    let pending = 0;
    let pendingWithdrawal = 0;
    let inStore = 0;

    for (const d of deposits) {
      if (d.status === 'pending_confirm') pending++;
      else if (d.status === 'pending_withdrawal') {
        pendingWithdrawal++;
        totalQty += d.remainingQty || 0;
      } else if (d.status === 'in_store') {
        inStore++;
        totalQty += d.remainingQty || 0;
      }
      if (d.expiryDate && d.status !== 'pending_confirm') {
        const days = daysUntil(d.expiryDate);
        if (days >= 0 && days <= NEAR_EXPIRY_DAYS) nearExpiry++;
      }
    }
    return {
      totalQty,
      nearExpiry,
      pending,
      pendingWithdrawal,
      inStore,
      totalCount: deposits.length,
    };
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

  const filterChips: FilterChip[] = useMemo(() => [
    { key: 'all', label: t('filterAll'), count: deposits.length },
    { key: 'pending', label: t('filterPending'), count: stats.pending },
    { key: 'in_store', label: t('filterInStore'), count: stats.inStore },
    { key: 'pending_withdrawal', label: t('filterPendingWithdraw'), count: stats.pendingWithdrawal },
    { key: 'expiring', label: t('filterExpiring'), count: stats.nearExpiry },
  ], [deposits.length, stats, t]);

  // --------------------------------------------------------------------
  // Loading / auth-error states (rendered theme-neutral)
  // --------------------------------------------------------------------
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

  return (
    <>
      <ThemedCustomerView
        themeKey={store.customerTheme}
        displayName={displayName}
        storeName={store.name}
        stats={stats}
        filterChips={filterChips}
        deposits={deposits}
        filtered={filtered}
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onWithdraw={handleRequestWithdrawal}
        requestingId={requestingId}
        onOpenDetail={(d) => setDetail(d)}
        navQuery={navQuery}
        error={error}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t={t as any}
        locale={locale}
        onSwitchLocale={onSwitchLocale}
        appTheme={appTheme}
        onToggleAppTheme={onToggleAppTheme}
      />

      {/* Detail modal — shown for ANY card the customer taps. Action footer
       * adapts to the row's status:
       *   pending_confirm + isRequest → Cancel + Close
       *   pending_confirm + !isRequest → Close only (waiting for staff)
       *   in_store                    → Withdraw + Close
       *   pending_withdrawal          → Close only (already requested)
       *   expired                     → Close only (no actions left)
       */}
      {detail && (
        <DepositDetailModal
          item={detail}
          isCancelling={isCancelling}
          isRequesting={requestingId === detail.id}
          onClose={() => setDetail(null)}
          onCancel={handleCancelRequest}
          onWithdraw={(d) => {
            handleRequestWithdrawal(d);
            setDetail(null);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Deposit detail modal — single theme-neutral surface every card opens.
//
// Status-driven layout:
//   pending_confirm + isRequest     → Cancel + Close
//   pending_confirm + !isRequest    → Close (waiting for staff to confirm)
//   in_store                        → Withdraw (ขอเบิก) + Close
//   pending_withdrawal              → Close (already requested, info only)
//   expired                         → Close (no actions left)
// ---------------------------------------------------------------------------
function DepositDetailModal({
  item,
  isCancelling,
  isRequesting,
  onClose,
  onCancel,
  onWithdraw,
}: {
  item: DepositItem;
  isCancelling: boolean;
  isRequesting: boolean;
  onClose: () => void;
  onCancel: () => void;
  onWithdraw: (d: DepositItem) => void;
}) {
  const submittedAt = new Date(item.depositDate).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canWithdraw = item.status === 'in_store' && !isRequesting;
  const days = item.expiryDate ? daysUntil(item.expiryDate) : null;

  // Headline subtitle and status pill driven by status + isRequest.
  let subtitle = 'รายละเอียดการฝาก';
  let pillClass = 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let pillIcon: React.ReactNode = null;
  let pillLabel = '';
  if (item.status === 'pending_confirm') {
    subtitle = item.isRequest
      ? 'คำขอฝากเหล้า · รอ Staff อนุมัติ'
      : 'รายละเอียดการฝาก · รอพนักงานยืนยัน';
    pillClass = 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
    pillIcon = <Hourglass className="h-3 w-3" />;
    pillLabel = 'รอยืนยัน';
  } else if (item.status === 'in_store') {
    subtitle = 'ของฝากของคุณ';
    pillClass = 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
    pillIcon = <CheckCircle2 className="h-3 w-3" />;
    pillLabel = 'พร้อมเบิก';
  } else if (item.status === 'pending_withdrawal') {
    subtitle = 'คำขอเบิก · กำลังรอ Staff';
    pillClass = 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200';
    pillIcon = <Clock className="h-3 w-3" />;
    pillLabel = 'รอเบิก';
  } else if (item.status === 'expired') {
    subtitle = 'ของฝากหมดอายุ';
    pillClass = 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200';
    pillIcon = <AlertCircle className="h-3 w-3" />;
    pillLabel = 'หมดอายุ';
  }

  // Quantity / remaining row — only meaningful for confirmed deposits.
  const showRemaining =
    item.status === 'in_store' || item.status === 'pending_withdrawal';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {subtitle}
            </p>
            <h3 className="mt-0.5 truncate text-base font-bold text-slate-900 dark:text-slate-50">
              {item.storeName || 'ร้าน'}
            </h3>
            {pillLabel && (
              <span className={'mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + pillClass}>
                {pillIcon}
                {pillLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="customer-tap customer-focus-ring -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {item.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="mt-3 h-40 w-full rounded-xl object-cover"
          />
        )}

        <dl className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60">
          <DetailRow label="รายการ" value={item.productName} />
          {item.code && <DetailRow label="รหัสฝาก" value={item.code} />}
          {showRemaining && (
            <DetailRow
              label="คงเหลือ"
              value={`${item.remainingPercent}% (${formatNumber(item.remainingQty)} ขวด)`}
            />
          )}
          {item.expiryDate && (
            <DetailRow
              label="หมดอายุ"
              value={
                days !== null && days <= 0
                  ? `${formatThaiDate(item.expiryDate)} (หมดอายุแล้ว)`
                  : days !== null && days <= 7
                    ? `${formatThaiDate(item.expiryDate)} (เหลือ ${days} วัน)`
                    : formatThaiDate(item.expiryDate)
              }
            />
          )}
          {item.customerName && <DetailRow label="ชื่อ" value={item.customerName} />}
          {item.customerPhone && <DetailRow label="เบอร์โทร" value={item.customerPhone} />}
          {item.tableNumber && <DetailRow label="โต๊ะ" value={item.tableNumber} />}
          {item.notes && <DetailRow label="หมายเหตุ" value={item.notes} />}
          <DetailRow label="ส่งเมื่อ" value={submittedAt} />
        </dl>

        {/* Status-driven action footer */}
        <ModalActions
          item={item}
          canWithdraw={canWithdraw}
          isRequesting={isRequesting}
          isCancelling={isCancelling}
          onCancel={onCancel}
          onWithdraw={onWithdraw}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function ModalActions({
  item,
  canWithdraw,
  isRequesting,
  isCancelling,
  onCancel,
  onWithdraw,
  onClose,
}: {
  item: DepositItem;
  canWithdraw: boolean;
  isRequesting: boolean;
  isCancelling: boolean;
  onCancel: () => void;
  onWithdraw: (d: DepositItem) => void;
  onClose: () => void;
}) {
  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      disabled={isCancelling}
      className="customer-tap customer-focus-ring flex flex-1 items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      ปิด
    </button>
  );

  if (item.status === 'pending_confirm' && item.isRequest) {
    return (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          className="customer-tap customer-focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          {isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
        </button>
        {closeBtn}
      </div>
    );
  }

  if (item.status === 'in_store') {
    return (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={() => onWithdraw(item)}
          disabled={!canWithdraw}
          className="customer-tap customer-focus-ring flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRequesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          {isRequesting ? 'กำลังส่งคำขอ...' : 'ขอเบิกเหล้า'}
        </button>
        {closeBtn}
      </div>
    );
  }

  // pending_withdrawal / expired / pending_confirm-non-request — close only
  return <div className="mt-4">{closeBtn}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </dd>
    </div>
  );
}
