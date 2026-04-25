'use client';

/**
 * Design preview — "Neon Nightlife" (club / late-night vibes)
 * Static mock — no auth, no API. Visit /preview/neon on any device.
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
  Sparkles,
  Bell,
  User,
  Wine,
  Flame,
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
  glow: string;
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
    glow: '#f25f4c',
  },
  {
    id: '2',
    code: 'DEP-SB01-MX9P2',
    name: 'Black Label 12y',
    brand: 'Johnnie Walker',
    remainingPercent: 65,
    daysLeft: 92,
    status: 'in_store',
    glow: '#a786df',
  },
  {
    id: '3',
    code: 'DEP-SB01-RT4LK',
    name: 'Hibiki Harmony',
    brand: 'Suntory',
    remainingPercent: 32,
    daysLeft: 5,
    status: 'in_store',
    glow: '#ff8a5c',
  },
  {
    id: '4',
    code: 'DEP-SB01-Q8N3Z',
    name: 'Macallan 12y',
    brand: 'The Macallan',
    remainingPercent: 80,
    daysLeft: 28,
    status: 'pending_withdrawal',
    glow: '#5cd6ff',
  },
];

export default function NeonPreviewPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('active');

  return (
    <div className="neon-preview min-h-screen overflow-hidden">
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
      <div className="neon-bg" />
      <div className="neon-blob neon-blob-1" />
      <div className="neon-blob neon-blob-2" />
      <div className="neon-grid" aria-hidden />
    </>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20">
      <div className="border-b border-white/[0.06] bg-[#0a0916]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <div className="neon-logo">
            <Wine className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="neon-display text-[15px] font-bold text-white">
              SOUNDBAR
            </p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/55">
              <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
              Bottle keeper
            </p>
          </div>
          <button className="neon-icon-btn" aria-label="Notifications">
            <Bell className="h-[17px] w-[17px]" />
            <span className="neon-dot" />
          </button>
          <button className="neon-icon-btn" aria-label="Profile">
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-300/70">
        ★ Tonight
      </p>
      <h2 className="neon-display mt-1 text-[26px] font-black leading-tight text-white">
        เย็นนี้ดื่มอะไรดี <span className="neon-text-coral">?</span>
      </h2>
      <p className="mt-1 text-[12px] text-violet-200/55">
        Khun Pat · 3 ขวดในห้องเก็บของคุณ
      </p>
    </div>
  );
}

function HeroCard() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-3xl p-[1.5px]">
      <div className="neon-border-glow" />
      <div className="relative rounded-[22px] bg-[#0d0b1a]/95 p-5">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-4 left-0 h-24 w-24 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="neon-pulse-dot" />
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/75">
              Your Cellar · Live
            </p>
          </div>

          <div className="mt-3 flex items-end gap-3">
            <span className="neon-display neon-text-gradient text-[64px] font-black leading-none">
              3
            </span>
            <div className="pb-1.5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-violet-200/70">
                bottles
              </p>
              <p className="mt-0.5 text-[11px] text-violet-200/45">
                kept by SoundBar
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Tag color="fuchsia">
              <Hourglass className="h-3 w-3" /> 1 รอยืนยัน
            </Tag>
            <Tag color="cyan">
              <Clock className="h-3 w-3" /> 1 ใกล้หมด
            </Tag>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: 'fuchsia' | 'cyan';
}) {
  const styles =
    color === 'fuchsia'
      ? 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_16px_rgba(232,121,249,0.18)]'
      : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.18)]';
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ' +
        styles
      }
    >
      {children}
    </span>
  );
}

function StatsRow() {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5">
      <Stat label="ฝากอยู่" value="2" icon={<Wine className="h-4 w-4" />} accent="violet" />
      <Stat label="ใกล้หมด" value="1" icon={<Flame className="h-4 w-4" />} accent="coral" />
      <Stat label="รอเบิก" value="1" icon={<Hourglass className="h-4 w-4" />} accent="cyan" />
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
  accent: 'violet' | 'coral' | 'cyan';
}) {
  const palette = {
    violet: {
      ring: 'ring-violet-400/30',
      glow: 'shadow-[0_0_24px_rgba(167,134,223,0.25)]',
      icon: 'text-violet-300',
      bg: 'from-violet-500/15 to-transparent',
    },
    coral: {
      ring: 'ring-rose-400/30',
      glow: 'shadow-[0_0_24px_rgba(242,95,76,0.28)]',
      icon: 'text-rose-300',
      bg: 'from-rose-500/15 to-transparent',
    },
    cyan: {
      ring: 'ring-cyan-400/30',
      glow: 'shadow-[0_0_24px_rgba(103,232,249,0.22)]',
      icon: 'text-cyan-300',
      bg: 'from-cyan-500/15 to-transparent',
    },
  }[accent];

  return (
    <div
      className={
        'relative overflow-hidden rounded-2xl bg-gradient-to-br ' +
        palette.bg +
        ' border border-white/[0.06] bg-[#0d0b1a]/60 p-3 ring-1 ring-inset ' +
        palette.ring +
        ' ' +
        palette.glow
      }
    >
      <div className={'absolute left-3 top-3 ' + palette.icon}>{icon}</div>
      <div className="flex flex-col items-end text-right">
        <p className="neon-display text-3xl font-black leading-none text-white">
          {value}
        </p>
        <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-wider text-violet-200/55">
          {label}
        </p>
      </div>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative mb-3.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-300/45" />
      <input
        type="text"
        placeholder="ค้นหาขวด หรือใส่รหัสฝาก"
        className="neon-input"
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
    <div className="mb-4 flex w-full gap-1.5 rounded-full border border-white/[0.06] bg-[#0d0b1a]/70 p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            'flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-bold tracking-wide transition-all ' +
            (value === o.key
              ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-[0_0_20px_rgba(232,121,249,0.45)]'
              : 'text-violet-200/55 hover:text-white')
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
      ? 'text-rose-300'
      : m.daysLeft <= 7
        ? 'text-rose-300'
        : m.daysLeft <= 30
          ? 'text-amber-300'
          : 'text-cyan-300';

  return (
    <li className="relative">
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-50 blur-md"
        style={{
          background: `radial-gradient(60% 60% at 30% 50%, ${m.glow}38, transparent 70%)`,
        }}
      />
      <div
        className={
          'relative overflow-hidden rounded-2xl border bg-[#0d0b1a]/85 p-3.5 backdrop-blur-sm ' +
          (isPending
            ? 'border-rose-400/25 ring-1 ring-rose-400/10'
            : 'border-white/[0.07]')
        }
      >
        <div className="flex gap-3">
          <NeonBottle glow={m.glow} percent={isPending ? 100 : m.remainingPercent} />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/45">
                  {m.brand}
                </p>
                <h3 className="neon-display mt-0.5 truncate text-[15px] font-bold text-white">
                  {m.name}
                </h3>
              </div>
              <StatusChip status={m.status} />
            </div>

            {!isPending ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <NeonFillBar percent={m.remainingPercent} glow={m.glow} />
                  <span className="neon-display min-w-[36px] text-right text-[12px] font-bold text-white">
                    {m.remainingPercent}%
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-violet-200/35">{m.code}</span>
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
                <span className="rounded-md border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                  โต๊ะ {m.table}
                </span>
                <span className="font-mono text-[10.5px] text-violet-200/35">
                  {m.code}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function NeonBottle({ glow, percent }: { glow: string; percent: number }) {
  const fill = Math.max(percent, 6);
  return (
    <div className="relative h-[80px] w-[42px] shrink-0 self-center">
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: glow, opacity: 0.35 }}
      />
      <svg viewBox="0 0 42 80" className="relative h-full w-full">
        <defs>
          <linearGradient id={`ng-${glow}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={glow} stopOpacity="0.95" />
            <stop offset="1" stopColor={glow} stopOpacity="0.55" />
          </linearGradient>
          <clipPath id={`nclip-${fill}-${glow}`}>
            <path d="M15 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z" />
          </clipPath>
        </defs>
        {/* Liquid */}
        <g clipPath={`url(#nclip-${fill}-${glow})`}>
          <rect
            x="0"
            y={80 - (fill / 100) * 60}
            width="42"
            height="80"
            fill={`url(#ng-${glow})`}
          />
        </g>
        {/* Outline */}
        <path
          d="M15 4 h12 v14 c0 2 6 4 6 12 v40 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-40 c0 -8 6 -10 6 -12 z"
          fill="none"
          stroke={glow}
          strokeWidth="1"
          opacity="0.85"
        />
        {/* Cap */}
        <rect
          x="16"
          y="2"
          width="10"
          height="5"
          rx="1"
          fill="#1a1832"
          stroke={glow}
          strokeWidth="0.6"
        />
        {/* Label */}
        <rect
          x="11"
          y="40"
          width="20"
          height="18"
          rx="1"
          fill="rgba(13, 11, 26, 0.85)"
          stroke={glow}
          strokeOpacity="0.4"
          strokeWidth="0.5"
        />
        <line x1="13" y1="46" x2="29" y2="46" stroke={glow} strokeWidth="0.5" opacity="0.7" />
        <line x1="13" y1="50" x2="25" y2="50" stroke={glow} strokeWidth="0.4" opacity="0.5" />
      </svg>
    </div>
  );
}

function NeonFillBar({ percent, glow }: { percent: number; glow: string }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(percent, 4)}%`,
          background: `linear-gradient(90deg, ${glow}, #fff)`,
          boxShadow: `0 0 12px ${glow}`,
        }}
      />
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map = {
    pending_confirm: {
      label: 'รอยืนยัน',
      icon: <Hourglass className="h-2.5 w-2.5" />,
      cls: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
    },
    pending_withdrawal: {
      label: 'รอเบิก',
      icon: <Clock className="h-2.5 w-2.5" />,
      cls: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200',
    },
    expired: {
      label: 'หมดอายุ',
      icon: <AlertCircle className="h-2.5 w-2.5" />,
      cls: 'border-rose-400/35 bg-rose-500/15 text-rose-200',
    },
    in_store: {
      label: 'พร้อมเบิก',
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      cls: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
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
      <button className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-[11.5px] font-bold tracking-wide text-violet-200/65 hover:bg-white/[0.06]">
        <History className="h-3.5 w-3.5" />
        ดูประวัติทั้งหมด
      </button>
    </div>
  );
}

function Fab() {
  return (
    <button
      className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-400 to-orange-400 px-5 py-3.5 text-sm font-black text-white shadow-[0_0_28px_rgba(232,121,249,0.55)] transition active:scale-95"
      aria-label="ฝากเหล้าใหม่"
    >
      <Plus className="h-4 w-4" strokeWidth={3} />
      <span className="neon-display tracking-wider">ฝากขวดใหม่</span>
    </button>
  );
}

/* ─────────────────────── theme ─────────────────────── */

function Styles() {
  return (
    <style jsx global>{`
      .neon-preview {
        background: #07061a;
        color: #ecebff;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .neon-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
          linear-gradient(180deg, #0a0820 0%, #06051a 60%, #02010f 100%);
      }
      .neon-blob {
        position: fixed;
        z-index: 1;
        pointer-events: none;
        border-radius: 999px;
        filter: blur(80px);
        opacity: 0.55;
      }
      .neon-blob-1 {
        top: -80px;
        right: -60px;
        width: 280px;
        height: 280px;
        background: radial-gradient(circle, #f25f4c 0%, transparent 70%);
      }
      .neon-blob-2 {
        bottom: 20%;
        left: -100px;
        width: 320px;
        height: 320px;
        background: radial-gradient(circle, #a786df 0%, transparent 70%);
      }
      .neon-grid {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        opacity: 0.18;
        background-image:
          linear-gradient(rgba(167, 134, 223, 0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(167, 134, 223, 0.4) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
      }
      .neon-display {
        font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
      }
      .neon-text-gradient {
        background: linear-gradient(135deg, #f25f4c 0%, #ff8a5c 35%, #a786df 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 18px rgba(242, 95, 76, 0.4));
      }
      .neon-text-coral {
        color: #f25f4c;
        text-shadow: 0 0 18px rgba(242, 95, 76, 0.7);
      }
      .neon-logo {
        display: flex;
        height: 36px;
        width: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background:
          linear-gradient(135deg, #f25f4c, #a786df 60%, #5cd6ff);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          0 0 24px rgba(232, 121, 249, 0.45);
      }
      .neon-icon-btn {
        position: relative;
        display: inline-flex;
        height: 34px;
        width: 34px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: rgba(220, 215, 255, 0.7);
        transition: all 0.15s;
      }
      .neon-icon-btn:hover {
        background: rgba(232, 121, 249, 0.1);
        color: #fff;
      }
      .neon-dot {
        position: absolute;
        top: 7px;
        right: 9px;
        height: 6px;
        width: 6px;
        border-radius: 999px;
        background: #f25f4c;
        box-shadow: 0 0 10px rgba(242, 95, 76, 0.9);
        animation: neon-pulse 1.4s ease-in-out infinite;
      }
      .neon-pulse-dot {
        height: 8px;
        width: 8px;
        border-radius: 999px;
        background: #f25f4c;
        box-shadow: 0 0 12px rgba(242, 95, 76, 0.95);
        animation: neon-pulse 1.4s ease-in-out infinite;
      }
      .neon-border-glow {
        position: absolute;
        inset: 0;
        border-radius: 24px;
        background: linear-gradient(
          135deg,
          rgba(242, 95, 76, 0.6) 0%,
          rgba(167, 134, 223, 0.5) 40%,
          rgba(92, 214, 255, 0.4) 80%,
          transparent 100%
        );
      }
      .neon-input {
        height: 46px;
        width: 100%;
        border-radius: 16px;
        border: 1px solid rgba(167, 134, 223, 0.18);
        background: rgba(13, 11, 26, 0.7);
        padding: 0 14px 0 38px;
        font-size: 13.5px;
        color: #ecebff;
        outline: none;
        transition: all 0.15s;
      }
      .neon-input::placeholder {
        color: rgba(220, 215, 255, 0.32);
      }
      .neon-input:focus {
        border-color: rgba(242, 95, 76, 0.45);
        background: rgba(20, 16, 38, 0.85);
        box-shadow:
          0 0 0 4px rgba(242, 95, 76, 0.1),
          0 0 24px rgba(242, 95, 76, 0.15);
      }
      @keyframes neon-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.55; transform: scale(0.85); }
      }
    `}</style>
  );
}
