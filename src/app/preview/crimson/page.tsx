'use client';

/**
 * Design preview — "Crimson Wine" (wine-bar / vintage)
 * Static mock — no auth, no API. Visit /preview/crimson on any device.
 *
 * Unlike the earlier preview pages (sumi/sunset/etc.) which inline-cloned
 * the theme, this one renders the SAME component the real customer LIFF
 * will use (CrimsonView + CrimsonBottleList) with mock props — so the
 * preview is guaranteed to stay in sync with production.
 */

import { CrimsonView } from '@/app/t/[slug]/customer/_themes/crimson/chrome';
import { CrimsonBottleList } from '@/app/t/[slug]/customer/_themes/crimson/cards';
import type {
  ThemeViewProps,
  DepositItem,
  FilterKey,
} from '@/app/t/[slug]/customer/_themes/types';
// Load the .theme-* utility classes + .crimson-theme CSS variables.
import '@/app/t/[slug]/customer/customer-theme.css';

const MOCK_DEPOSITS: DepositItem[] = [
  {
    id: '1',
    code: 'DEP-WB01-DHK0W',
    productName: 'Honey',
    remainingPercent: 0,
    remainingQty: 1,
    expiryDate: null,
    status: 'pending_confirm',
    storeName: 'Wine Bar',
    depositDate: new Date().toISOString(),
    storeId: null,
    isRequest: true,
    requestId: 'req-1',
    tableNumber: 'A12',
    photoUrl: null,
    notes: null,
    customerName: 'Khun Pat',
    customerPhone: null,
  },
  {
    id: '2',
    code: 'DEP-WB01-MX9P2',
    productName: 'Bordeaux 2018',
    remainingPercent: 65,
    remainingQty: 2,
    expiryDate: new Date(Date.now() + 92 * 86400000).toISOString(),
    status: 'in_store',
    storeName: 'Wine Bar',
    depositDate: new Date().toISOString(),
    storeId: null,
    isRequest: false,
    requestId: null,
    tableNumber: null,
    photoUrl: null,
    notes: null,
    customerName: null,
    customerPhone: null,
  },
  {
    id: '3',
    code: 'DEP-WB01-RT4LK',
    productName: 'Pinot Noir',
    remainingPercent: 32,
    remainingQty: 1,
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'in_store',
    storeName: 'Wine Bar',
    depositDate: new Date().toISOString(),
    storeId: null,
    isRequest: false,
    requestId: null,
    tableNumber: null,
    photoUrl: null,
    notes: null,
    customerName: null,
    customerPhone: null,
  },
  {
    id: '4',
    code: 'DEP-WB01-Q8N3Z',
    productName: 'Macallan 12',
    remainingPercent: 80,
    remainingQty: 1,
    expiryDate: new Date(Date.now() + 28 * 86400000).toISOString(),
    status: 'pending_withdrawal',
    storeName: 'Wine Bar',
    depositDate: new Date().toISOString(),
    storeId: null,
    isRequest: false,
    requestId: null,
    tableNumber: null,
    photoUrl: null,
    notes: null,
    customerName: null,
    customerPhone: null,
  },
];

const STATIC_T: Record<string, string> = {
  bottlesLabel: 'ขวด',
  filterAll: 'ทั้งหมด',
  filterPending: 'รอยืนยัน',
  filterInStore: 'กำลังฝาก',
  filterPendingWithdraw: 'รอเบิก',
  filterExpiring: 'ใกล้หมด',
  statTotal: 'ฝากอยู่',
  statPending: 'รอดำเนินการ',
  ctaDeposit: 'ฝากขวดใหม่',
  searchPlaceholder: 'ค้นหาขวดของคุณ',
  viewHistory: 'ดูประวัติทั้งหมด',
  remaining: 'เหลือ',
  noExpiry: 'ไม่มีกำหนด',
  expired: 'หมดอายุแล้ว',
  expiresTomorrow: 'พรุ่งนี้หมด',
  pendingStaff: 'รอยืนยัน',
  pendingWithdrawal: 'รอเบิก',
  inStore: 'พร้อมเบิก',
  requestWithdrawal: 'ขอเบิก',
  requesting: 'กำลังส่ง...',
  noDeposits: 'ยังไม่มีรายการฝาก',
  noSearchResults: 'ไม่พบรายการที่ค้นหา',
};

function mockT(key: string, params?: Record<string, unknown>): string {
  if (key === 'expiresInDays' && params?.days != null) return `อีก ${params.days} วัน`;
  if (key === 'statNearExpiry' && params?.days != null) return `ใกล้หมด ≤${params.days}วัน`;
  return STATIC_T[key] ?? key;
}

export default function CrimsonPreviewPage() {
  const props: ThemeViewProps = {
    themeKey: 'crimson',
    displayName: 'Khun Pat',
    storeName: 'Wine Bar',
    stats: {
      totalQty: 4,
      nearExpiry: 1,
      pending: 1,
      pendingWithdrawal: 1,
      inStore: 2,
      totalCount: MOCK_DEPOSITS.length,
    },
    filterChips: [
      { key: 'all' as FilterKey, label: 'ทั้งหมด', count: 4 },
      { key: 'pending' as FilterKey, label: 'รอยืนยัน', count: 1 },
      { key: 'in_store' as FilterKey, label: 'กำลังฝาก', count: 2 },
      { key: 'pending_withdrawal' as FilterKey, label: 'รอเบิก', count: 1 },
      { key: 'expiring' as FilterKey, label: 'ใกล้หมด', count: 1 },
    ],
    deposits: MOCK_DEPOSITS,
    filtered: MOCK_DEPOSITS,
    filter: 'all',
    setFilter: () => {},
    searchQuery: '',
    setSearchQuery: () => {},
    onWithdraw: () => {},
    requestingId: null,
    onOpenDetail: () => {},
    navQuery: '',
    error: null,
    t: mockT,
    locale: 'th',
    onSwitchLocale: () => {},
    appTheme: 'light',
    onToggleAppTheme: () => {},
  };

  return (
    <CrimsonView props={props}>
      <CrimsonBottleList props={props} />
    </CrimsonView>
  );
}
