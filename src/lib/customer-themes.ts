/**
 * Customer-facing LIFF theme registry.
 *
 * Each tenant's branch (store) can pick one theme via stores.customer_theme.
 * The keys here map to /preview/{key} mock pages and to the eventual
 * customer page renderer (Phase 2 — apply per-store theme to /t/{slug}/customer).
 */

export type CustomerThemeKey = 'amber' | 'neon' | 'sumi' | 'sunset' | 'crimson';

export interface CustomerThemeMeta {
  key: CustomerThemeKey;
  label: string;
  tagline: string;
  description: string;
  /** Accent color used in the picker thumbnail. */
  swatch: string[];
  /** Tailwind classes for the preview card border on the picker. */
  borderClass: string;
  /** Tailwind background gradient classes for the preview card. */
  bgClass: string;
  textClass: string;
}

export const CUSTOMER_THEMES: Record<CustomerThemeKey, CustomerThemeMeta> = {
  amber: {
    key: 'amber',
    label: 'Premium Amber',
    tagline: 'Speakeasy · Whiskey bar',
    description: 'อบอุ่น คลาสสิก สีอำพันบนพื้นดำเข้ม รู้สึกหรูแบบบาร์ลับ',
    swatch: ['#1a1108', '#7a3b0f', '#d4a574', '#f5d28a'],
    borderClass: 'border-amber-500/30',
    bgClass: 'from-[#1a1108] to-[#0a0705]',
    textClass: 'text-amber-50',
  },
  neon: {
    key: 'neon',
    label: 'Neon Nightlife',
    tagline: 'Club · Late-night',
    description: 'สีนีออน coral + lavender + cyan สนุก ตื่นเต้น เหมาะร้านที่มีกิจกรรมกลางคืน',
    swatch: ['#06051a', '#a786df', '#f25f4c', '#5cd6ff'],
    borderClass: 'border-fuchsia-500/30',
    bgClass: 'from-[#1a0e2e] to-[#06051a]',
    textClass: 'text-violet-100',
  },
  sumi: {
    key: 'sumi',
    label: 'Sumi Minimal',
    tagline: 'Japanese izakaya',
    description: 'มินิมัล สงบ พื้นกระดาษวาชิ + ตัวอักษร serif มี accent สีแดงอินคัง',
    swatch: ['#fbf7ef', '#1c1917', '#9b2c2c', '#d6d3d1'],
    borderClass: 'border-stone-300',
    bgClass: 'from-[#fbf7ef] to-[#f5efe2]',
    textClass: 'text-stone-900',
  },
  sunset: {
    key: 'sunset',
    label: 'Tropical Sunset',
    tagline: 'Beach bar · Aloha',
    description: 'ฟ้ายามเย็น peach + coral + teal สดใสเป็นมิตร เหมาะร้านบีช/แสนสบาย',
    swatch: ['#fed7aa', '#fda4af', '#fb923c', '#0d9488'],
    borderClass: 'border-orange-300',
    bgClass: 'from-orange-200 via-rose-200 to-amber-100',
    textClass: 'text-orange-950',
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson Wine',
    tagline: 'Wine bar · Vintage',
    description: 'พื้นแดงไวน์เข้ม + กระดาษครีม + ตัวอักษรวาดมือ casual สไตล์ wine bar/bistro',
    swatch: ['#7a1a1a', '#faf3e8', '#a52a2a', '#3d0a0a'],
    borderClass: 'border-red-900/40',
    bgClass: 'from-[#7a1a1a] to-[#3d0a0a]',
    textClass: 'text-red-50',
  },
};

export const CUSTOMER_THEME_LIST: CustomerThemeMeta[] = [
  CUSTOMER_THEMES.amber,
  CUSTOMER_THEMES.neon,
  CUSTOMER_THEMES.sumi,
  CUSTOMER_THEMES.sunset,
  CUSTOMER_THEMES.crimson,
];

export const DEFAULT_CUSTOMER_THEME: CustomerThemeKey = 'amber';

export function isCustomerTheme(value: unknown): value is CustomerThemeKey {
  return (
    typeof value === 'string' &&
    (value === 'amber' ||
      value === 'neon' ||
      value === 'sumi' ||
      value === 'sunset' ||
      value === 'crimson')
  );
}
