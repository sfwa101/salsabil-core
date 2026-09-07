// src/app/(reef)/account/page.tsx
// وجهة تبويب "ملفي" في BottomNav.tsx (اسم التبويب حُدِّث من "حسابي" — راجع تعليق BottomNav.tsx —
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 1). لا مصادقة عميل حقيقية بعد (عميل ضيف
// دائماً)، فلا بيانات حساب لعرضها اليوم. تستضيف: اختيار الثيم الشخصي (PersonalThemeSheet.tsx)،
// بطاقة "طلباتي" (LastOrderCard.tsx — قدرة انتقلت هنا من تبويب BottomNav المحذوف، لا فقدان وظيفة)،
// ورابط المساعدة (/help).

import Link from 'next/link';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import { PersonalThemeSheet } from '@/components/PersonalThemeSheet';
import { LastOrderCard } from '@/components/LastOrderCard';

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">ملفي</h1>

      <div className="flex flex-col gap-3">
        <PersonalThemeSheet />

        <LastOrderCard />

        <Link
          href="/help"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground transition hover:bg-muted"
        >
          <HelpCircle size={20} className="shrink-0 text-primary" />
          <span className="flex-1 font-medium">المساعدة</span>
          <ChevronLeft size={18} className="text-muted-foreground" />
        </Link>
      </div>
    </main>
  );
}
