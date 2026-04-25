'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatThaiDateTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  History,
  Package,
  Wine,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useCustomerAuth } from '../_components/customer-provider';

interface HistoryItem {
  id: string;
  type: 'deposit' | 'withdrawal';
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
  deposit_code?: string;
  store_name?: string;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('customer.history');
  const {
    mode,
    isLoading: authLoading,
    error: authError,
    lineUserId,
  } = useCustomerAuth();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const withdrawalStatusMap: Record<string, { label: string; color: string }> = {
    pending: {
      label: t('statusPending'),
      color:
        'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
    },
    approved: {
      label: t('statusApproved'),
      color:
        'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    completed: {
      label: t('statusCompleted'),
      color:
        'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    rejected: {
      label: t('statusRejected'),
      color: 'text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300',
    },
  };

  const getAuthPayload = useCallback(() => {
    if (mode === 'token') {
      return { token: searchParams.get('token') || undefined };
    }
    if (typeof window === 'undefined') return {};
    const accessToken = sessionStorage.getItem('liff_access_token');
    return accessToken ? { accessToken } : {};
  }, [mode, searchParams]);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getAuthPayload();
      let res: Response;

      if (auth.token) {
        res = await fetch(
          `/api/customer/history?token=${encodeURIComponent(auth.token)}`,
        );
      } else if (auth.accessToken) {
        res = await fetch('/api/customer/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: auth.accessToken }),
        });
      } else {
        setError(t('loadError'));
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setError(t('loadError'));
        setIsLoading(false);
        return;
      }

      const data = (await res.json()) as {
        deposits: Array<Record<string, unknown>>;
        withdrawals: Array<Record<string, unknown>>;
      };

      const items: HistoryItem[] = [
        ...data.deposits.map((d) => ({
          id: d.id as string,
          type: 'deposit' as const,
          product_name: d.product_name as string,
          quantity: (d.quantity as number) ?? 0,
          status: d.status as string,
          created_at: d.created_at as string,
          deposit_code: d.deposit_code as string,
          store_name: (d.store as { store_name: string } | null)?.store_name,
        })),
        ...data.withdrawals.map((w) => ({
          id: w.id as string,
          type: 'withdrawal' as const,
          product_name: w.product_name as string,
          quantity: (w.requested_qty as number) ?? 0,
          status: w.status as string,
          created_at: w.created_at as string,
          store_name: (w.store as { store_name: string } | null)?.store_name,
        })),
      ];

      items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setHistory(items);
    } catch {
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [getAuthPayload, t]);

  useEffect(() => {
    if (authLoading) return;
    if (lineUserId) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
  }, [authLoading, lineUserId, loadHistory]);

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

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
        {t('title')}
      </h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
        {t('subtitle')}
      </p>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
          <History className="h-12 w-12" />
          <p className="text-sm">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {history.map((item) => {
            const wStatus = withdrawalStatusMap[item.status];

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    item.type === 'deposit'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                  )}
                >
                  {item.type === 'deposit' ? (
                    <Wine className="h-4 w-4" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                      {item.product_name}
                    </p>
                    {item.type === 'deposit' ? (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {t('deposit')}
                      </span>
                    ) : wStatus ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          wStatus.color,
                        )}
                      >
                        {wStatus.label}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                    {t('quantity', { qty: formatNumber(item.quantity) })}
                    {item.deposit_code && ` · ${item.deposit_code}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-500">
                    {formatThaiDateTime(item.created_at)}
                    {item.store_name && ` · ${item.store_name}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CustomerHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
