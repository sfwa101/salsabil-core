'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Trash2 } from 'lucide-react';

export interface CartLineItemProps {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  unit?: string;
  onUpdateQuantity: (id: string, price: number, newQuantity: number) => void;
}

export const CartLineItemStem: React.FC<CartLineItemProps> = ({
  id,
  title,
  price,
  quantity,
  imageUrl,
  unit,
  onUpdateQuantity
}) => {
  const safePrice = Number(price) || 0;
  const safeQuantity = Number(quantity) || 0;

  return (
    <div className="flex items-center gap-3 p-2 bg-[var(--sb-background)] rounded-[var(--sb-radius-2xl)] border border-border/40 shadow-sm mb-2">
      {/* Image Container */}
      <div className="w-14 h-14 rounded-lg overflow-hidden relative shrink-0 bg-[var(--sb-muted)] border border-border/40">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">بدون صورة</div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-col justify-between flex-1 py-0.5">
        <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-1">{title}</h3>
        {unit ? (
          <span className="text-[10px] text-muted-foreground bg-[var(--sb-muted)] px-2 py-0.5 rounded-md w-fit mt-1">
            {unit}
          </span>
        ) : (
          <div className="h-4" />
        )}
        <span className="text-xs font-semibold text-primary mt-1">{safePrice} ج.م</span>
      </div>

      {/* Quantity Control Pill */}
      <div className="flex items-center justify-between gap-1 px-1.5 h-7 rounded-full bg-[var(--sb-muted)] border border-border/40 text-foreground shadow-sm min-w-[5rem] shrink-0 scale-95">
        <button 
          onClick={() => onUpdateQuantity(id, safePrice, Math.max(0, safeQuantity - 1))}
          className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-full transition-colors"
          aria-label="إنقاص الكمية"
        >
          {safeQuantity === 1 ? <Trash2 size={12} className="text-destructive" /> : <Minus size={12} strokeWidth={2.5} />}
        </button>
        
        <span className="text-xs font-bold px-1 select-none text-center min-w-[16px]">
          {safeQuantity}
        </span>

        <button 
          onClick={() => onUpdateQuantity(id, safePrice, safeQuantity + 1)}
          className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-full transition-colors text-primary"
          aria-label="زيادة الكمية"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
