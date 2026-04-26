/**
 * Store hours helpers — single source of truth for "when is the bar open?"
 *
 * Bars in this product typically operate across midnight (e.g. open 11:00,
 * close 06:00 the following morning). Several features need to agree on
 * what "today's business day" means: the chat shift label, the daily
 * summary window, the overview heatmap, etc. Funneling all of them
 * through `parseStoreHours` + `currentShiftWindow` keeps the rules in
 * one place.
 *
 * Storage: `store_settings.print_server_working_hours` (JSONB). The column
 * was originally added for the print server; the `enabled` flag inside it
 * still belongs to print server. The hours themselves describe the bar's
 * actual schedule.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StoreHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  /** True when end time wraps past midnight (open 11:00 → close 06:00). */
  isOvernight: boolean;
}

export const DEFAULT_STORE_HOURS: StoreHours = {
  startHour: 12,
  startMinute: 0,
  endHour: 6,
  endMinute: 0,
  isOvernight: true,
};

function clampHour(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? Math.floor(n) : fallback;
}

function clampMinute(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 59 ? Math.floor(n) : fallback;
}

/**
 * Coerce a `print_server_working_hours` JSONB value into a StoreHours.
 * Tolerates missing/invalid fields by falling back to defaults — callers
 * should always get a usable object.
 */
export function parseStoreHours(raw: unknown): StoreHours {
  if (!raw || typeof raw !== 'object') return DEFAULT_STORE_HOURS;
  const o = raw as Record<string, unknown>;
  const startHour = clampHour(o.startHour, DEFAULT_STORE_HOURS.startHour);
  const startMinute = clampMinute(o.startMinute, DEFAULT_STORE_HOURS.startMinute);
  const endHour = clampHour(o.endHour, DEFAULT_STORE_HOURS.endHour);
  const endMinute = clampMinute(o.endMinute, DEFAULT_STORE_HOURS.endMinute);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const isOvernight = endMinutes <= startMinutes;
  return { startHour, startMinute, endHour, endMinute, isOvernight };
}

/**
 * Fetch hours for a single store. Accepts any Supabase client (browser or
 * service-role) so the same helper works in client components, API routes,
 * and cron jobs. Returns DEFAULT_STORE_HOURS on missing rows / errors —
 * shift logic must always have *something* to work with.
 */
export async function fetchStoreHours(
  client: SupabaseClient,
  storeId: string,
): Promise<StoreHours> {
  const { data } = await client
    .from('store_settings')
    .select('print_server_working_hours')
    .eq('store_id', storeId)
    .single();
  return parseStoreHours(data?.print_server_working_hours);
}

// ---------------------------------------------------------------------------
// Bangkok wall-clock conversions (timezone-independent — work on any server)
// ---------------------------------------------------------------------------

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

interface BangkokParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Extract Bangkok wall-clock parts from a real UTC timestamp. */
export function bangkokParts(at: Date = new Date()): BangkokParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    // "24" rolls over from "00" in some Intl impls during midnight
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Build a real UTC Date that represents the given Bangkok wall-clock
 * moment. Inverse of bangkokParts.
 */
export function bangkokWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - BANGKOK_OFFSET_MS,
  );
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Add `days` to a Bangkok-local YYYY-MM-DD triple. */
function addDays(year: number, month: number, day: number, days: number): {
  year: number;
  month: number;
  day: number;
} {
  // Use UTC math to avoid TZ drift; the result represents the same wall date.
  const base = Date.UTC(year, month - 1, day);
  const shifted = new Date(base + days * 86400000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

// ---------------------------------------------------------------------------
// Business day & shift window
// ---------------------------------------------------------------------------

/**
 * The Bangkok-local YYYY-MM-DD that `at` belongs to *as a business day*.
 *
 * For overnight bars, anything before close-time rolls back to the previous
 * calendar day. So a deposit at 03:00 Wed at a shop closing 06:00 belongs
 * to Tuesday's business day.
 *
 * For shops with same-day hours (open 09:00, close 17:00), business day =
 * calendar day; no rollover.
 */
export function bangkokBusinessDate(at: string | Date, hours: StoreHours): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  const bk = bangkokParts(d);
  if (!hours.isOvernight) return ymd(bk.year, bk.month, bk.day);

  const currentMinutes = bk.hour * 60 + bk.minute;
  const closeMinutes = hours.endHour * 60 + hours.endMinute;
  if (currentMinutes < closeMinutes) {
    const prev = addDays(bk.year, bk.month, bk.day, -1);
    return ymd(prev.year, prev.month, prev.day);
  }
  return ymd(bk.year, bk.month, bk.day);
}

export interface ShiftWindow {
  /** First instant of the shift, as a real UTC Date. */
  startUTC: Date;
  /** End of the shift (exclusive), as a real UTC Date. */
  endUTC: Date;
  /** Bangkok-local YYYY-MM-DD that identifies the business day. */
  businessDate: string;
}

/**
 * Compute the current (or most recently completed) shift window for a
 * store, given its hours. Used by:
 *   - chat "งานของฉัน" tab to filter cards within the active shift
 *   - daily-summary cron to count yesterday's transactions
 *   - any "today's business" KPI
 *
 * @param hours store hours from `fetchStoreHours()` / `parseStoreHours()`
 * @param at    timestamp to compute against (default: now)
 */
export function currentShiftWindow(
  hours: StoreHours,
  at: Date = new Date(),
): ShiftWindow {
  const bk = bangkokParts(at);
  const currentMinutes = bk.hour * 60 + bk.minute;
  const startMinutes = hours.startHour * 60 + hours.startMinute;

  let bizY = bk.year;
  let bizM = bk.month;
  let bizD = bk.day;

  if (hours.isOvernight) {
    if (currentMinutes >= startMinutes) {
      // After today's open — current shift starts today, ends tomorrow.
    } else {
      // Either before close (still inside yesterday's shift) or in the
      // gap between close and next open (most recently completed shift).
      // Both cases roll to yesterday.
      const prev = addDays(bk.year, bk.month, bk.day, -1);
      bizY = prev.year;
      bizM = prev.month;
      bizD = prev.day;
    }
    const next = addDays(bizY, bizM, bizD, 1);
    return {
      startUTC: bangkokWallClockToDate(bizY, bizM, bizD, hours.startHour, hours.startMinute),
      endUTC: bangkokWallClockToDate(next.year, next.month, next.day, hours.endHour, hours.endMinute),
      businessDate: ymd(bizY, bizM, bizD),
    };
  }

  // Same-day hours
  if (currentMinutes < startMinutes) {
    // Before today's open — show yesterday's just-completed shift.
    const prev = addDays(bk.year, bk.month, bk.day, -1);
    bizY = prev.year;
    bizM = prev.month;
    bizD = prev.day;
  }
  return {
    startUTC: bangkokWallClockToDate(bizY, bizM, bizD, hours.startHour, hours.startMinute),
    endUTC: bangkokWallClockToDate(bizY, bizM, bizD, hours.endHour, hours.endMinute),
    businessDate: ymd(bizY, bizM, bizD),
  };
}

/**
 * Format a Bangkok-local short label "26/4 11:00" for shift headers.
 */
export function formatBangkokShiftEdge(d: Date): string {
  const bk = bangkokParts(d);
  return `${bk.day}/${bk.month} ${String(bk.hour).padStart(2, '0')}:${String(bk.minute).padStart(2, '0')}`;
}
