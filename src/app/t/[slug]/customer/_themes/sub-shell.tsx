'use client';

/**
 * ThemedSubShell — applies the per-store theme (background + brand header)
 * to the customer LIFF *sub-pages* (deposit form / history / withdraw /
 * promotions). The main customer page renders its full chrome via
 * `ThemedCustomerView` and does NOT use this shell.
 *
 * Sub-pages keep their own inline back button + form/list content; this
 * shell just wraps them in the themed background + a small sticky brand
 * header so the entire LIFF feels consistent.
 */

import { TenantLink } from '@/lib/tenant/link';
import { Wine, Sparkles, Sun } from 'lucide-react';
import { HeaderControls } from './_shared/header-controls';
import type { CustomerThemeKey } from '@/lib/customer-themes';

interface Props {
  themeKey: CustomerThemeKey;
  storeName: string | null;
  navQuery: string;
  children: React.ReactNode;
}

export function ThemedSubShell(props: Props) {
  switch (props.themeKey) {
    case 'neon':
      return <NeonShell {...props} />;
    case 'sumi':
      return <SumiShell {...props} />;
    case 'sunset':
      return <SunsetShell {...props} />;
    case 'crimson':
      return <CrimsonShell {...props} />;
    case 'amber':
    default:
      return <AmberShell {...props} />;
  }
}

/* ─────────────────────────── AMBER ─────────────────────────── */

function AmberShell({ storeName, navQuery, children }: Props) {
  return (
    <div className="amber-theme relative min-h-screen">
      <div className="amber-bg" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-amber-200/10 bg-[#13100c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="amber-monogram">
              <span>{(storeName || 'SB').slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="amber-serif truncate text-[15px] font-semibold tracking-wide text-amber-50">
                {storeName || 'Bottle Keeper'}
              </p>
              <p className="truncate text-[10.5px] uppercase tracking-[0.18em] text-amber-200/50">
                Bottle Keeper · Cellar
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-amber-200/70 transition-colors hover:bg-amber-200/10 hover:text-amber-100"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <style jsx global>{`
        .amber-theme { background: #0d0907; color: #f3e9d6; font-family: 'Inter', system-ui, sans-serif; }
        .amber-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(80% 50% at 80% -10%, rgba(245, 180, 90, 0.18), transparent 60%),
            radial-gradient(60% 40% at 0% 30%, rgba(212, 165, 116, 0.08), transparent 70%),
            linear-gradient(180deg, #110b07 0%, #0a0705 60%, #06040a 100%);
        }
        .amber-serif { font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: 0.01em; }
        .amber-monogram {
          display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
          border-radius: 10px; background: linear-gradient(135deg, #f5d28a, #c89554 50%, #6d4621);
          color: #1a1108; font-weight: 800; letter-spacing: 0.06em; font-size: 11px;
          box-shadow: inset 0 1px 0 rgba(255,230,180,0.5), 0 4px 12px rgba(150,90,30,0.35);
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── NEON ─────────────────────────── */

function NeonShell({ storeName, navQuery, children }: Props) {
  return (
    <div className="neon-theme relative min-h-screen overflow-hidden">
      <div className="neon-bg" aria-hidden />
      <div className="neon-blob neon-blob-1" aria-hidden />
      <div className="neon-blob neon-blob-2" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0916]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="neon-logo"><Wine className="h-4 w-4 text-white" /></div>
            <div className="min-w-0 leading-tight">
              <p className="neon-display truncate text-[15px] font-bold text-white">
                {(storeName || 'BOTTLE KEEPER').toUpperCase()}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/55">
                <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
                Bottle keeper
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-violet-200/70 transition-colors hover:bg-fuchsia-400/10 hover:text-white"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase"
          />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <style jsx global>{`
        .neon-theme { background: #07061a; color: #ecebff; font-family: 'Inter', system-ui, sans-serif; }
        .neon-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(180deg, #0a0820 0%, #06051a 60%, #02010f 100%); }
        .neon-blob { position: fixed; z-index: 1; pointer-events: none; border-radius: 999px; filter: blur(80px); opacity: 0.55; }
        .neon-blob-1 { top: -80px; right: -60px; width: 280px; height: 280px;
          background: radial-gradient(circle, #f25f4c 0%, transparent 70%); }
        .neon-blob-2 { bottom: 20%; left: -100px; width: 320px; height: 320px;
          background: radial-gradient(circle, #a786df 0%, transparent 70%); }
        .neon-display { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; letter-spacing: -0.01em; }
        .neon-logo { display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
          border-radius: 12px; background: linear-gradient(135deg, #f25f4c, #a786df 60%, #5cd6ff);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 24px rgba(232,121,249,0.45); }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── SUMI ─────────────────────────── */

function SumiShell({ storeName, navQuery, children }: Props) {
  return (
    <div className="sumi-theme relative min-h-screen">
      <div className="sumi-paper" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-stone-300/40 bg-[#fbf7ef]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-6 py-3.5">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="sumi-seal"><span>蔵</span></div>
            <div className="min-w-0 leading-tight">
              <p className="sumi-serif truncate text-[16px] font-medium text-stone-900">
                {storeName || 'Bottle Cellar'}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Bottle Cellar · 酒蔵
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <style jsx global>{`
        .sumi-theme { background: #fbf7ef; color: #1c1917; font-family: 'Inter', system-ui, sans-serif; }
        .sumi-paper {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse at 80% 0%, rgba(149,115,79,0.05), transparent 60%),
            radial-gradient(ellipse at 0% 100%, rgba(120,53,15,0.04), transparent 60%),
            #fbf7ef;
        }
        .sumi-serif { font-family: 'Cormorant Garamond', 'Noto Serif JP', 'Playfair Display', Georgia, serif; }
        .sumi-seal {
          display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
          border-radius: 4px; background: #9b2c2c; color: #fbf7ef;
          font-family: 'Noto Serif JP', serif; font-size: 18px; font-weight: 600;
          box-shadow: inset 0 0 0 1.5px #fbf7ef, inset 0 0 0 2.5px #9b2c2c, 0 1px 2px rgba(120,30,30,0.3);
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── CRIMSON ─────────────────────────── */

function CrimsonShell({ storeName, navQuery, children }: Props) {
  return (
    <div className="crimson-theme relative min-h-screen">
      <div className="crimson-bg" aria-hidden />
      <div className="crimson-paper" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-red-50/15 bg-[#5b1414]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="crimson-stamp"><span className="crimson-script">v</span></div>
            <div className="min-w-0 leading-tight">
              <p className="crimson-display truncate text-[15px] font-bold tracking-wider text-red-50">
                {(storeName || 'WINE BAR').toUpperCase()}
              </p>
              <p className="truncate text-[10.5px] uppercase tracking-[0.2em] text-red-50/55">
                Bottle Cellar · Est.
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-red-50/75 transition-colors hover:bg-red-50/10 hover:text-red-50"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <style jsx global>{`
        .crimson-theme { background: #7a1a1a; color: #faf3e8; font-family: 'Inter', system-ui, sans-serif; }
        .crimson-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(70% 50% at 90% 0%, rgba(0,0,0,0.45), transparent 60%),
            radial-gradient(50% 40% at 0% 100%, rgba(0,0,0,0.5), transparent 60%),
            linear-gradient(180deg, #7a1a1a 0%, #5b1414 50%, #3d0a0a 100%);
        }
        .crimson-paper {
          position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.18;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.74  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }
        .crimson-display { font-family: 'Fraunces', 'Cormorant Garamond', 'Playfair Display', Georgia, serif; letter-spacing: -0.01em; }
        .crimson-script { font-family: 'Caveat', 'Reenie Beanie', 'Indie Flower', cursive; letter-spacing: 0.02em; }
        .crimson-stamp {
          display: flex; height: 38px; width: 38px; align-items: center; justify-content: center;
          border-radius: 999px; background: #faf3e8; color: #7a1a1a;
          font-size: 22px; font-weight: 700;
          box-shadow: inset 0 0 0 2px #7a1a1a, inset 0 0 0 2.5px #faf3e8;
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── SUNSET ─────────────────────────── */

function SunsetShell({ storeName, navQuery, children }: Props) {
  return (
    <div className="sunset-theme relative min-h-screen overflow-hidden">
      <div className="sunset-sky" aria-hidden />
      <div className="sunset-sun" aria-hidden />
      <div className="sunset-water" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-white/30 bg-gradient-to-b from-orange-50/85 to-rose-50/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <TenantLink href={`/customer${navQuery}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="sunset-logo"><Sun className="h-4 w-4" strokeWidth={2.5} /></div>
            <div className="min-w-0 leading-tight">
              <p className="sunset-display truncate text-[16px] font-extrabold text-orange-950">
                {storeName || 'Beach Cellar'}
              </p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700/70">
                Beach Cellar · Aloha
              </p>
            </div>
          </TenantLink>
          <HeaderControls
            iconButtonClass="customer-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-orange-700 transition-colors hover:bg-orange-200/60 hover:text-orange-950"
            langLabelClass="ml-1 text-[10.5px] font-bold uppercase tracking-wide"
          />
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <style jsx global>{`
        .sunset-theme { background: #fff7ed; color: #431407; font-family: 'Inter', system-ui, sans-serif; }
        .sunset-sky { position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(180deg, #fed7aa 0%, #fecaca 28%, #fda4af 50%, #fde68a 78%, #fef3c7 100%); }
        .sunset-sun { position: fixed; top: 32%; left: 50%; transform: translateX(-50%); z-index: 1;
          height: 320px; width: 320px; border-radius: 999px; pointer-events: none;
          background: radial-gradient(circle, #fef08a 0%, rgba(254,215,170,0.4) 40%, transparent 70%); }
        .sunset-water { position: fixed; bottom: 0; left: 0; right: 0; height: 28%; z-index: 1; pointer-events: none;
          background: linear-gradient(180deg, rgba(254,202,202,0.6) 0%, rgba(252,165,165,0.7) 30%, rgba(248,113,113,0.85) 100%); }
        .sunset-display { font-family: 'Fraunces', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; letter-spacing: -0.015em; }
        .sunset-logo { display: flex; height: 36px; width: 36px; align-items: center; justify-content: center;
          border-radius: 999px; background: linear-gradient(135deg, #fb923c 0%, #f43f5e 100%); color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(251,146,60,0.45); }
      `}</style>
    </div>
  );
}
