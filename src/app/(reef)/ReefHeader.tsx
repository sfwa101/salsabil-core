'use client';
// src/app/(reef)/ReefHeader.tsx
// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — Adapter عرض فقط، يُركِّب
// DesktopHeaderStem + MobileHeaderStem (كلاهما دائماً، فرع الظهور CSS-only بالضبط كـHeader.tsx
// القديم — hidden lg:flex / flex lg:hidden داخل كل Stem) ويربطهما ببيانات/تنقّل حقيقيين. راجع
// docs/salsabil-frontend-integration-pattern.md وADR-035 (docs/DECISIONS.md) — لا منطق أعمال هنا،
// فقط تحويل بيانات حقيقية موجودة فعلاً (مسار الصفحة، عدد/إجمالي السلة الحقيقيان) إلى الشكل الذي
// يتوقعه كل Stem، بلا تعديل عقد الـProps الخاص بأي منهما.
//
// cartItemCount يصل كـ prop من (reef)/layout.tsx (Server Component، getCartItemCountAction — نفس
// القدرة الموجودة فعلاً، بُنيت أصلاً "للـHeader" حسب تعليقها في actions.ts، لم تكن مستخدَمة هنا من
// قبل). totalPrice يُقرَأ من useCartTotal() (نفس مصدر الحقيقة التفاؤلي الذي يستخدمه CartCapsule.tsx
// في كل صفحات (reef) الأخرى — لا مصدر منفصل).
//
// ⚠️ تغيير سلوك مُعلَن صراحة (لا صامت): MobileHeaderStem يعرض زر سلة مدمَجاً خاصاً به (شارة عدد+سعر)
// وينتقل مباشرة لصفحة /cart بالكامل عند النقر — لا يفتح نافذة السلة السفلية المصغَّرة
// (CartCapsule.tsx) كما كان يحدث سابقاً داخل Header.tsx. CartCapsule.tsx نفسه لم يُعدَّل ولم يُحذَف
// (يبقى بالكامل في الكود، غير مُستدعى من أي مكان حالياً) — قرار عرض منتج (تبسيط تفاعل السلة في
// الهيدر مقابل نافذة معاينة سريعة)، لا قيداً تقنياً. راجع تقرير هذه المهمة للتفصيل الكامل.
//
// عنوان التوصيل (FAKE_ADDRESSES) والبحث (توست "قريباً") بيانات/سلوك وهمية بحتة — نفس القيد المُصرَّح
// به صراحة أصلاً في DeliveryAddressButton.tsx/HeaderSearchBar.tsx (لا نطاق عناوين حقيقي، لا محرك بحث
// حقيقي بعد)، مُعاد إنتاجهما هنا بنفس الآلية بالضبط لأن MobileHeaderStem/DesktopHeaderStem يعرضان
// عنصري العنوان/البحث بأنفسهما (لا يستضيفان DeliveryAddressButton/HeaderSearchBar كمكوّنين فرعيين).

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DesktopHeaderStem } from '@/components/ui/DesktopHeaderStem';
import { MobileHeaderStem } from '@/components/ui/MobileHeaderStem';
import { BottomSheet } from '@/components/BottomSheet';
import { useCartTotal } from '@/components/CartTotalProvider';

interface FakeAddress {
  id: string;
  label: string;
  detail: string;
}

const FAKE_ADDRESSES: FakeAddress[] = [
  { id: '1', label: 'المنزل', detail: 'شارع النموذج 12، القاهرة' },
  { id: '2', label: 'العمل', detail: 'برج التجربة، الجيزة' },
  { id: '3', label: 'عنوان آخر', detail: 'ميدان الاختبار، الإسكندرية' },
];

const FEED_TAB_HREF: Record<string, string> = {
  all: '/?tab=all',
  products: '/?tab=products',
  posts: '/?tab=posts',
};

const SEARCH_TOAST_MS = 2000;

export function ReefHeader({ cartItemCount }: { cartItemCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { total } = useCartTotal();

  const [addressOpen, setAddressOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(FAKE_ADDRESSES[0].id);
  const [searchToast, setSearchToast] = useState(false);

  const selectedAddress = FAKE_ADDRESSES.find((a) => a.id === selectedAddressId) ?? FAKE_ADDRESSES[0];
  const activeFeedTab = searchParams.get('tab') ?? 'all';

  function handleSearch() {
    setSearchToast(true);
    window.setTimeout(() => setSearchToast(false), SEARCH_TOAST_MS);
  }

  function handleFeedTabChange(tabId: string) {
    const href = FEED_TAB_HREF[tabId];
    if (href) router.push(href);
  }

  return (
    <>
      <DesktopHeaderStem storeName="ريف المدينة" onSearch={handleSearch} />
      <MobileHeaderStem
        storeName="ريف المدينة"
        currentAddress={`${selectedAddress.label} — ${selectedAddress.detail}`}
        onToggleWorlds={() => router.push('/')}
        onOpenCart={() => router.push('/cart')}
        onAddressClick={() => setAddressOpen(true)}
        onSearch={handleSearch}
        activeFeedTab={activeFeedTab}
        onFeedTabChange={handleFeedTabChange}
        totalItems={cartItemCount}
        totalPrice={total}
      />

      {searchToast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[110] flex justify-center px-4">
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            البحث قريباً
          </span>
        </div>
      )}

      <BottomSheet open={addressOpen} onClose={() => setAddressOpen(false)} title="اختر العنوان">
        <ul className="flex flex-col gap-2">
          {FAKE_ADDRESSES.map((address) => (
            <li key={address.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(address.id);
                  setAddressOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-start transition ${
                  address.id === selectedAddressId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="font-medium text-foreground">{address.label}</span>
                <span className="text-sm text-muted-foreground">{address.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
