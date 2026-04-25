'use client';

/**
 * Design preview — "Premium Dark Amber" (speakeasy / whiskey bar)
 * Static mock — no auth, no API. Visit /preview/amber on any device.
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
  ChevronRight,
  Bell,
  User,
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
  hue: string; // for the bottle thumbnail tint
}

const MOCKS: Mock[] = [
  {
    id: '1',
    code: 'DEP-SB01-DHK0W',
    name: 'Honey',
    brand: 'Jack Daniel’s',
    remainingPercent: 0,
    daysLeft: 0,
    status: 'pending_confirm',
    table: 'A12',
    hue: '#7a3b0f',
  },
  {
    id: '2',
    code: 'DEP-SB01-MX9P2',
    name: 'Black Label 12y',
    brand: 'Johnnie Walker',
    remainingPercent: 65,
    daysLeft: 92,
    status: 'in_store',
    hue: '#3a2818',
  },
  {
    id: '3',
    code: 'DEP-SB01-RT4LK',
    name: 'Hibiki Harmony',
    brand: 'Suntory',
    remainingPercent: 32,
    daysLeft: 5,
    status: 'in_store',
    hue: '#a06b32',
  },
  {
    id: '4',
    code: 'DEP-SB01-Q8N3Z',
    name: 'Macallan 12 Double Cask',
    brand: 'The Macallan',
    remainingPercent: 80,
    daysLeft: 28,
    status: 'pending_withdrawal',
    hue: '#6b3010',
  },
];

export default function AmberPreviewPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('active');

  return (
    <div className="amber-preview min-h-screen">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-3">
        <Greeting />
        <HeroCard />
        <StatsPills />
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
      <div className="amber-bg" />
      <div className="amber-noise" aria-hidden />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md">
      <div className="border-b border-amber-200/10 bg-[#13100c]/85">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <div className="amber-monogram">
            <span>SB</span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="amber-serif text-[15px] font-semibold tracking-wide text-amber-50">
              SoundBar
            </p>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-amber-200/50">
              Bottle Keeper · Est. 2024
            </p>
          </div>
          <button className="amber-icon-btn" aria-label="Notifications">
            <Bell className="h-[17px] w-[17px]" />
            <span className="amber-dot" />
          </button>
          <button className="amber-icon-btn" aria-label="Profile">
            <User className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Greeting() {
  return (
    <div className="mb-3 mt-1">
      <p className="text-[10.5px] uppercase tracking-[0.22em] text-amber-200/50">
        Good evening
      </p>
      <h2 className="amber-serif mt-1 text-2xl font-semibold leading-tight text-amber-50">
        Khun Pat
      </h2>
    </div>
  );
}

function HeroCard() {
  return (
    <section className="relative mb-4 overflow-hidden rounded-[22px] border border-amber-200/15 bg-gradient-to-br from-[#221913] via-[#1a130d] to-[#0f0a06] p-5 shadow-2xl shadow-black/40">
      {/* Decorative bottle silhouette */}
      <svg
        viewBox="0 0 100 160"
        className="absolute -right-2 -top-2 h-44 w-28 opacity-25"
        aria-hidden
      >
        <defs>
          <linearGradient id="hero-bottle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5d28a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7a3b0f" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d="M40 8 h20 v22 c0 4 14 6 14 26 v82 c0 8 -4 12 -14 12 h-20 c-10 0 -14 -4 -14 -12 v-82 c0 -20 14 -22 14 -26 z"
          fill="url(#hero-bottle)"
          stroke="rgba(245, 200, 130, 0.5)"
          strokeWidth="0.8"
        />
        <rect x="42" y="4" width="16" height="6" rx="1.5" fill="rgba(245, 200, 130, 0.3)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent" />

      <div className="relative">
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-amber-200/55">
          Your Cellar
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="amber-serif text-5xl font-semibold leading-none text-amber-50">
            3
          </span>
          <span className="text-sm font-medium text-amber-200/70">bottles</span>
        </div>
        <p className="mt-1.5 text-[12px] text-amber-100/55">
          1 รอพนักงานยืนยัน · 1 ใกล้หมดอายุ
        </p>

        <div className="mt-5 flex items-center gap-1.5">
          <button className="amber-divider-btn group">
            <span>ดูทั้งหมด</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function StatsPills() {
  return (
    <div className="mb-5 flex items-stretch divide-x divide-amber-200/10 rounded-2xl border border-amber-200/10 bg-[#1a130d]/80 px-1 py-2.5">
      <Pill icon={<Wine className="h-3.5 w-3.5" />} label="ฝากอยู่" value="2" />
      <Pill
        icon={<Clock className="h-3.5 w-3.5" />}
        label="ใกล้หมด"
        value="1"
        accent
      />
      <Pill
        icon={<Hourglass className="h-3.5 w-3.5" />}
        label="รอดำเนินการ"
        value="1"
      />
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2">
      <div
        className={
          'flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] ' +
          (accent ? 'text-amber-300/85' : 'text-amber-200/55')
        }
      >
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={
          'amber-serif text-xl font-semibold leading-none ' +
          (accent ? 'text-amber-300' : 'text-amber-50')
        }
      >
        {value}
      </span>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative mb-3.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/40" />
      <input
        type="text"
        placeholder="ค้นหาขวดของคุณ"
        className="amber-input"
      />
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
    <div className="mb-4 inline-flex w-full rounded-full border border-amber-200/10 bg-[#0f0a06] p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            'flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-wide transition-all ' +
            (value === o.key
              ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#1a1108] shadow-sm shadow-amber-500/30'
              : 'text-amber-200/60 hover:text-amber-100')
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
    <ul className="space-y-2.5">
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
      ? 'text-rose-300/90'
      : m.daysLeft <= 7
        ? 'text-amber-300'
        : m.daysLeft <= 30
          ? 'text-amber-200/85'
          : 'text-emerald-300/85';

  return (
    <li
      className={
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-b shadow-lg shadow-black/30 transition ' +
        (isPending
          ? 'border-amber-300/20 from-amber-950/70 to-[#1a130d]'
          : 'border-amber-200/10 from-[#1c150f] to-[#13100c] hover:border-amber-200/25')
      }
    >
      <div className="flex gap-3 p-3.5">
        <BottleThumb hue={m.hue} percent={m.remainingPercent} pending={isPending} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/45">
                {m.brand}
              </p>
              <h3 className="amber-serif mt-0.5 truncate text-[15px] font-semibold text-amber-50">
                {m.name}
              </h3>
            </div>
            <StatusChip status={m.status} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <FillBar percent={m.remainingPercent} />
                <span className="amber-serif min-w-[34px] text-right text-[12px] font-semibold text-amber-100">
                  {m.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-mono text-amber-200/40">{m.code}</span>
                <span className={'font-medium ' + expiryTone}>
                  {m.daysLeft <= 0
                    ? 'หมดอายุแล้ว'
                    : m.daysLeft === 1
                      ? 'พรุ่งนี้หมด'
                      : `เหลืออีก ${m.daysLeft} วัน`}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-amber-200/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200/85">
                โต๊ะ {m.table}
              </span>
              <span className="font-mono text-[10.5px] text-amber-200/40">
                {m.code}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function BottleThumb({
  hue,
  percent,
  pending,
}: {
  hue: string;
  percent: number;
  pending?: boolean;
}) {
  const fill = pending ? 100 : Math.max(percent, 6);
  return (
    <div className="relative h-[78px] w-[44px] shrink-0 self-center">
      <svg viewBox="0 0 44 78" className="h-full w-full">
        <defs>
          <linearGradient id={`g-${hue}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={hue} stopOpacity="0.65" />
            <stop offset="0.5" stopColor={hue} />
            <stop offset="1" stopColor="#0a0705" />
          </linearGradient>
          <linearGradient id="glassEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`bottle-${fill}-${hue}`}>
            <path d="M16 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z" />
          </clipPath>
        </defs>
        {/* Liquid fill (clipped to bottle) */}
        <g clipPath={`url(#bottle-${fill}-${hue})`}>
          <rect
            x="0"
            y={78 - (fill / 100) * 60}
            width="44"
            height="78"
            fill={`url(#g-${hue})`}
          />
        </g>
        {/* Bottle outline */}
        <path
          d="M16 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z"
          fill="none"
          stroke="rgba(245, 200, 130, 0.35)"
          strokeWidth="1"
        />
        {/* Cap */}
        <rect x="17" y="2" width="10" height="5" rx="1" fill="#1a1108" stroke="rgba(245, 200, 130, 0.4)" />
        {/* Glass shine */}
        <rect x="13" y="22" width="2" height="46" fill="url(#glassEdge)" />
        {/* Label */}
        <rect
          x="11"
          y="38"
          width="22"
          height="20"
          rx="1"
          fill="rgba(250, 240, 220, 0.92)"
        />
        <line x1="13" y1="44" x2="31" y2="44" stroke="#1a1108" strokeWidth="0.6" />
        <line x1="13" y1="48" x2="27" y2="48" stroke="#1a1108" strokeWidth="0.4" />
        <line x1="13" y1="52" x2="29" y2="52" stroke="#1a1108" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function FillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-amber-950/60 ring-1 ring-inset ring-amber-200/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 shadow-[0_0_8px_rgba(245,180,90,0.5)]"
        style={{ width: `${Math.max(percent, 4)}%` }}
      />
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  if (status === 'pending_confirm') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
        <Hourglass className="h-2.5 w-2.5" />
        รอยืนยัน
      </span>
    );
  }
  if (status === 'pending_withdrawal') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
        <Clock className="h-2.5 w-2.5" />
        รอเบิก
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-300/30 bg-rose-300/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
        <AlertCircle className="h-2.5 w-2.5" />
        หมดอายุ
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
      <CheckCircle2 className="h-2.5 w-2.5" />
      พร้อมเบิก
    </span>
  );
}

function FooterLink() {
  return (
    <div className="mt-6 flex justify-center">
      <button className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/10 bg-amber-200/[0.04] px-4 py-2 text-[11.5px] font-semibold tracking-wide text-amber-200/65 hover:bg-amber-200/[0.08]">
        <History className="h-3.5 w-3.5" />
        ดูประวัติทั้งหมด
      </button>
    </div>
  );
}

function Fab() {
  return (
    <button
      className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3.5 text-sm font-bold text-[#1a1108] shadow-2xl shadow-amber-500/30 transition active:scale-95"
      aria-label="ฝากเหล้าใหม่"
    >
      <Plus className="h-4 w-4" strokeWidth={3} />
      <span className="amber-serif tracking-wide">ฝากขวดใหม่</span>
    </button>
  );
}

/* ─────────────────────── theme ─────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      .amber-preview {
        background: #0d0907;
        color: #f3e9d6;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .amber-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
          radial-gradient(80% 50% at 80% -10%, rgba(245, 180, 90, 0.18), transparent 60%),
          radial-gradient(60% 40% at 0% 30%, rgba(212, 165, 116, 0.08), transparent 70%),
          linear-gradient(180deg, #110b07 0%, #0a0705 60%, #06040a 100%);
      }
      .amber-noise {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0.4;
        mix-blend-mode: overlay;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      }
      .amber-serif {
        font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
        letter-spacing: 0.01em;
      }
      .amber-monogram {
        display: flex;
        height: 36px;
        width: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background:
          linear-gradient(135deg, #f5d28a, #c89554 50%, #6d4621);
        color: #1a1108;
        font-weight: 800;
        letter-spacing: 0.06em;
        font-size: 11px;
        box-shadow:
          inset 0 1px 0 rgba(255, 230, 180, 0.5),
          0 4px 12px rgba(150, 90, 30, 0.35);
      }
      .amber-icon-btn {
        position: relative;
        display: inline-flex;
        height: 34px;
        width: 34px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: rgba(245, 230, 200, 0.7);
        transition: all 0.15s;
      }
      .amber-icon-btn:hover {
        background: rgba(245, 200, 130, 0.08);
        color: rgb(252, 210, 140);
      }
      .amber-dot {
        position: absolute;
        top: 7px;
        right: 9px;
        height: 6px;
        width: 6px;
        border-radius: 999px;
        background: #f5b74e;
        box-shadow: 0 0 8px rgba(245, 183, 78, 0.8);
      }
      .amber-divider-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px 6px 0;
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(245, 200, 130, 0.85);
        border: none;
        background: transparent;
        cursor: pointer;
        position: relative;
      }
      .amber-divider-btn::before {
        content: '';
        width: 18px;
        height: 1px;
        background: linear-gradient(90deg, rgba(245, 200, 130, 0.55), transparent);
        margin-right: 8px;
      }
      .amber-input {
        height: 44px;
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(245, 200, 130, 0.12);
        background: rgba(15, 10, 6, 0.7);
        padding: 0 14px 0 38px;
        font-size: 13.5px;
        color: #f3e9d6;
        outline: none;
        transition: all 0.15s;
      }
      .amber-input::placeholder {
        color: rgba(245, 230, 200, 0.32);
      }
      .amber-input:focus {
        border-color: rgba(245, 200, 130, 0.4);
        background: rgba(20, 14, 9, 0.85);
        box-shadow: 0 0 0 4px rgba(245, 200, 130, 0.08);
      }
    `}</style>
  );
}
