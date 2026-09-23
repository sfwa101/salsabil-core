'use client';
// src/components/CartLineItem.tsx
// بطاقة بند سلة غنية — REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1: صورة حقيقية
// (product.imageUrl) + أزرار +/- عبر Button (shadcn/ui) بدل النص الخام القديم.
//
// FIX-DD-010-CART-QUANTITY-UI-STALE: كان هذا الملف يعتمد على CartActionButton (مؤشر Pending أثناء
// معالجة كل نموذج) لتغطية زمن استجابة السيرفر الحقيقي (~1-1.4 ثانية، docs/DECISIONS.md → DD-010) —
// إصلاح إدراكي فقط، لا يُلغي الانتظار الفعلي.
//
// IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS — الحل الجذري: 'use client' + useOptimisticCartLine
// (useOptimistic حقيقي). أزرار +/- تُحدِّث الرقم على الشاشة فوراً (أقل من فريم واحد)، وupdateCartItemAction
// نفسه (بلا أي تعديل على منطقه) يُرسَل في الخلفية بالتوازي. نجاح صامت؛ فشل (نفاد مخزون مثلاً) يُعيد
// الرقم تلقائياً للقيمة الحقيقية (useOptimistic نفسه، بلا كود تراجع يدوي) + توست بالسبب. إنقاص الكمية
// إلى 0 (حذف، نفس سلوك cartService.updateItemQuantity الحالي) يُخفي البند فوراً محلياً أيضاً. زر
// الحذف (Trash) خارج نطاق هذه المهمة — يبقى form + CartActionButton كما كان تماماً.
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 4) — زر +/- أُعيد تصميمه ليطابق بصرياً D:\temp\reefam-
// lovable-reference (ButcherSheet.tsx، قسم "Qty + total"): دائرتان مستقلتان (لا كبسولة بحدود
// تحيطهما كما كانت) — إنقاص محايد (outline، خلفية background) وزيادة بلون العلامة (primary مليء) —
// بتوكنز --sb-* (bg-primary/border-border) لا Hex مباشر (المرجع يستخدم rose-600 مباشرة، خاص بفئة
// اللحوم فقط — راجع ADR-023، لا يُستخدَم كتوكن عام هنا).
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — markup الأزرار +/- استُخرج
// إلى QuantityStepper.tsx (مكوّن مشترك) — بطاقة المنتج في صفحة الحي تستهلك نفس المكوّن الآن.
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 8) — تفاصيل بصرية متبقية من مرجع
// Lovable (Cart.tsx → CartLineItem المحلي هناك)، فوق البنية الوظيفية الموجودة فعلاً بلا تغيير: ظل
// ناعم + خلفية بطاقة مرتفعة (كانت bg-background مسطَّحة بلا ظل، تبدو "غارقة" داخل خلفية
// CartVendorGroup المطابقة لها لوناً) — الآن تبرز كبطاقة مستقلة فوق صينية المجموعة (راجع تعديل
// CartVendorGroup.tsx المصاحب). زر الحذف مربع ناعم بخلفية destructive/10 (كان دائرة شفافة) — يطابق
// `h-7 w-7 rounded-[10px] bg-destructive/10` في المرجع حرفياً. إجمالي البند أكبر/أثقل (كان
// text-sm، أصبح text-base) ليبرز كرقم أساسي في الصف، لا رقماً ثانوياً بجانب العدّاد.

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { CartActionButton } from '@/components/CartActionButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';
import { CartLineItemStem } from '@/components/ui/CartLineItemStem';
import type { CartLineSummary } from '@/core/modules/cart/types';

export function CartLineItem({ line }: { line: CartLineSummary }) {
  const { item, product, unitPrice } = line;
  const { showToast, toastNode } = useCartToast();
  const { quantity, setQuantity } = useOptimisticCartLine(
    product.id,
    unitPrice,
    { itemId: item.id, quantity: item.quantity, selection: item.selection },
    showToast
  );

  if (quantity <= 0) return toastNode;

  return (
    <>
      <CartLineItemStem
        id={product.id}
        title={product.name}
        price={unitPrice}
        quantity={quantity}
        imageUrl={product.imageUrl}
        unit={product.unit}
        onUpdateQuantity={(id, price, newQuantity) => {
          setQuantity(newQuantity);
        }}
      />
      {toastNode}
    </>
  );
}
