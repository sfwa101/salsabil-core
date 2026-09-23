'use client';
// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — قبل هذه المهمة، كل بند هنا كان
// href="#" ثابتاً بصرف النظر عن محتوى getBottomNavConfig()، والبند النشط كان دائماً 'home' بلا علاقة
// بالمسار الفعلي (تعليق صريح كان موجوداً: "Placeholder active logic"). أُصلِح الآن: روابط حقيقية من
// href الذي أضافته dynamic-nav-config.ts، حالة نشطة حقيقية عبر usePathname()، وتوست "قريباً" حقيقي
// لبندي "التواصل"/"محفظة" (نفس آلية src/components/BottomNav.tsx الأصلية حرفياً — لا نظام دردشة ولا
// محفظة مبنيان بعد). لا تغيير على BottomNavStemProps (لا حاجة — showBars يبقى كما هو).

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { getBottomNavConfig } from '@/services/dynamic-nav-config';
import { useScrollDirection } from '@/hooks/useScrollDirection';

export interface BottomNavStemProps {
  showBars?: boolean;
}

const TOAST_DURATION_MS = 2000;

export const BottomNavStem: React.FC<BottomNavStemProps> = ({ showBars: showBarsProp }) => {
  const scrollBars = useScrollDirection();
  const showBars = showBarsProp ?? scrollBars;
  const items = getBottomNavConfig();
  const pathname = usePathname();
  const [toast, setToast] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => clearTimeout(toastTimeout.current), []);

  function showComingSoonToast() {
    setToast(true);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(false), TOAST_DURATION_MS);
  }

  return (
    <div className={`fixed bottom-5 inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300 ease-out lg:hidden ${!showBars ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`} dir="rtl">
      <nav
        className="pointer-events-auto h-14 w-full max-w-[360px] sm:max-w-sm rounded-full bg-card/80 backdrop-blur-2xl border border-border/60 shadow-xl flex items-center justify-between px-2"
      >
        {items.map((item) => {
          const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle;
          const isActive = !!item.href && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));

          if (item.isHero) {
            return (
              <Link
                key={item.id}
                href={item.href ?? '#'}
                className={`-mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 ${isActive ? 'scale-105' : ''}`}
              >
                <Icon size={24} strokeWidth={2.5} />
              </Link>
            );
          }

          if (item.comingSoon || !item.href) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={showComingSoonToast}
                aria-label={item.label}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-10 rounded-xl transition-colors active:scale-95 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {toast &&
        mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
            <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
              قريباً
            </span>
          </div>,
          document.body
        )}
    </div>
  );
};
