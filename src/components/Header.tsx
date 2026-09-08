// src/components/Header.tsx
// شريط علوي موحّد لكل صفحات (reef) — محايد لونياً بالكامل (توكنز دلالية فقط).
// مكوّن خادم ذاتي الجلب (نفس نمط بقية صفحات المشروع) — لا 'use client'، لا تفاعل يتطلب جافاسكربت.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 2): إعادة بناء كاملة لبنية ثلاثة مستويات
// أفقية في صف واحد — يمين: مبدّل العوالم (WorldSwitcher.tsx، دمج بصري فقط، بلا تعديل منطقي)، وسط:
// "ريف المدينة" + عنوان التوصيل تحته مباشرة (DeliveryAddressButton.tsx، مستخرَج من FeedTopBar.tsx
// المحذوف في هذه المهمة نفسها). مباشرة تحت هذا الصف، بلا فراغ: HeaderSearchBar.tsx (أصبح ظاهراً
// دائماً، لا lg فقط).
//
// FeedTopBar.tsx (كان يحمل مبدّل العوالم + عنوان التوصيل + زر باركود "قريباً" + زر بحث موبايل مكرر)
// حُذف بالكامل — كل مسؤولياته الحقيقية (عالم + عنوان) انتقلت هنا، زر الباركود (بلا وظيفة فعلية أصلاً)
// أُسقط، وزر البحث المكرر لم يعد ضرورياً بعد أن أصبح HeaderSearchBar ظاهراً دائماً.
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 5) — كبسولة السلة (CartCapsule.tsx)
// خرجت من هذا الصف بالكامل — أصبحت عنصراً عائماً مستقلاً (ReefLayout في layout.tsx) لا يختفي مع
// الهيدر عند التمرير للأسفل. الفراغ الذي تركته على اليسار هنا مقصود ومطابق بصرياً — الكبسولة العائمة
// تتموضع في نفس الإحداثيات تماماً (نفس max-width/padding)، فتبدو جزءاً من هذا الصف عند ظهور الهيدر.

import Link from 'next/link';
import { WorldSwitcher } from './WorldSwitcher';
import { DeliveryAddressButton } from './DeliveryAddressButton';
import { HeaderSearchBar } from './HeaderSearchBar';
import { ScrollHideBar } from './ScrollHideBar';

export async function Header() {
  return (
    // FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1ج): sticky+hide فعلياً الآن — يختفي بالتمرير للأسفل،
    // يظهر فوراً بالتمرير للأعلى. ينشر ارتفاعه الحي (--header-height) ليرتد FeedTabBar (page.tsx)
    // تحته بدقة — راجع تعليق ScrollHideBar.tsx للتفصيل الكامل.
    <ScrollHideBar publishHeightAs="--header-height">
      <header className="border-b border-border bg-card/95 backdrop-blur-sm">
        {/* مقياس العرض الموحَّد (يطابق FeedTabBar/main) */}
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 md:max-w-4xl xl:max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <WorldSwitcher />

            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
              <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
                ريف المدينة
              </Link>
              <DeliveryAddressButton />
            </div>

            {/* عنصر فارغ بعرض يطابق كبسولة السلة تقريباً — يوازن التمركز البصري لكتلة العنوان بلا
                حاجة لأي منطق إضافي (الكبسولة الفعلية تُرسَم فوقه من layout.tsx). */}
            <div className="w-11 shrink-0" aria-hidden />
          </div>

          <HeaderSearchBar />
        </div>
      </header>
    </ScrollHideBar>
  );
}
