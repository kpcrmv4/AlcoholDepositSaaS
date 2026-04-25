'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTenantMaybe } from '@/lib/tenant';
import { formatThaiDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Megaphone, Tag, Calendar, Loader2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  type: string;
  start_date: string;
  end_date: string | null;
  store?: { store_name: string } | null;
}

export default function CustomerPromotionsPage() {
  const tenant = useTenantMaybe();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('customer.promotions');

  const typeConfig: Record<string, { label: string; color: string }> = {
    promotion: {
      label: t('typePromotion'),
      color:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    announcement: {
      label: t('typeAnnouncement'),
      color:
        'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    },
    event: {
      label: t('typeEvent'),
      color:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      if (!tenant?.slug) {
        setAnnouncements([]);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/customer/promotions?tenantSlug=${encodeURIComponent(tenant.slug)}`,
        );
        if (!res.ok) {
          if (!cancelled) setAnnouncements([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setAnnouncements(data.promotions || []);
      } catch {
        if (!cancelled) setAnnouncements([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tenant?.slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
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

      {announcements.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
          <Megaphone className="h-12 w-12" />
          <p className="text-sm">{t('noPromotions')}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {announcements.map((item) => {
            const config = typeConfig[item.type] || typeConfig.announcement;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {item.image_url && (
                  <div className="aspect-[2/1] w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                        config.color,
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  {item.body && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-300">
                      {item.body}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                    {item.store && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {item.store.store_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatThaiDate(item.start_date)}
                      {item.end_date && ` - ${formatThaiDate(item.end_date)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
