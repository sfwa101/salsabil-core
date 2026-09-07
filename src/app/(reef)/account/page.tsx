// src/app/(reef)/account/page.tsx
// وجهة تبويب "حسابي" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS) — لا مصادقة عميل حقيقية بعد
// (عميل ضيف دائماً)، فلا بيانات حساب لعرضها اليوم. الغرض الفعلي الوحيد لهذه الصفحة اليوم: استضافة
// نقطة الدخول الوحيدة لاختيار الثيم الشخصي (PersonalThemeSheet.tsx، يُغلِق فجوة يوم 30).
//
// RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS: غلاف بصري فقط (بطاقات بدل نص عارٍ) + رابط لصفحة
// المساعدة الثابتة الجديدة (/help) — لا بيانات جديدة، لا تغيير في PersonalThemeSheet نفسه.

import Link from 'next/link';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import { PersonalThemeSheet } from '@/components/PersonalThemeSheet';

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">حسابي</h1>

      <div className="flex flex-col gap-3">
        <PersonalThemeSheet />

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
