'use client';
// src/components/BottomNav.tsx
// تنقّل سفلي حقيقي (BAYAN-CLOSEOUT-UI-GAPS) — يُغلِق فجوة "BottomNav غير موجود" المكتشفة يوم 28
// (docs/CHANGELOG.md اليوم 28/32). 4 وجهات: الرئيسية/الأقسام/طلباتي/حسابي. سلوك الإخفاء/الإظهار
// عند التمرير عبر ScrollHideBar.tsx القائم (edge="bottom"، أُضيف لهذه المهمة تحديداً) — لا إعادة
// بناء منطق التمرير هنا.
//
// "طلباتي" زر لا رابط: يقرأ localStorage (src/lib/last-order.ts) وقت النقر فقط — لا حساب عميل
// حقيقي يُخزَّن تحته آخر طلب (عميل ضيف دائماً)، فلا يمكن معرفة الوجهة إلا على العميل وقت التفاعل.
// يُركَّب في src/app/(reef)/layout.tsx بجانب Header.tsx.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, LayoutGrid, Package, User } from 'lucide-react';
import { ScrollHideBar } from './ScrollHideBar';
import { readLastOrderId } from '@/lib/last-order';

export function BottomNav() {
  const router = useRouter();

  function goToOrders() {
    const lastOrderId = readLastOrderId();
    router.push(lastOrderId ? `/order/${lastOrderId}` : '/orders');
  }

  return (
    <ScrollHideBar edge="bottom">
      <nav className="flex items-center justify-around border-t border-border bg-card px-2 py-2">
        <Link href="/" className="flex flex-col items-center gap-1 px-3 py-1 text-foreground">
          <Home size={22} />
          <span className="text-xs">الرئيسية</span>
        </Link>
        <Link href="/categories" className="flex flex-col items-center gap-1 px-3 py-1 text-foreground">
          <LayoutGrid size={22} />
          <span className="text-xs">الأقسام</span>
        </Link>
        <button
          type="button"
          onClick={goToOrders}
          className="flex flex-col items-center gap-1 px-3 py-1 text-foreground"
        >
          <Package size={22} />
          <span className="text-xs">طلباتي</span>
        </button>
        <Link href="/account" className="flex flex-col items-center gap-1 px-3 py-1 text-foreground">
          <User size={22} />
          <span className="text-xs">حسابي</span>
        </Link>
      </nav>
    </ScrollHideBar>
  );
}
