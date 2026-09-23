'use client';
// src/app/(reef)/cart/CartStemView.tsx
// VERTICAL-SLICE-3-CART-INTEGRATION (2026-09-22) — Adapter عرض فقط، يستبدل CartVendorGroup +
// القسم المضمَّن للملخّص/زر إتمام الطلب في cart/page.tsx بـVendorCartGroupStem/CartLineItemStem/
// CartBreakdownStem الجاهزة، مربوطة ببيانات CartSummary الحقيقية وupdateCartItemAction/
// removeCartItemAction الحقيقيتين (بلا تعديل عليهما). راجع docs/DECISIONS.md → ADR-035.
//
// لا PageEngine/SectionSchema هنا (نفس ReefHeader.tsx في الشريحة الأولى) — تركيب React عادي.
// SectionSchema.type مقفل على 4 قيم (hero_card/product_shelf/reels_shelf/category_bar) لا تتضمن
// "سلة" مفهومياً؛ إضافة قيمة خامسة تعديل Core-Schema يستوجب استثناء Hard Rule 1 خارج نطاق هذه
// المهمة — البقاء على تركيب عادي (كما فعل Header/BottomNav) هو الخيار الصحيح هنا.
//
// MobileCartSheetStem صار غلاف عرض فوق CartSummary الحقيقي فقط؛ أزيلت منه قدرات الدفع/العنوان/
// الإكرامية الوهمية، ويقود زر الإتمام إلى مسار /cart الحقيقي.
//
// اختلاف سلوك مُعلَن صراحة (لا صامت): الإجمالي/زر إتمام الطلب هنا يتحدّثان فوراً من summary الحقيقي
// المُعاد من كل تعديل كمية/حذف — القسم القديم في page.tsx كان نصاً ثابتاً من التحميل الأول فقط (لا
// حي)، لأن useOptimisticCartLine (المُستخدَم في CartLineItem.tsx القديم) لا يُحدِّث سوى badge
// الهيدر (CartTotalProvider)، لا نص الصفحة نفسه. هذا تحسين طبيعي ناتج عن شكل الـProp الجاهز
// لـVendorCartGroupStem (callback واحد لأعلى، لا hook مستقل لكل بند) — ليس منطقاً مُخترَعاً، كل رقم
// معروض يبقى مصدره الحصري استجابة الخادم الحقيقية.
//
// لا queue تسلسلي هنا (بخلاف useOptimisticCartLine) — نفس مستوى البساطة المُستخدَم فعلاً في
// RealCatalogShelfSDUI.tsx (النمط المرجعي المُثبَت في الشريحتين 1-2)؛ حارس pendingIds بسيط يمنع
// إرسال مزدوج لنفس البند أثناء انتظار الطلب السابق، بلا تعقيد إضافي غير مطلوب.

import Link from 'next/link';
import { VendorCartGroupStem } from '@/components/ui/VendorCartGroupStem';
import { CartBreakdownStem } from '@/components/ui/CartBreakdownStem';
import type { VendorGroup } from './cart-grouping';
import { useCartToast } from '@/components/useCartToast';

import { useCartTotal } from '@/components/CartTotalProvider';

interface CartStemViewProps {
  initialGroups: VendorGroup[];
}

export function CartStemView({ initialGroups }: CartStemViewProps) {
  const { total, itemCount } = useCartTotal();
  const { toastNode } = useCartToast();

  const isMultiVendor = initialGroups.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {itemCount > 0 && isMultiVendor && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">
          طلبك يحتوي على منتجات من {initialGroups.length} تجار — سيُقسَّم طلبك تلقائياً حسب كل تاجر، وستصلك
          الأصناف على استلامات منفصلة، كل واحدة بحالتها الخاصة.
        </div>
      )}

      {itemCount > 0 ? initialGroups.map((group) => (
        <VendorCartGroupStem
          key={group.key}
          vendorId={group.key}
          vendorName={group.merchantName}
          lines={group.lines}
        />
      )) : (
        <p className="rounded-xl border border-border bg-muted p-6 text-center text-muted-foreground">
          السلة فارغة حالياً
        </p>
      )}

      {/* subtotal/finalTotal كلاهما نفس summary.total الحقيقي — لا رسوم توصيل/خصم/إكرامية/محفظة في
          CartSummary الحالي (راجع تعليق cart/page.tsx الأصلي، ونطاق هذه المهمة §5) — tipAmount/
          walletAmount غير مُمرَّرين عمداً (لا حقل خلفي مقابل)، deliveryFeeText يبقى على الافتراضي
          المدمَج في الـStem نفسه ("يحدد لاحقاً") — وصف دقيق للواقع الحالي، لا رقم مُختلَق. */}
      {itemCount > 0 && <CartBreakdownStem subtotal={total} finalTotal={total} />}

      {itemCount > 0 && <Link
        href="/checkout"
        className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[var(--sb-shadow-pill)] transition hover:opacity-90"
      >
        <span>إتمام الطلب</span>
        <span className="rounded-xl bg-primary-foreground/15 px-3 py-1.5 text-sm">{total} جنيه</span>
      </Link>}

      {toastNode}
    </div>
  );
}
