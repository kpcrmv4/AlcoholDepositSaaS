import Link from 'next/link';

export default function PreviewIndex() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Customer LIFF · Redesign
        </p>
        <h1 className="mt-2 text-3xl font-bold">Design Previews</h1>
        <p className="mt-2 text-sm text-slate-400">
          Mock pages — no auth required. เปิดในมือถือเพื่อดูจริง
          (viewport แนวตั้ง 375–414px).
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/preview/amber"
            className="block overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1a1108] to-[#0a0705] p-5 transition hover:border-amber-500/40"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
              Variant A
            </p>
            <h2 className="mt-1 text-xl font-semibold text-amber-50">
              Premium Dark Amber
            </h2>
            <p className="mt-2 text-[13px] text-amber-200/60">
              Speakeasy / whiskey bar — สีอำพัน + ดำเข้ม + serif accent
            </p>
            <p className="mt-3 text-[12px] font-semibold text-amber-300">
              เปิดดู →
            </p>
          </Link>

          <Link
            href="/preview/neon"
            className="block overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-[#1a0e2e] to-[#06051a] p-5 transition hover:border-fuchsia-500/45"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300/80">
              Variant B
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Neon Nightlife
            </h2>
            <p className="mt-2 text-[13px] text-violet-200/60">
              Club / late-night — coral + lavender glow + glassmorphism
            </p>
            <p className="mt-3 text-[12px] font-semibold text-fuchsia-300">
              เปิดดู →
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
