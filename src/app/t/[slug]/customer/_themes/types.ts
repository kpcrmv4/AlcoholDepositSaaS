import type { CustomerThemeKey } from '@/lib/customer-themes';

export interface DepositItem {
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
  isRequest: boolean;
  requestId: string | null;
  tableNumber: string | null;
  photoUrl: string | null;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
}

export type FilterKey =
  | 'all'
  | 'pending'
  | 'in_store'
  | 'pending_withdrawal'
  | 'expiring';

export interface ThemeStats {
  /** Total bottles currently sleeping in the store (in_store + pending_withdrawal). */
  totalQty: number;
  /** Number of deposits whose expiry is within NEAR_EXPIRY_DAYS. */
  nearExpiry: number;
  /** Number of pending_confirm deposit_requests (waiting for staff approval). */
  pending: number;
  /** Number of pending_withdrawal deposits. */
  pendingWithdrawal: number;
  /** Number of in_store deposits ready to withdraw. */
  inStore: number;
  /** Total visible rows (deposits + requests). */
  totalCount: number;
}

export interface FilterChip {
  key: FilterKey;
  label: string;
  count: number;
}

export interface ThemeViewProps {
  themeKey: CustomerThemeKey;

  // Identity
  displayName: string | null;
  storeName: string | null;

  // Stats / filter chips (already localized labels)
  stats: ThemeStats;
  filterChips: FilterChip[];

  // List data
  deposits: DepositItem[];
  filtered: DepositItem[];

  // Filter state
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Actions
  onWithdraw: (d: DepositItem) => void;
  requestingId: string | null;
  onOpenDetail: (d: DepositItem) => void;

  // Routing helpers
  /** Path query string preserving ?token / ?store across links */
  navQuery: string;

  // Error / network state
  error: string | null;

  // Translations (customer.home namespace)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, params?: Record<string, any>) => string;

  // Promotions / locale / OS theme controls (rendered in each theme's header)
  locale: string;
  onSwitchLocale: () => void;
  appTheme: 'light' | 'dark';
  onToggleAppTheme: () => void;
}

export const NEAR_EXPIRY_DAYS = 7;
