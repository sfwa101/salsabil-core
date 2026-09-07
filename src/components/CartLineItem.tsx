// src/components/CartLineItem.tsx
// بطاقة بند سلة غنية — REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1: صورة حقيقية
// (product.imageUrl) + أزرار +/- عبر Button (shadcn/ui) بدل النص الخام القديم. الحذف/التحديث
// يبقيان عبر Server Actions (نفس نمط cart/page.tsx القديم بالضبط) — لا framer-motion، لا سحب
// للحذف، لا تحديث متفائل (Optimistic) من جانب العميل: نطاق مقصود، راجع Task Report.

import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateCartItemAction, removeCartItemAction } from '@/app/(reef)/cart/actions';
import type { CartLineSummary } from '@/core/modules/cart/types';

export function CartLineItem({ line }: { line: CartLineSummary }) {
  const { item, product, unitPrice, lineTotal } = line;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-background p-3">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- نفس نمط ProductCard.tsx/PostCard.tsx القائم
        <img
          src={product.imageUrl}
          alt={product.name}
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
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              aria-label="حذف"
              className="shrink-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{lineTotal} جنيه</span>
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
            <form
              action={async () => {
                'use server';
                await updateCartItemAction(item.id, item.quantity - 1);
              }}
            >
              <Button type="submit" variant="ghost" size="icon-xs" aria-label="إنقاص">
                <Minus size={12} />
              </Button>
            </form>
            <span className="w-5 text-center text-sm font-medium text-foreground">{item.quantity}</span>
            <form
              action={async () => {
                'use server';
                await updateCartItemAction(item.id, item.quantity + 1);
              }}
            >
              <Button type="submit" variant="ghost" size="icon-xs" aria-label="زيادة">
                <Plus size={12} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
