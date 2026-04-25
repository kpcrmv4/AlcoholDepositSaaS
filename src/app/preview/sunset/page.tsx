'use client';

/**
 * Design preview — "Sunset" (tropical beach bar)
 * Static mock — no auth, no API. Visit /preview/sunset on any device.
 */

import { useState } from 'react';
import {
  Search,
  Plus,
  History,
  Hourglass,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wine,
  Bell,
  User,
  Flame,
  Sun,
} from 'lucide-react';

type Status = 'in_store' | 'pending_confirm' | 'pending_withdrawal' | 'expired';

interface Mock {
  id: string;
  code: string;
  name: string;
  brand: string;
  remainingPercent: number;
  daysLeft: number;
  status: Status;
  table?: string;
  liquid: string;
}

const MOCKS: Mock[] = [
  {
    id: '1',
    code: 'DEP-SB01-DHK0W',
    name: 'Honey',
    brand: "Jack Daniel's",
    remainingPercent: 0,
    daysLeft: 0,
    status: 'pending_confirm',
    table: 'A12',
    liquid: '#d97706',
  },
  {
    id: '2',
    code: 'DEP-SB01-MX9P2',
    name: 'Black Label 12y',
    brand: 'Johnnie Walker',
    remainingPercent: 65,
    daysLeft: 92,
    status: 'in_store',
    liquid: '#92400e',
  },
  {
    id: '3',
    code: 'DEP-SB01-RT4LK',
    name: 'Hibiki Harmony',
    brand: 'Suntory',
    remainingPercent: 32,
    daysLeft: 5,
    status: 'in_store',
    liquid: '#ea580c',
  },
  {
    id: '4',
    code: 'DEP-SB01-Q8N3Z',
    name: 'Macallan 12y',
    brand: 'The Macallan',
    remainingPercent: 80,
    daysLeft: 28,
    status: 'pending_withdrawal',
    liquid: '#b45309',
  },
];

export default function SunsetPreviewPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('active');

  return (
    <div className="sunset-preview min-h-screen overflow-hidden">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-3">
        <Greeting />
        <HeroCard />
        <StatsRow />
        <SearchBar />
        <SegmentedFilter value={filter} onChange={setFilter} />
        <BottleList />
        <FooterLink />
      </main>
      <Fab />
      <Styles />
    </div>
  );
}

/* ─────────────────────── pieces ─────────────────────── */

function Background() {
  return (
    <>
      <div className="sunset-sky" />
      <div className="sunset-sun" />
      <div className="sunset-water" />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md">
      <div className="border-b border-white/30 bg-gradient-to-b from-orange-50/85 to-rose-50/70">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <div className="sunset-logo">
            <Sun className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="sunset-display text-[16px] font-extrabold text-orange-950">
              SoundBar
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700/70">
              Beach Cellar · Aloha
            </p>
          </div>
          <button className="sunset-icon-btn" aria-label="Notifications">
            <Bell className="h-[16px] w-[16px]" />
            <span className="sunset-dot" />
          </button>
          <button className="sunset-icon-btn" aria-label="Profile">
            <User className="h-[16px] w-[16px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Greeting() {
  return (
    <div className="mb-3 mt-1">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-orange-600">
        ☼ Aloha · เย็นนี้
      </p>
      <h2 className="sunset-display mt-1 text-[26px] font-black leading-tight text-orange-950">
        Khun Pat
      </h2>
      <p className="mt-1 text-[12.5px] font-medium text-orange-900/65">
        ฟ้ากำลังเปลี่ยนสี · 3 ขวดของคุณรออยู่
      </p>
    </div>
  );
}

function HeroCard() {
  return (
    <section className="relative mb-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-300 via-rose-300 to-amber-200 p-5 shadow-xl shadow-orange-300/40">
      {/* Sun decoration */}
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-200 to-orange-300 opacity-90 blur-md" />
      <div className="absolute right-2 top-2 h-20 w-20 rounded-full border-2 border-white/50" />

      <div className="relative">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-orange-950/70">
          Your Cellar
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="sunset-display text-[60px] font-black leading-none text-orange-950 drop-shadow-sm">
            3
          </span>
          <span className="text-[13px] font-extrabold uppercase tracking-wide text-orange-900/75">
            bottles
          </span>
        </div>
        <p className="mt-1 text-[12px] font-semibold text-orange-900/65">
          เก็บไว้ที่ SoundBar 🌴
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Pill icon={<Hourglass className="h-3 w-3" />} text="1 รอยืนยัน" />
          <Pill icon={<Flame className="h-3 w-3" />} text="1 ใกล้หมด" />
        </div>
      </div>
    </section>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/40 px-3 py-1 text-[11px] font-bold text-orange-950 backdrop-blur-sm">
      {icon}
      {text}
    </span>
  );
}

function StatsRow() {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5">
      <Stat label="ฝากอยู่" value="2" icon={<Wine className="h-4 w-4" />} accent="orange" />
      <Stat label="ใกล้หมด" value="1" icon={<Flame className="h-4 w-4" />} accent="rose" />
      <Stat label="รอเบิก" value="1" icon={<Hourglass className="h-4 w-4" />} accent="teal" />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'orange' | 'rose' | 'teal';
}) {
  const palette = {
    orange: { bg: 'from-orange-100 to-amber-50', icon: 'bg-orange-200 text-orange-700', text: 'text-orange-950' },
    rose: { bg: 'from-rose-100 to-orange-50', icon: 'bg-rose-200 text-rose-700', text: 'text-rose-950' },
    teal: { bg: 'from-teal-100 to-cyan-50', icon: 'bg-teal-200 text-teal-700', text: 'text-teal-950' },
  }[accent];

  return (
    <div
      className={
        'relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br p-3.5 shadow-md shadow-orange-200/40 ' +
        palette.bg
      }
    >
      <div
        className={
          'absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full ' +
          palette.icon
        }
      >
        {icon}
      </div>
      <div className="flex flex-col items-end text-right">
        <p className={'sunset-display text-3xl font-black leading-none ' + palette.text}>
          {value}
        </p>
        <p className={'mt-2 text-[10.5px] font-bold uppercase tracking-wider ' + palette.text + ' opacity-65'}>
          {label}
        </p>
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative mb-3.5">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
      <input type="text" placeholder="ค้นหาขวดของคุณ" className="sunset-input" />
    </div>
  );
}

function SegmentedFilter({
  value,
  onChange,
}: {
  value: 'all' | 'active' | 'history';
  onChange: (v: 'all' | 'active' | 'history') => void;
}) {
  const opts: { key: 'all' | 'active' | 'history'; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'active', label: 'ฝากอยู่' },
    { key: 'history', label: 'ประวัติ' },
  ];
  return (
    <div className="mb-4 flex gap-1.5 rounded-full border border-white/70 bg-white/55 p-1 backdrop-blur-sm">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            'flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[12.5px] font-bold tracking-wide transition-all ' +
            (value === o.key
              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-400/40'
              : 'text-orange-900/60 hover:text-orange-900')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BottleList() {
  return (
    <ul className="space-y-3">
      {MOCKS.map((m) => (
        <BottleCard key={m.id} m={m} />
      ))}
    </ul>
  );
}

function BottleCard({ m }: { m: Mock }) {
  const isPending = m.status === 'pending_confirm';
  const expiryTone =
    m.daysLeft <= 0
      ? 'text-red-700'
      : m.daysLeft <= 7
        ? 'text-rose-600'
        : m.daysLeft <= 30
          ? 'text-amber-700'
          : 'text-teal-700';

  return (
    <li
      className={
        'relative overflow-hidden rounded-[22px] border bg-white p-3.5 shadow-md shadow-orange-200/40 ' +
        (isPending ? 'border-amber-300/70 bg-amber-50/85' : 'border-white')
      }
    >
      {/* Soft sunset edge */}
      <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-200/60 to-transparent blur-2xl" />

      <div className="relative flex gap-3">
        <SunsetBottle liquid={m.liquid} percent={isPending ? 100 : m.remainingPercent} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700/75">
                {m.brand}
              </p>
              <h3 className="sunset-display mt-0.5 truncate text-[16px] font-black text-orange-950">
                {m.name}
              </h3>
            </div>
            <StatusChip status={m.status} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-2.5 flex items-center gap-2.5">
                <SunsetFillBar percent={m.remainingPercent} />
                <span className="sunset-display min-w-[36px] text-right text-[13px] font-black text-orange-950">
                  {m.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-mono text-orange-800/45">{m.code}</span>
                <span className={'font-bold ' + expiryTone}>
                  {m.daysLeft <= 0
                    ? 'หมดอายุ'
                    : m.daysLeft === 1
                      ? 'พรุ่งนี้หมด'
                      : `${m.daysLeft} วัน`}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full border border-amber-400/60 bg-white/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                โต๊ะ {m.table}
              </span>
              <span className="font-mono text-[10.5px] text-orange-800/45">
                {m.code}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SunsetBottle({ liquid, percent }: { liquid: string; percent: number }) {
  const fill = Math.max(percent, 6);
  return (
    <div className="relative h-[78px] w-[42px] shrink-0 self-center">
      <div
        className="absolute -inset-1 rounded-full opacity-30 blur-xl"
        style={{ background: liquid }}
      />
      <svg viewBox="0 0 42 78" className="relative h-full w-full">
        <defs>
          <linearGradient id={`sun-g-${liquid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={liquid} stopOpacity="1" />
            <stop offset="1" stopColor={liquid} stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={`sun-clip-${fill}-${liquid}`}>
            <path d="M15 4 h12 v13 c0 2 6 4 6 11 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -7 6 -9 6 -11 z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#sun-clip-${fill}-${liquid})`}>
          <rect
            x="0"
            y={78 - (fill / 100) * 60}
            width="42"
            height="78"
            fill={`url(#sun-g-${liquid})`}
          />
        </g>
        {/* Outline */}
        <path
          d="M15 4 h12 v13 c0 2 6 4 6 11 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -7 6 -9 6 -11 z"
          fill="none"
          stroke="#7c2d12"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Cap */}
        <rect x="16" y="2" width="10" height="5" rx="1.5" fill="#7c2d12" />
        {/* Tropical label with palm */}
        <rect
          x="11"
          y="38"
          width="20"
          height="18"
          rx="2"
          fill="#fff7ed"
          stroke="#7c2d12"
          strokeWidth="0.6"
        />
        {/* Sun on label */}
        <circle cx="21" cy="44" r="2.5" fill="#f97316" />
        <line x1="13" y1="50" x2="29" y2="50" stroke="#7c2d12" strokeWidth="0.4" />
        <line x1="14" y1="53" x2="28" y2="53" stroke="#7c2d12" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function SunsetFillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-amber-400 shadow-sm"
        style={{ width: `${Math.max(percent, 4)}%` }}
      />
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map = {
    pending_confirm: {
      label: 'รอยืนยัน',
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-amber-400/60 bg-amber-100 text-amber-800',
    },
    pending_withdrawal: {
      label: 'รอเบิก',
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-teal-400/60 bg-teal-100 text-teal-800',
    },
    expired: {
      label: 'หมดอายุ',
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-red-400/60 bg-red-100 text-red-800',
    },
    in_store: {
      label: 'พร้อมเบิก',
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-emerald-400/60 bg-emerald-100 text-emerald-800',
    },
  }[status];
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ' +
        map.cls
      }
    >
      {map.icon}
      {map.label}
    </span>
  );
}

function FooterLink() {
  return (
    <div className="mt-6 flex justify-center">
      <button className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/65 px-4 py-2 text-[11.5px] font-bold tracking-wide text-orange-900 backdrop-blur-sm hover:bg-white/85">
        <History className="h-3.5 w-3.5" />
        ดูประวัติทั้งหมด
      </button>
    </div>
  );
}

function Fab() {
  return (
    <button
      className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-400/50 transition active:scale-95"
      aria-label="ฝากเหล้าใหม่"
    >
      <Plus className="h-4 w-4" strokeWidth={3} />
      <span className="sunset-display tracking-wide">ฝากขวดใหม่</span>
    </button>
  );
}

/* ─────────────────────── theme ─────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      .sunset-preview {
        background: #fff7ed;
        color: #431407;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .sunset-sky {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
          linear-gradient(
            180deg,
            #fed7aa 0%,
            #fecaca 28%,
            #fda4af 50%,
            #fde68a 78%,
            #fef3c7 100%
          );
      }
      .sunset-sun {
        position: fixed;
        top: 32%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
        height: 320px;
        width: 320px;
        border-radius: 999px;
        background: radial-gradient(
          circle,
          #fef08a 0%,
          rgba(254, 215, 170, 0.4) 40%,
          transparent 70%
        );
        pointer-events: none;
      }
      .sunset-water {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 28%;
        z-index: 1;
        background: linear-gradient(
          180deg,
          rgba(254, 202, 202, 0.6) 0%,
          rgba(252, 165, 165, 0.7) 30%,
          rgba(248, 113, 113, 0.85) 100%
        );
        pointer-events: none;
      }
      .sunset-water::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.18) 0px,
          rgba(255, 255, 255, 0.18) 1px,
          transparent 1px,
          transparent 8px
        );
      }
      .sunset-display {
        font-family: 'Fraunces', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.015em;
      }
      .sunset-logo {
        display: flex;
        height: 36px;
        width: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: linear-gradient(135deg, #fb923c 0%, #f43f5e 100%);
        color: #fff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.5),
          0 4px 12px rgba(251, 146, 60, 0.45);
      }
      .sunset-icon-btn {
        position: relative;
        display: inline-flex;
        height: 32px;
        width: 32px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: #c2410c;
        transition: all 0.15s;
      }
      .sunset-icon-btn:hover {
        background: rgba(251, 146, 60, 0.15);
        color: #7c2d12;
      }
      .sunset-dot {
        position: absolute;
        top: 7px;
        right: 8px;
        height: 6px;
        width: 6px;
        border-radius: 999px;
        background: #f43f5e;
        box-shadow: 0 0 0 2px #fff7ed;
      }
      .sunset-input {
        height: 46px;
        width: 100%;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.85);
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(8px);
        padding: 0 16px 0 42px;
        font-size: 13.5px;
        font-weight: 500;
        color: #431407;
        outline: none;
        transition: all 0.15s;
        box-shadow: 0 4px 14px rgba(251, 146, 60, 0.18);
      }
      .sunset-input::placeholder {
        color: rgba(124, 45, 18, 0.45);
      }
      .sunset-input:focus {
        border-color: #fb923c;
        background: rgba(255, 255, 255, 0.95);
      }
    `}</style>
  );
}
