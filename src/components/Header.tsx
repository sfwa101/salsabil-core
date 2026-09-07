// src/components/Header.tsx
// شريط علوي موحّد لكل صفحات (reef) — محايد لونياً بالكامل (توكنز دلالية فقط).
// مكوّن خادم ذاتي الجلب (نفس نمط بقية صفحات المشروع) — لا 'use client'، لا تفاعل يتطلب جافاسكربت.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 2): إعادة بناء كاملة لبنية ثلاثة مستويات
// أفقية في صف واحد — يمين: مبدّل العوالم (WorldSwitcher.tsx، دمج بصري فقط، بلا تعديل منطقي)، وسط:
// "ريف المدينة" + عنوان التوصيل تحته مباشرة (DeliveryAddressButton.tsx، مستخرَج من FeedTopBar.tsx
// المحذوف في هذه المهمة نفسها)، يسار: كبسولة السلة (CartCapsule.tsx، منحنيات كاملة + نبضة CSS عند
// الإضافة). مباشرة تحت هذا الصف، بلا فراغ: HeaderSearchBar.tsx (أصبح ظاهراً دائماً، لا lg فقط).
//
// FeedTopBar.tsx (كان يحمل مبدّل العوالم + عنوان التوصيل + زر باركود "قريباً" + زر بحث موبايل مكرر)
// حُذف بالكامل — كل مسؤولياته الحقيقية (عالم + عنوان) انتقلت هنا، زر الباركود (بلا وظيفة فعلية أصلاً)
// أُسقط، وزر البحث المكرر لم يعد ضرورياً بعد أن أصبح HeaderSearchBar ظاهراً دائماً.

import Link from 'next/link';
import { getCartItemCountAction } from '@/app/(reef)/cart/actions';
import { WorldSwitcher } from './WorldSwitcher';
import { DeliveryAddressButton } from './DeliveryAddressButton';
import { CartCapsule } from './CartCapsule';
import { HeaderSearchBar } from './HeaderSearchBar';

export async function Header() {
  const itemCount = await getCartItemCountAction();

  return (
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

          <CartCapsule itemCount={itemCount} />
        </div>

        <HeaderSearchBar />
      </div>
    </header>
  );
}
