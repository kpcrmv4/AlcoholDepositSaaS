'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenantRouter, useTenantPath } from '@/lib/tenant';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import {
  Button,
  Card,
  CardHeader,
} from '@/components/ui';
import {
  Store,
  Plus,
  ChevronRight,
  Upload,
  Bot,
  Building2,
  MessageCircle,
  Users,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface StoreInfo {
  id: string;
  store_code: string;
  store_name: string;
  is_central: boolean;
  active: boolean;
}

// Tenant-level settings live OUTSIDE the (dashboard) folder, so the sidebar
// doesn't reach them and the URL crosses route groups. Use plain <a>/Link
// (via tenantPath) to navigate — useTenantRouter is scoped to the dashboard
// segment.
interface TenantSettingsLink {
  titleKey: string;
  descKey: string;
  href: string;
  icon: typeof Building2;
  iconBg: string;
  iconFg: string;
}

const TENANT_LINKS: TenantSettingsLink[] = [
  { titleKey: 'companyInfoTitle',     descKey: 'companyInfoDesc',     href: '/settings/company',     icon: Building2,     iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',     iconFg: 'text-indigo-600 dark:text-indigo-400' },
  { titleKey: 'lineOaTitle',          descKey: 'lineOaDesc',          href: '/settings/line',        icon: MessageCircle, iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',   iconFg: 'text-emerald-600 dark:text-emerald-400' },
  { titleKey: 'branchesQuotaTitle',   descKey: 'branchesQuotaDesc',   href: '/settings/branches',    icon: Store,         iconBg: 'bg-blue-50 dark:bg-blue-900/20',         iconFg: 'text-blue-600 dark:text-blue-400' },
  { titleKey: 'usersInviteTitle',     descKey: 'usersInviteDesc',     href: '/settings/users',       icon: Users,         iconBg: 'bg-amber-50 dark:bg-amber-900/20',       iconFg: 'text-amber-600 dark:text-amber-400' },
  { titleKey: 'modulesAccessTitle',   descKey: 'modulesAccessDesc',   href: '/settings/features',   icon: Layers,        iconBg: 'bg-purple-50 dark:bg-purple-900/20',     iconFg: 'text-purple-600 dark:text-purple-400' },
  { titleKey: 'rolePermissionsTitle', descKey: 'rolePermissionsDesc', href: '/settings/permissions', icon: ShieldCheck,   iconBg: 'bg-rose-50 dark:bg-rose-900/20',         iconFg: 'text-rose-600 dark:text-rose-400' },
];

export default function SettingsPage() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  const t = useTranslations('settings');
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const [stores, setStores] = useState<StoreInfo[]>([]);

  const loadStores = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('stores')
      .select('id, store_code, store_name, is_central, active')
      .order('store_name');
    if (data) setStores(data);
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Company-wide settings (only owners need these) */}
      {isOwner && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('companySectionTitle')}
          </h2>
          <Card padding="none">
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {TENANT_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={tenantPath(link.href)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${link.iconBg}`}>
                        <Icon className={`h-4 w-4 ${link.iconFg}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t(link.titleKey)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(link.descKey)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* Operational settings (per store + tooling) */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('operationalSectionTitle')}
        </h2>

        {/* DAVIS Ai Central Config — Owner only */}
        {isOwner && (
          <Card padding="none">
            <button
              onClick={() => router.push('/settings/davis-ai')}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('davisAiTitle')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('davisAiDesc')}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </button>
          </Card>
        )}

        {/* Stores List */}
        <Card padding="none">
          <CardHeader
            title={t('storeList')}
            description={t('storeListDesc')}
            action={
              <Button
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => router.push('/settings/stores/new')}
              >
                {t('addStore')}
              </Button>
            }
          />
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => router.push(`/settings/store/${store.id}`)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {store.store_name}
                      {store.is_central && (
                        <span className="ml-1.5 text-xs text-gray-400">({t('centralWarehouse')})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{store.store_code}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
          </div>
        </Card>

        {/* Import Deposits Link */}
        <Card padding="none">
          <button
            onClick={() => router.push('/settings/import-deposits')}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('importDeposits')}
                </p>
                <p className="text-xs text-gray-400">
                  {t('importDepositsDesc')}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        </Card>
      </section>
    </div>
  );
}
