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

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold theme-text-strong">{t('title')}</h2>
      <p className="mt-0.5 text-sm theme-text-muted">{t('subtitle')}</p>

      {error && (
        <div className="theme-surface mt-3 flex items-center gap-2 p-3 text-sm theme-text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 theme-text-faint">
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
                className="theme-surface flex items-start gap-3 p-4 shadow-sm"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    item.type === 'deposit'
                      ? 'bg-indigo-100/30 theme-text-accent'
                      : 'bg-emerald-100/30 theme-text-success',
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
                    <p className="truncate text-sm font-medium theme-text-strong">
                      {item.product_name}
                    </p>
                    {item.type === 'deposit' ? (
                      <span className="theme-pill shrink-0 text-[10px] theme-text-accent">
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
                      <span className="theme-pill shrink-0 text-[10px]">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs theme-text-muted">
                    {t('quantity', { qty: formatNumber(item.quantity) })}
                    {item.deposit_code && ` · ${item.deposit_code}`}
                  </p>
                  <p className="mt-0.5 text-[11px] theme-text-faint">
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
          <Loader2 className="h-8 w-8 animate-spin theme-text-accent" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
