// src/app/(reef)/account/page.tsx
// وجهة تبويب "حسابي" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS) — لا مصادقة عميل حقيقية بعد
// (عميل ضيف دائماً)، فلا بيانات حساب لعرضها اليوم. الغرض الفعلي الوحيد لهذه الصفحة اليوم: استضافة
// نقطة الدخول الوحيدة لاختيار الثيم الشخصي (PersonalThemeSheet.tsx، يُغلِق فجوة يوم 30).

import { PersonalThemeSheet } from '@/components/PersonalThemeSheet';

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">حسابي</h1>
      <PersonalThemeSheet />
    </main>
  );
}
