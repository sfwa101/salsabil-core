// src/app/(reef)/account/page.tsx
// وجهة تبويب "ملفي" في BottomNav.tsx (اسم التبويب حُدِّث من "حسابي" — راجع تعليق BottomNav.tsx —
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 1). تستضيف: اختيار الثيم الشخصي
// (PersonalThemeSheet.tsx)، بطاقة "طلباتي" (LastOrderCard.tsx)، ورابط المساعدة (/help).
//
// CUSTOMER-IDENTITY-PHASE-1 — مصادقة عميل حقيقية أصبحت موجودة الآن (اختيارية، Guest Mode يبقى
// الافتراضي — راجع تقرير الاستقصاء المعتمد في docs/DECISIONS.md). Guest: بطاقة دخول/تسجيل. عميل
// مسجَّل: اسمه + زر خروج، بدل الافتراض الثابت السابق "لا مصادقة حقيقية بعد".

import Link from 'next/link';
import { HelpCircle, ChevronLeft, LogOut } from 'lucide-react';
import { PersonalThemeSheet } from '@/components/PersonalThemeSheet';
import { LastOrderCard } from '@/components/LastOrderCard';
import { getCustomerSession } from '@/core/modules/customer/customer-session';
import { khalilService } from '@/core/kernel/khalil/service';
import { logoutCustomerAction } from './actions';

export default async function AccountPage() {
  const session = await getCustomerSession();
  const user = session ? await khalilService.findUserById(session.userId) : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">ملفي</h1>

      <div className="flex flex-col gap-3">
        {user ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-medium text-foreground">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.phone}</p>
            </div>
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted"
              >
                <LogOut size={16} />
                خروج
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-medium text-foreground">عميل ضيف</p>
              <p className="text-sm text-muted-foreground">سجّل دخولك لحفظ عناوينك</p>
            </div>
            <Link
              href="/account/login"
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              دخول
            </Link>
          </div>
        )}

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
