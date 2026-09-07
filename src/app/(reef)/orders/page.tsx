// src/app/(reef)/orders/page.tsx
// حالة فارغة لتبويب "طلباتي" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS) — تُعرَض فقط حين لا يوجد
// طلب محفوظ في localStorage على هذا الجهاز (src/lib/last-order.ts). لا نظام حسابات/تسجيل دخول
// للعميل الضيف، فلا "قائمة طلبات" حقيقية ممكنة اليوم — راجع BottomNav.tsx للمنطق الكامل.
//
// RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS: غلاف بصري فقط (أيقونة + بطاقة) — لا تغيير في المنطق
// أعلاه، تبقى هذه حالة فارغة حقيقية بلا أي محاكاة لبيانات غير موجودة.

import Link from 'next/link';
import { PackageSearch } from 'lucide-react';

export default function OrdersEmptyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center md:max-w-4xl xl:max-w-6xl">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
        <PackageSearch size={28} />
      </span>
      <h1 className="text-xl font-semibold text-foreground">لا يوجد طلب محفوظ على هذا الجهاز بعد</h1>
      <p className="text-muted-foreground">
        بعد إتمام أول طلب، ستجد رابط تتبّعه هنا مباشرة من تبويب "طلباتي".
      </p>
      <Link
        href="/"
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90"
      >
        تصفّح الخلاصة الآن
      </Link>
    </main>
  );
}
