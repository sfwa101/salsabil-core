'use client';
// src/components/BottomNav.tsx
// تنقّل سفلي — 5 وجهات مطابقة للبنية الرسمية المعتمدة في موجّه المؤسس (مهمة
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT، دفعة 1): الرئيسية | التواصل | الأقسام | محفظة
// | ملفي. كانت 4 وجهات (الرئيسية/الأقسام/طلباتي/حسابي، BAYAN-CLOSEOUT-UI-GAPS) — "طلباتي" لم تعد
// تبويباً مستقلاً؛ قدرتها الحقيقية (تتبّع آخر طلب عبر localStorage، src/lib/last-order.ts) نُقلت إلى
// بطاقة LastOrderCard.tsx داخل صفحة /account (ملفي) بدل حذفها بلا بديل — لا تغيير سلوك صامت.
//
// "التواصل" و"محفظة": لا نظام دردشة ولا محفظة مبنيان بعد — توست "قريباً" بنفس نمط
// WorldSwitcher.tsx/HeaderSearchBar.tsx القائم فعلياً (نفس مدة العرض ونفس آلية Portal)، لا صفحة
// فارغة أو رابط معطوب.
//
// سلوك الإخفاء/الإظهار عند التمرير عبر ScrollHideBar.tsx القائم (edge="bottom") — لا تغيير هناك.
// يُركَّب في src/app/(reef)/layout.tsx بجانب Header.tsx.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, MessageCircle, Wallet, User, type LucideIcon } from 'lucide-react';
import { ScrollHideBar } from './ScrollHideBar';
import { cn } from '@/lib/utils';

const TOAST_DURATION_MS = 2000;

type NavItem =
  | { id: string; label: string; icon: LucideIcon; href: string }
  | { id: string; label: string; icon: LucideIcon; comingSoon: true };

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: Home, href: '/' },
  { id: 'communication', label: 'التواصل', icon: MessageCircle, comingSoon: true },
  { id: 'categories', label: 'الأقسام', icon: LayoutGrid, href: '/categories' },
  { id: 'wallet', label: 'محفظة', icon: Wallet, comingSoon: true },
  { id: 'profile', label: 'ملفي', icon: User, href: '/account' },
];

export function BottomNav() {
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
    <>
      <ScrollHideBar edge="bottom">
        <nav
          aria-label="التنقل الرئيسي"
          className="border-t border-border bg-card/95 px-2 pt-2 backdrop-blur-sm"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-md items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              if ('href' in item) {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={showComingSoonToast}
                  aria-label={item.label}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon size={22} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </ScrollHideBar>

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
    </>
  );
}
