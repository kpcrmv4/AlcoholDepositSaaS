'use client';

/**
 * Design preview — "Sumi" (Japanese minimalist / izakaya)
 * Static mock — no auth, no API. Visit /preview/sumi on any device.
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
  Bell,
  User,
  ArrowUpRight,
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
  },
  {
    id: '2',
    code: 'DEP-SB01-MX9P2',
    name: 'Black Label 12y',
    brand: 'Johnnie Walker',
    remainingPercent: 65,
    daysLeft: 92,
    status: 'in_store',
  },
  {
    id: '3',
    code: 'DEP-SB01-RT4LK',
    name: 'Hibiki Harmony',
    brand: 'Suntory',
    remainingPercent: 32,
    daysLeft: 5,
    status: 'in_store',
  },
  {
    id: '4',
    code: 'DEP-SB01-Q8N3Z',
    name: 'Macallan 12y',
    brand: 'The Macallan',
    remainingPercent: 80,
    daysLeft: 28,
    status: 'pending_withdrawal',
  },
];

export default function SumiPreviewPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('active');

  return (
    <div className="sumi-preview min-h-screen">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-md px-6 pb-32 pt-6">
        <Greeting />
        <HeroBlock />
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
  return <div className="sumi-paper" aria-hidden />;
}

function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md">
      <div className="border-b border-stone-300/40 bg-[#fbf7ef]/85">
        <div className="mx-auto flex max-w-md items-center gap-3 px-6 py-3.5">
          <div className="sumi-seal">
            <span>蔵</span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="sumi-serif text-[16px] font-medium text-stone-900">
              SoundBar
            </p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Bottle Cellar · 酒蔵
            </p>
          </div>
          <button className="sumi-icon-btn" aria-label="Notifications">
            <Bell className="h-[16px] w-[16px]" />
            <span className="sumi-dot" />
          </button>
          <button className="sumi-icon-btn" aria-label="Profile">
            <User className="h-[16px] w-[16px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Greeting() {
  return (
    <div className="mb-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">
        ・ Konbanwa ・
      </p>
      <h2 className="sumi-serif mt-1.5 text-[26px] font-semibold leading-tight text-stone-900">
        Khun Pat
      </h2>
      <p className="mt-1 text-[12.5px] text-stone-500">
        ยินดีต้อนรับกลับสู่ห้องเก็บขวดของคุณ
      </p>
    </div>
  );
}

function HeroBlock() {
  return (
    <section className="mb-7 border-y border-stone-300/60 py-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
            Your Cellar
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="sumi-serif text-[64px] font-light leading-[0.85] text-stone-900">
              3
            </span>
            <span className="text-[13px] font-medium text-stone-600">
              bottles
            </span>
          </div>
          <p className="mt-2 text-[12px] text-stone-500">
            kept by SoundBar · Estd. 2024
          </p>
        </div>
        <button className="sumi-text-link group inline-flex items-center gap-1 self-start pt-2">
          ดูทั้งหมด
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </section>
  );
}

function StatsRow() {
  return (
    <div className="mb-7 grid grid-cols-3 gap-0">
      <Stat label="ฝากอยู่" value="2" />
      <Stat label="ใกล้หมด" value="1" accent />
      <Stat label="รอเบิก" value="1" />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-l border-stone-300/60 px-4 first:border-l-0 first:pl-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p
        className={
          'sumi-serif mt-1.5 text-[28px] font-light leading-none ' +
          (accent ? 'sumi-accent-text' : 'text-stone-900')
        }
      >
        {value}
        {accent && <span className="sumi-tick" />}
      </p>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        placeholder="ค้นหาขวดของคุณ"
        className="sumi-input"
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
    <div className="mb-6 flex gap-6 border-b border-stone-300/60">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            'relative -mb-px pb-3 text-[12.5px] font-medium tracking-wide transition-colors ' +
            (value === o.key
              ? 'text-stone-900'
              : 'text-stone-400 hover:text-stone-600')
          }
        >
          {o.label}
          {value === o.key && (
            <span className="absolute inset-x-0 -bottom-px h-[2px] bg-stone-900" />
          )}
        </button>
      ))}
    </div>
  );
}

function BottleList() {
  return (
    <ul className="divide-y divide-stone-300/50">
      {MOCKS.map((m) => (
        <BottleRow key={m.id} m={m} />
      ))}
    </ul>
  );
}

function BottleRow({ m }: { m: Mock }) {
  const isPending = m.status === 'pending_confirm';
  const expiryTone =
    m.daysLeft <= 0
      ? 'text-red-700'
      : m.daysLeft <= 7
        ? 'text-red-600'
        : m.daysLeft <= 30
          ? 'text-amber-700'
          : 'text-stone-600';

  return (
    <li className="group py-4">
      <div className="flex items-start gap-4">
        <BottleLineArt
          percent={isPending ? 100 : m.remainingPercent}
          pending={isPending}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                {m.brand}
              </p>
              <h3 className="sumi-serif mt-0.5 truncate text-[17px] font-medium text-stone-900">
                {m.name}
              </h3>
            </div>
            <StatusInkChip status={m.status} />
          </div>

          {!isPending ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <SumiFillBar percent={m.remainingPercent} />
                <span className="sumi-serif min-w-[34px] text-right text-[13px] font-medium tabular-nums text-stone-900">
                  {m.remainingPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-mono text-stone-400">{m.code}</span>
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
              <span className="border border-stone-300/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-700">
                โต๊ะ {m.table}
              </span>
              <span className="font-mono text-[10.5px] text-stone-400">
                {m.code}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function BottleLineArt({
  percent,
  pending,
}: {
  percent: number;
  pending?: boolean;
}) {
  const fill = Math.max(percent, 6);
  return (
    <div className="relative h-[64px] w-[36px] shrink-0">
      <svg viewBox="0 0 36 64" className="h-full w-full">
        <defs>
          <clipPath id={`sumi-clip-${fill}`}>
            <path d="M13 4 h10 v10 c0 2 5 3 5 10 v32 c0 3 -2 4 -5 4 h-10 c-3 0 -5 -1 -5 -4 v-32 c0 -7 5 -8 5 -10 z" />
          </clipPath>
        </defs>
        {/* Liquid */}
        <g clipPath={`url(#sumi-clip-${fill})`}>
          <rect
            x="0"
            y={64 - (fill / 100) * 50}
            width="36"
            height="64"
            fill={pending ? '#d4d0c5' : '#2c2823'}
            opacity={pending ? '0.4' : '0.85'}
          />
        </g>
        {/* Outline (sumi ink stroke) */}
        <path
          d="M13 4 h10 v10 c0 2 5 3 5 10 v32 c0 3 -2 4 -5 4 h-10 c-3 0 -5 -1 -5 -4 v-32 c0 -7 5 -8 5 -10 z"
          fill="none"
          stroke="#1c1917"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Cap */}
        <rect x="14" y="2" width="8" height="4" fill="#1c1917" />
        {/* Label band */}
        <rect
          x="9"
          y="32"
          width="18"
          height="14"
          fill="#fbf7ef"
          stroke="#1c1917"
          strokeWidth="0.8"
        />
        <line x1="11" y1="37" x2="25" y2="37" stroke="#1c1917" strokeWidth="0.5" />
        <line x1="11" y1="40" x2="22" y2="40" stroke="#1c1917" strokeWidth="0.4" />
      </svg>
    </div>
  );
}

function SumiFillBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-[2px] flex-1 bg-stone-300/60">
      <div
        className="absolute inset-y-0 left-0 bg-stone-900"
        style={{ width: `${Math.max(percent, 4)}%` }}
      />
      <div
        className="absolute -top-[3px] h-2 w-px bg-stone-900"
        style={{ left: `${Math.max(percent, 4)}%` }}
      />
    </div>
  );
}

function StatusInkChip({ status }: { status: Status }) {
  const map = {
    pending_confirm: {
      label: 'รอยืนยัน',
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-amber-700/40 text-amber-800 bg-amber-50',
    },
    pending_withdrawal: {
      label: 'รอเบิก',
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-stone-700/40 text-stone-700 bg-stone-100',
    },
    expired: {
      label: 'หมดอายุ',
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-red-700/40 text-red-700 bg-red-50',
    },
    in_store: {
      label: 'พร้อมเบิก',
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-stone-300 text-stone-600 bg-transparent',
    },
  }[status];
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ' +
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
    <div className="mt-8 flex justify-center">
      <button className="sumi-text-link inline-flex items-center gap-1.5 text-[11.5px]">
        <History className="h-3.5 w-3.5" />
        ดูประวัติทั้งหมด
      </button>
    </div>
  );
}

function Fab() {
  return (
    <button
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-stone-900 px-5 py-3.5 text-sm font-medium tracking-wide text-stone-50 shadow-xl shadow-stone-900/15 transition active:scale-95"
      aria-label="ฝากเหล้าใหม่"
      style={{ borderRadius: '2px' }}
    >
      <Plus className="h-4 w-4" strokeWidth={2.4} />
      <span className="sumi-serif">ฝากขวดใหม่</span>
    </button>
  );
}

/* ─────────────────────── theme ─────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      .sumi-preview {
        background: #fbf7ef;
        color: #1c1917;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .sumi-paper {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
          radial-gradient(ellipse at 80% 0%, rgba(149, 115, 79, 0.05), transparent 60%),
          radial-gradient(ellipse at 0% 100%, rgba(120, 53, 15, 0.04), transparent 60%),
          #fbf7ef;
      }
      .sumi-paper::after {
        content: '';
        position: absolute;
        inset: 0;
        opacity: 0.5;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      }
      .sumi-serif {
        font-family: 'Cormorant Garamond', 'Noto Serif JP', 'Playfair Display', Georgia, serif;
        letter-spacing: 0;
      }
      .sumi-seal {
        display: flex;
        height: 36px;
        width: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        background: #9b2c2c;
        color: #fbf7ef;
        font-family: 'Noto Serif JP', serif;
        font-size: 18px;
        font-weight: 600;
        box-shadow:
          inset 0 0 0 1.5px #fbf7ef,
          inset 0 0 0 2.5px #9b2c2c,
          0 1px 2px rgba(120, 30, 30, 0.3);
      }
      .sumi-icon-btn {
        position: relative;
        display: inline-flex;
        height: 32px;
        width: 32px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: #57534e;
        transition: all 0.15s;
      }
      .sumi-icon-btn:hover {
        background: rgba(28, 25, 23, 0.06);
        color: #1c1917;
      }
      .sumi-dot {
        position: absolute;
        top: 7px;
        right: 8px;
        height: 5px;
        width: 5px;
        border-radius: 999px;
        background: #9b2c2c;
      }
      .sumi-text-link {
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 0.05em;
        color: #1c1917;
        position: relative;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px 0;
        border-bottom: 1px solid #1c1917;
      }
      .sumi-text-link:hover {
        opacity: 0.7;
      }
      .sumi-input {
        height: 44px;
        width: 100%;
        border: 0;
        border-bottom: 1px solid #d6d3d1;
        background: transparent;
        padding: 0 0 0 24px;
        font-size: 14px;
        color: #1c1917;
        outline: none;
        transition: border 0.15s;
      }
      .sumi-input::placeholder {
        color: #a8a29e;
      }
      .sumi-input:focus {
        border-bottom-color: #1c1917;
      }
      .sumi-accent-text {
        color: #9b2c2c;
        position: relative;
        display: inline-flex;
        align-items: baseline;
      }
      .sumi-tick {
        display: inline-block;
        margin-left: 4px;
        height: 5px;
        width: 5px;
        border-radius: 999px;
        background: #9b2c2c;
      }
    `}</style>
  );
}
