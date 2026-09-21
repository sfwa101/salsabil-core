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
// ⚠️ MobileCartSheetStem استُبعِد عمداً من هذه الشريحة (راجع تقرير المهمة للتفصيل الكامل): ليس صفحة
// سلة، بل "sheet"/drawer مُغلَّف بحالة إغلاق/فتح خاصة به، ويحزم قدرات وهمية بالكامل بلا أي دعم خلفي
// (إكرامية، شحن محفظة، اختيار طريقة دفع، عنوان وهمي ثابت، upsells عبر dummy-ui-service، وزر "إتمام
// الطلب" الذي يُنشئ رقم طلب عشوائي محلياً بلا استدعاء orders.service حقيقي إطلاقاً). لا يوجد drawer
// متنقل مكافئ في المسار القديم لاستبداله — /cart صفحة واحدة متجاوبة لكلا العرضين فعلاً (مؤكَّد في
// الشريحة الأولى: MobileHeaderStem.onOpenCart يُنقِل مباشرة لـ/cart). وصله كان سيتطلب إما اختراع
// قدرة خلفية غير موجودة (ممنوع صراحة) أو انتزاع نصفه (إعادة بناء لا Adapter). راجع Objective الأصلي
// لهذه المهمة — يوصي صراحة بهذا الاستبعاد بالضبط عند اكتشافه.
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

import { useState } from 'react';
import Link from 'next/link';
import { VendorCartGroupStem } from '@/components/ui/VendorCartGroupStem';
import { CartBreakdownStem } from '@/components/ui/CartBreakdownStem';
import { updateCartItemAction, removeCartItemAction } from './actions';
import { groupByTenant, type VendorGroup } from './cart-grouping';
import { useCartToast } from '@/components/useCartToast';

interface CartStemViewProps {
  initialGroups: VendorGroup[];
  initialTotal: number;
  merchantNames: Record<string, string>;
}

export function CartStemView({ initialGroups, initialTotal, merchantNames }: CartStemViewProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [total, setTotal] = useState(initialTotal);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const { showToast, toastNode } = useCartToast();

  const merchantNameById = new Map(Object.entries(merchantNames));

  async function handleUpdateQuantity(itemId: string, _price: number, newQuantity: number) {
    if (pendingIds.has(itemId)) return;
    setPendingIds((prev) => new Set(prev).add(itemId));

    try {
      const result =
        newQuantity <= 0
          ? await removeCartItemAction(itemId)
          : await updateCartItemAction(itemId, newQuantity);

      if ('error' in result) {
        showToast(result.error);
        return;
      }

      setGroups(groupByTenant(result.summary.lines, merchantNameById));
      setTotal(result.summary.total);
    } catch {
      showToast('تعذّر تحديث السلة، حاول مرة أخرى');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  const isMultiVendor = groups.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {isMultiVendor && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">
          طلبك يحتوي على منتجات من {groups.length} تجار — سيُقسَّم طلبك تلقائياً حسب كل تاجر، وستصلك
          الأصناف على استلامات منفصلة، كل واحدة بحالتها الخاصة.
        </div>
      )}

      {groups.map((group) => (
        <VendorCartGroupStem
          key={group.key}
          vendorId={group.key}
          vendorName={group.merchantName}
          items={group.lines.map((line) => ({
            id: line.item.id,
            title: line.product.name,
            price: line.unitPrice,
            quantity: line.item.quantity,
            imageUrl: line.product.imageUrl ?? undefined,
            unit: line.product.unit,
          }))}
          onUpdateQuantity={handleUpdateQuantity}
        />
      ))}

      {/* subtotal/finalTotal كلاهما نفس summary.total الحقيقي — لا رسوم توصيل/خصم/إكرامية/محفظة في
          CartSummary الحالي (راجع تعليق cart/page.tsx الأصلي، ونطاق هذه المهمة §5) — tipAmount/
          walletAmount غير مُمرَّرين عمداً (لا حقل خلفي مقابل)، deliveryFeeText يبقى على الافتراضي
          المدمَج في الـStem نفسه ("يحدد لاحقاً") — وصف دقيق للواقع الحالي، لا رقم مُختلَق. */}
      <CartBreakdownStem subtotal={total} finalTotal={total} />

      <Link
        href="/checkout"
        className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[var(--sb-shadow-pill)] transition hover:opacity-90"
      >
        <span>إتمام الطلب</span>
        <span className="rounded-xl bg-primary-foreground/15 px-3 py-1.5 text-sm">{total} جنيه</span>
      </Link>

      {toastNode}
    </div>
  );
}
