'use client';

import { useState, useTransition } from 'react';
import { Check, ExternalLink, Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui';
import {
  CUSTOMER_THEME_LIST,
  type CustomerThemeKey,
} from '@/lib/customer-themes';

export default function ThemePickerForm({
  storeId,
  initialTheme,
}: {
  storeId: string;
  initialTheme: CustomerThemeKey;
}) {
  const [selected, setSelected] = useState<CustomerThemeKey>(initialTheme);
  const [savedTheme, setSavedTheme] = useState<CustomerThemeKey>(initialTheme);
  const [isPending, startTransition] = useTransition();

  const dirty = selected !== savedTheme;

  const handleSave = () => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('stores')
        .update({ customer_theme: selected })
        .eq('id', storeId);

      if (error) {
        toast({
          type: 'error',
          title: 'บันทึกไม่สำเร็จ',
          message: error.message,
        });
        return;
      }
      setSavedTheme(selected);
      toast({
        type: 'success',
        title: 'บันทึกธีมเรียบร้อย',
        message: 'ลูกค้าจะเห็นหน้าตาแบบใหม่เมื่อเปิด LIFF ครั้งถัดไป',
      });
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {CUSTOMER_THEME_LIST.map((theme) => {
          const isSelected = selected === theme.key;
          const isCurrent = savedTheme === theme.key;

          return (
            <div
              key={theme.key}
              className={
                'group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-4 transition ' +
                (isSelected
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700') +
                ' ' +
                theme.bgClass
              }
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
              )}
              {/* Current indicator */}
              {isCurrent && !isSelected && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  ใช้อยู่
                </div>
              )}

              {/* Click target for selecting */}
              <button
                type="button"
                onClick={() => setSelected(theme.key)}
                className="absolute inset-0 z-0"
                aria-label={`Select ${theme.label}`}
              />

              <div className="pointer-events-none relative z-[1]">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] opacity-70">
                  {theme.tagline}
                </p>
                <h3 className={'mt-1 text-lg font-bold ' + theme.textClass}>
                  {theme.label}
                </h3>
                <p className={'mt-1.5 text-[12.5px] opacity-75 ' + theme.textClass}>
                  {theme.description}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <Swatches colors={theme.swatch} />
                </div>
              </div>

              <a
                href={`/preview/${theme.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-[2] mt-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-semibold text-gray-900 backdrop-blur-sm hover:bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                ดูตัวอย่างจริง
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm">
          <p className="text-gray-500 dark:text-gray-400">ธีมที่เลือก</p>
          <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
            {CUSTOMER_THEME_LIST.find((t) => t.key === selected)?.label}
            {dirty && (
              <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                (ยังไม่ได้บันทึก)
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          บันทึก
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        หมายเหตุ: หน้า customer LIFF จริง (<code>/t/{'{slug}'}/customer</code>) ยัง
        render ด้วยธีมเดียว — การแสดงผลตามธีมที่เลือกในแต่ละสาขาจะเปิดใช้งานในเฟสถัดไป
        ตอนนี้กดปุ่ม <em>ดูตัวอย่างจริง</em> เพื่อเปิด preview ในแท็บใหม่
      </p>
    </div>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="flex -space-x-1.5">
      {colors.slice(0, 4).map((c, i) => (
        <span
          key={i}
          className="h-5 w-5 rounded-full ring-2 ring-white/70"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
