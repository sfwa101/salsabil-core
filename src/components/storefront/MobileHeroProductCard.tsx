'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Share2, ImageOff, ShoppingCart, ChevronLeft, BadgeCheck } from 'lucide-react';
import type { Product, Category } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';

export function MobileHeroProductCard({
  product,
  category,
  cartLine,
}: {
  product: Product;
  category?: Category;
  cartLine?: CartLineSummary;
}) {
  const { showToast, toastNode } = useCartToast();
  const { quantity, setQuantity } = useOptimisticCartLine(
    product.id,
    cartLine?.unitPrice ?? product.basePrice,
    cartLine ? { itemId: cartLine.item.id, quantity: cartLine.item.quantity, selection: cartLine.item.selection } : undefined,
    showToast
  );

  return (
    <div className="w-full sb-glass border border-border/40 rounded-3xl overflow-hidden shadow-sm flex flex-col" dir="rtl">
      {/* Social Header (Publisher) */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
            {category ? (
              <span className="text-sm font-bold text-muted-foreground">{category.name.substring(0, 1)}</span>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xs bg-primary/10">
                ري
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-foreground">ريف المدينة</span>
              <BadgeCheck size={14} className="text-primary fill-primary/10" />
            </div>
            {category && (
              <div className="text-xs text-muted-foreground font-medium">
                {category.name}
              </div>
            )}
          </div>
        </div>

        {category && (
          <Link href={`/${category.slug}`} className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors">
            <span>القسم</span>
            <ChevronLeft size={14} />
          </Link>
        )}
      </div>

      {/* Hero Image & Floating Actions */}
      <Link href={`/product/${product.id}`} className="block w-full">
        <div className="relative w-full h-52 sm:h-72 md:h-80 max-h-[42vh] md:max-h-[48vh] bg-muted group cursor-pointer">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff size={40} />
            </div>
          )}

          {/* Floating Actions (Top Left) */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={(e) => e.preventDefault()}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-card transition-all shadow-sm"
            >
              <Heart size={20} />
            </button>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-card transition-all shadow-sm"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </Link>

      {/* Content Details */}
      <div className="p-4 sm:p-5 flex flex-col gap-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="text-lg font-bold text-foreground cursor-pointer hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-end gap-2 text-right">
              <span className="text-2xl font-extrabold text-foreground">
                {product.basePrice} <span className="text-sm font-bold text-muted-foreground">ج</span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-bold mt-1">{product.unit}</span>
          </div>

          <div className="flex-1 max-w-[200px] flex items-center justify-end">
            {quantity > 0 ? (
              <QuantityStepper
                variant="pill"
                quantity={quantity}
                onDecrement={() => setQuantity(quantity - 1)}
                onIncrement={() => setQuantity(quantity + 1)}
              />
            ) : (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setQuantity(1); }}
                className="w-full h-12 bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
              >
                <ShoppingCart size={18} />
                <span>أضف للسلة</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
