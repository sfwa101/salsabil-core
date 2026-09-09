// src/components/CartLineItem.tsx
// بطاقة بند سلة غنية — REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1: صورة حقيقية
// (product.imageUrl) + أزرار +/- عبر Button (shadcn/ui) بدل النص الخام القديم. الحذف/التحديث
// يبقيان عبر Server Actions — لا framer-motion، لا سحب للحذف، لا تحديث متفائل (Optimistic) كامل:
// نطاق مقصود.
//
// FIX-DD-010-CART-QUANTITY-UI-STALE: CartActionButton (جديد) يعرض مؤشر Pending أثناء معالجة كل
// نموذج — بلا هذا، إعادة التصيير (الآن أثقل بعد تجميع التاجر + رف "غالباً ما يُشترى معه"، ~1-1.4
// ثانية مقيسة حياً) تبدو "متجمّدة" رغم نجاحها. راجع CartActionButton.tsx للتشخيص الكامل.
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 4) — زر +/- أُعيد تصميمه ليطابق بصرياً D:\temp\reefam-
// lovable-reference (ButcherSheet.tsx، قسم "Qty + total"): دائرتان مستقلتان (لا كبسولة بحدود
// تحيطهما كما كانت) — إنقاص محايد (outline، خلفية background) وزيادة بلون العلامة (primary مليء) —
// بتوكنز --sb-* (bg-primary/border-border) لا Hex مباشر (المرجع يستخدم rose-600 مباشرة، خاص بفئة
// اللحوم فقط — راجع ADR-023، لا يُستخدَم كتوكن عام هنا).
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — markup الأزرار +/- استُخرج
// إلى QuantityStepper.tsx (مكوّن مشترك) — بطاقة المنتج في صفحة الحي تستهلك نفس المكوّن الآن.

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { CartActionButton } from '@/components/CartActionButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import { updateCartItemAction, removeCartItemAction } from '@/app/(reef)/cart/actions';
import type { CartLineSummary } from '@/core/modules/cart/types';

export function CartLineItem({ line }: { line: CartLineSummary }) {
  const { item, product, unitPrice, lineTotal } = line;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-background p-3">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={80}
          height={80}
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
          لا صورة
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              {unitPrice} جنيه × {item.quantity}
            </p>
          </div>
          <form
            action={async () => {
              'use server';
              await removeCartItemAction(item.id);
            }}
          >
            <CartActionButton
              ariaLabel="حذف"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </CartActionButton>
          </form>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{lineTotal} جنيه</span>
          <QuantityStepper
            quantity={item.quantity}
            onDecrement={async () => {
              'use server';
              await updateCartItemAction(item.id, item.quantity - 1);
            }}
            onIncrement={async () => {
              'use server';
              await updateCartItemAction(item.id, item.quantity + 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
