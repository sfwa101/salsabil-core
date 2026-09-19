'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff, Plus } from 'lucide-react';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';

export function MobileSmallProductCard({
  product,
  cartLine,
}: {
  product: Product;
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
    <div className="flex h-[200px] w-[140px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition hover:border-emerald-200">
      {/* Image Area */}
      <Link href={`/product/${product.id}`} className="relative h-24 w-full flex-1 overflow-hidden bg-white p-2 block">
        {/* Top Badges (Right side) */}
        <div className="absolute right-2 top-2 z-10 pointer-events-none">
          <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
            رائج
          </span>
        </div>

        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff size={24} />
          </div>
        )}
      </Link>

      {/* Content Area */}
      <div className="flex flex-col p-3 pb-3">
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="truncate text-[13px] font-bold leading-tight text-gray-900 transition hover:text-emerald-600">
            {product.name}
          </h3>
        </Link>
        
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium leading-none mb-1">{product.unit}</span>
            <span className="text-[15px] font-extrabold leading-none text-gray-900 flex items-baseline gap-0.5">
              {product.basePrice} <span className="text-[9px] text-gray-500 font-bold">ج.م</span>
            </span>
          </div>

          <div className="shrink-0 ml-1">
            {quantity > 0 ? (
               <div className="-mr-1 scale-90 origin-right">
                <QuantityStepper
                  variant="pill"
                  quantity={quantity}
                  onDecrement={() => setQuantity(quantity - 1)}
                  onIncrement={() => setQuantity(quantity + 1)}
                />
               </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setQuantity(1); }}
                aria-label="أضف للسلة"
                className="flex items-center justify-center h-8 w-8 rounded-full shadow-[0_2px_8px_rgba(16,185,129,0.25)] bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
