'use client';

import React from 'react';
import { BadgeCheck, Heart, Share2, ShoppingCart, ChevronLeft } from 'lucide-react';

export interface StemHeroFeedCardProps {
  id: string;
  publisher?: {
    name: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  category: {
    name: string;
    slug: string;
  };
  subCategory?: string;
  title: string;
  description: string;
  imageUrl: string;
  isProduct?: boolean;
  price?: number;
  originalPrice?: number;
  badge?: string;
  onAddToCart?: (id: string, price: number) => void;
  onNavigateToCategory?: (slug: string) => void;
  onClick?: () => void;
}

export const StemHeroFeedCard: React.FC<StemHeroFeedCardProps> = ({
  id,
  publisher = { name: 'ريف المدينة', verified: true },
  category,
  subCategory,
  title,
  description,
  imageUrl,
  isProduct = true,
  price = 0,
  originalPrice,
  badge,
  onAddToCart,
  onNavigateToCategory,
  onClick
}) => {
  return (
    <div className="w-full sb-glass border border-border/40 rounded-3xl overflow-hidden shadow-sm flex flex-col" dir="rtl">
      
      {/* Header: Publisher Info */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
            {publisher.avatarUrl ? (
              <img src={publisher.avatarUrl} alt={publisher.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xs bg-primary/10">
                {publisher.name.substring(0, 2)}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-foreground">{publisher.name}</span>
              {publisher.verified !== false && (
                <BadgeCheck size={14} className="text-primary fill-primary/10" />
              )}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {category.name} {subCategory && <span className="opacity-75 text-[10px]">({subCategory})</span>}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => onNavigateToCategory && onNavigateToCategory(category.slug)}
          className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
        >
          <span>القسم</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="relative w-full h-52 sm:h-72 md:h-80 max-h-[42vh] md:max-h-[48vh] bg-muted group cursor-pointer"
        onClick={onClick}
      >
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />

        {/* Floating Actions (Top Left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-card transition-all shadow-sm">
            <Heart size={20} />
          </button>
          <button className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-card transition-all shadow-sm">
            <Share2 size={20} />
          </button>
        </div>

        {/* Optional Badge (Top Right) */}
        {badge && (
          <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md">
            {badge}
          </div>
        )}
      </div>

      {/* Footer Content */}
      <div className="p-4 sm:p-5 flex flex-col gap-2">
        <h3
          className="text-lg font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={onClick}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{description}</p>

        {isProduct && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-foreground">{price} <span className="text-sm font-bold text-muted-foreground">ج</span></span>
                {originalPrice && (
                  <span className="text-sm text-muted-foreground line-through mb-1">{originalPrice} ج</span>
                )}
              </div>
            </div>

            <button
              onClick={() => onAddToCart && onAddToCart(id, price)}
              className="flex-1 max-w-[200px] h-12 bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <ShoppingCart size={18} />
              <span>أضف للسلة</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
