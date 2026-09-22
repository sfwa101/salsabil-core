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
    cartLine ? { itemId: cartLine.item.id, quantity: cartLine.item.quantity } : undefined,
    showToast
  );

  return (
    <div className="relative overflow-hidden rounded-3xl sb-glass shadow-sm">
      {/* Social Header (Publisher) */}
      {category && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
              <span className="text-sm font-bold text-muted-foreground">{category.name.substring(0, 1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-card-foreground flex items-center gap-1">
                {category.name}
                <BadgeCheck size={14} className="text-primary fill-primary/10" />
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {category.name}
              </span>
            </div>
          </div>
          <Link href={`/${category.slug}`} className="bg-muted text-muted-foreground text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-0.5 active:scale-95 transition-transform hover:bg-accent">
            القسم
            <ChevronLeft size={14} />
          </Link>
        </div>
      )}

      {/* Hero Image & Floating Actions */}
      <div className="relative h-56 w-full overflow-hidden bg-card">
        {/* Top Badges (Right side) */}
        {/* Placeholder for future dynamic badges */}

        {/* Top Action Buttons (Left side) */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 pointer-events-auto">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-[var(--sb-shadow-soft)] backdrop-blur-md transition hover:text-destructive active:scale-95">
            <Heart size={18} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-[var(--sb-shadow-soft)] backdrop-blur-md transition hover:text-primary active:scale-95">
            <Share2 size={18} />
          </button>
        </div>

        <Link href={`/product/${product.id}`} className="block w-full h-full">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff size={40} />
            </div>
          )}
        </Link>
      </div>

      {/* Content Details */}
      <div className="flex flex-col px-5 pb-5">
        <Link href={`/product/${product.id}`}>
          <h2 className="text-2xl font-bold text-foreground leading-tight transition hover:text-primary mt-2">
            {product.name}
          </h2>
        </Link>
        
        {product.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-4 flex flex-row items-center justify-between gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[24px] font-extrabold leading-none text-foreground flex items-baseline gap-1">
              {product.basePrice}
              <span className="text-sm font-bold text-muted-foreground">ج.م</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-bold mt-1">{product.unit}</span>
          </div>

          <div className="flex-1 flex items-center justify-end min-w-[130px]">
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
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-bold shadow-sm active:scale-95 transition-transform"
              >
                <ShoppingCart size={16} strokeWidth={2.5} />
                + أضف إلى السلة
              </button>
            )}
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
