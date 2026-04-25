import Link from 'next/link';
import { CUSTOMER_THEME_LIST } from '@/lib/customer-themes';

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
          {CUSTOMER_THEME_LIST.map((t) => (
            <Link
              key={t.key}
              href={`/preview/${t.key}`}
              className={
                'block overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition hover:scale-[1.01] ' +
                t.borderClass +
                ' ' +
                t.bgClass
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                    {t.tagline}
                  </p>
                  <h2 className={'mt-1 text-xl font-semibold ' + t.textClass}>
                    {t.label}
                  </h2>
                  <p className={'mt-2 text-[13px] opacity-70 ' + t.textClass}>
                    {t.description}
                  </p>
                </div>
                <Swatches colors={t.swatch} />
              </div>
              <p className={'mt-4 text-[12px] font-semibold ' + t.textClass}>
                เปิดดู →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {colors.slice(0, 4).map((c, i) => (
        <span
          key={i}
          className="h-6 w-6 rounded-full ring-2 ring-black/40"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
