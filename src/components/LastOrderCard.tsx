'use client';
// src/components/LastOrderCard.tsx
// بطاقة "طلباتي" داخل صفحة /account (ملفي) — تحلّ محل تبويب "طلباتي" المستقل الذي حذفناه من
// BottomNav.tsx عند إعادة بنائه لخمسة أزرار (HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT
// دفعة 1)، فلا تُفقَد القدرة الحقيقية القائمة (قراءة آخر طلب من localStorage،
// src/lib/last-order.ts) بلا بديل. نفس منطق BottomNav.tsx القديم (goToOrders) حرفياً، منقول لا
// مُعاد بناؤه.

import { useRouter } from 'next/navigation';
import { PackageSearch, ChevronLeft } from 'lucide-react';
import { readLastOrderId } from '@/lib/last-order';

export function LastOrderCard() {
  const router = useRouter();

  function goToOrders() {
    const lastOrderId = readLastOrderId();
    router.push(lastOrderId ? `/order/${lastOrderId}` : '/orders');
  }

  return (
    <button
      type="button"
      onClick={goToOrders}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground transition hover:bg-muted"
    >
      <PackageSearch size={20} className="shrink-0 text-primary" />
      <span className="flex-1 text-start font-medium">طلباتي</span>
      <ChevronLeft size={18} className="text-muted-foreground" />
    </button>
  );
}
