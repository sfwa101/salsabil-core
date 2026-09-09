// src/components/CartVendorGroup.tsx
// بطاقة مجموعة بنود سلة لتاجر واحد — REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1: تجميع
// بصري حسب product.tenantId → merchant.businessName (بيانات حقيقية موجودة فعلاً، لا "دفع عبر
// واتساب" كالمرجع — نظام الدفع/الطلبات عندنا موحَّد عبر checkout الحالي). راجع تحذير تعدد
// التجار في cart/page.tsx — التجميع بصري بحت، لا يعني أن checkout يدعم تاجرين في نفس الطلب.
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 8) — خلفية منطقة البنود أصبحت صينية
// خافتة (bg-muted/40) بدل الاستمرار بلون بطاقة القسم نفسه — الآن بطاقات CartLineItem المرتفعة
// (bg-card + ظل، راجع تعديلها المصاحب) تبرز بصرياً فوقها بدل أن "تغرق" بلا تمايز، يطابق طبقتي
// (صينية خافتة/بطاقة مرتفعة) VendorGroupCard في مرجع Lovable (Cart.tsx).

import { Store } from 'lucide-react';
import { CartLineItem } from './CartLineItem';
import type { CartLineSummary } from '@/core/modules/cart/types';

interface CartVendorGroupProps {
  merchantName: string;
  lines: CartLineSummary[];
}

export function CartVendorGroup({ merchantName, lines }: CartVendorGroupProps) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{merchantName}</p>
          <p className="text-xs text-muted-foreground">
            {lines.length} منتج · إجمالي {subtotal} جنيه
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 bg-muted/40 p-3">
        {lines.map((line) => (
          <CartLineItem key={line.item.id} line={line} />
        ))}
      </div>
    </section>
  );
}
