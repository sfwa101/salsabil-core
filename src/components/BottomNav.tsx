'use client';
// src/components/BottomNav.tsx
// تنقّل سفلي — 5 وجهات مطابقة للبنية الرسمية المعتمدة (SALSABIL_CONSTITUTION.md §25.1): الرئيسية |
// التواصل | الأقسام | محفظة | ملفي. كانت 4 وجهات (الرئيسية/الأقسام/طلباتي/حسابي، BAYAN-CLOSEOUT-UI-
// GAPS) — "طلباتي" لم تعد تبويباً مستقلاً؛ قدرتها الحقيقية (تتبّع آخر طلب عبر localStorage،
// src/lib/last-order.ts) نُقلت إلى بطاقة LastOrderCard.tsx داخل صفحة /account (ملفي) بدل حذفها بلا
// بديل — لا تغيير سلوك صامت.
//
// "التواصل" و"محفظة": لا نظام دردشة ولا محفظة مبنيان بعد — توست "قريباً" بنفس نمط
// WorldSwitcher.tsx/HeaderSearchBar.tsx القائم فعلياً (نفس مدة العرض ونفس آلية Portal)، لا صفحة
// فارغة أو رابط معطوب.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 4): الشكل البصري فقط تغيّر — من شريط
// كامل العرض (border-t) إلى شريط عائم (هامش من الحواف، منحنيات كاملة، ظل ناعم)، وزر "الأقسام"
// الأوسط مرفوع ومميَّز (نفس نمط TabBar.tsx في D:\temp\reefam-lovable-reference: عنصر primary مرفوع
// بـ-mt سالب وخلفية bg-primary بارزة). الأزرار الخمسة وترتيبها ومنطقها التوست/الروابط بلا أي تغيير.
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
  | { id: string; label: string; icon: LucideIcon; href: string; primary?: boolean }
  | { id: string; label: string; icon: LucideIcon; comingSoon: true };

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: Home, href: '/' },
  { id: 'communication', label: 'التواصل', icon: MessageCircle, comingSoon: true },
  { id: 'categories', label: 'الأقسام', icon: LayoutGrid, href: '/categories', primary: true },
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
        {/* هذا nav حاوية هامش من الحواف فقط (بلا تصميم بصري) — البار الفعلي العائم هو الـdiv الداخلي.
            نفس بنية TabBar.tsx المرجعي (fixed+padding خارجي، pill مُمركَز داخلي). */}
        <nav
          aria-label="التنقل الرئيسي"
          className="px-4"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-md items-end justify-around rounded-full border border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur-sm">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              if ('href' in item) {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

                if (item.primary) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-label={item.label}
                      className="relative -mt-6 flex flex-col items-center gap-1"
                    >
                      <span
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform',
                          isActive ? 'scale-105' : ''
                        )}
                      >
                        <Icon size={26} strokeWidth={2.4} />
                      </span>
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                    </Link>
                  );
                }

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
