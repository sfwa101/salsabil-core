'use client';

import React from 'react';
import { ProductCardStemProps } from '@/types/ui-contracts';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';

export const StemProductCard: React.FC<ProductCardStemProps> = ({
  id,
  title,
  price,
  imageUrl,
  badge,
  publisher,
  quantity = 0,
  onAction,
  onAddToCart
}) => {
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction({ type: 'ADD_TO_CART', payload: { id, action: 'increment' } });
    } else {
      // Fallback
      onAddToCart?.(id);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction({ type: 'ADD_TO_CART', payload: { id, action: 'decrement' } });
    }
  };

  return (
    <div 
      dir="rtl"
      className="w-[145px] sm:w-[165px] md:w-[180px] shrink-0 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] rounded-[var(--sb-radius-2xl)] shadow-[var(--sb-shadow-apple-soft)] hover:shadow-md transition-shadow p-0 overflow-hidden flex flex-col justify-between cursor-pointer group border border-border/40"
      onClick={() => onAction && onAction({ type: 'OPEN_QUICK_VIEW', payload: { product: { id, title, price, imageUrl, publisher } } })}
    >
      {/* Image Container */}
      <div className="aspect-square w-full rounded-none overflow-hidden bg-[var(--sb-muted)] relative flex items-center justify-center shrink-0">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={title} 
            fill
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            لا توجد صورة
          </div>
        )}
        
        {/* Badge */}
        {badge && (
          <div className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
            {badge === 'new' && 'جديد'}
            {badge === 'trending' && 'رائج'}
            {badge === 'best' && 'الأفضل مبيعاً'}
          </div>
        )}
      </div>

      {/* Body Details Container */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div className="flex flex-col text-right">
          {publisher.role === 'admin' ? (
            <div className="flex items-center gap-1 justify-start">
              <span className="text-[11px] text-muted-foreground font-normal">{publisher.name}</span>
              <span className="text-[11px] text-muted-foreground font-normal">•</span>
              <Link 
                href={`#category-${publisher.categoryName}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-muted-foreground font-normal hover:text-foreground transition-colors"
              >
                {publisher.categoryName}
              </Link>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground font-normal">
              {publisher.name} • {publisher.categoryName}
            </span>
          )}
          
          <h3 className="font-bold text-sm text-foreground line-clamp-1 mt-1">
            {title}
          </h3>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
          <div className="text-base font-extrabold text-foreground">
            {price} <span className="text-xs font-bold text-muted-foreground">ج.م</span>
          </div>
          
          {/* Interactive Quantity Stepper */}
          <div className="relative flex items-center h-8">
            {quantity === 0 ? (
              <button 
                onClick={handleIncrement}
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground bg-primary hover:scale-105 active:scale-95 transition-all duration-200 ease-in-out shadow-sm"
                aria-label="أضف للسلة"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center justify-between px-1 h-8 rounded-full bg-primary text-primary-foreground shadow-sm min-w-[5.5rem] transition-all duration-200 ease-in-out flex-row">
                <button 
                  onClick={handleDecrement}
                  className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded-full transition-colors active:scale-95"
                  aria-label="إنقاص الكمية"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                
                <span className="text-xs font-bold px-1 select-none min-w-[20px] text-center">
                  {quantity}
                </span>

                <button 
                  onClick={handleIncrement}
                  className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded-full transition-colors active:scale-95"
                  aria-label="زيادة الكمية"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
