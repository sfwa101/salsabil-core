'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BottomSheet } from '@/components/BottomSheet';
import { ChevronDown, Store, Leaf, Grape, Beef, Milk, Pill } from 'lucide-react';
import type { Category } from '@/core/modules/catalog/types';

interface DesktopCategorySidebarProps {
  categories?: Category[];
  customerAddress?: string;
}

function getCategoryIcon(index: number) {
  const icons = [Store, Leaf, Grape, Beef, Milk, Pill];
  const Icon = icons[index % icons.length];
  return <Icon size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />;
}

export function DesktopCategorySidebar({ categories = [], customerAddress }: DesktopCategorySidebarProps) {

  return (
    <aside className="sticky top-16 h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden bg-card rounded-2xl border border-border shadow-[var(--sb-shadow-soft)] hidden lg:flex">
      {/* Delivery Address Selector */}
      <button 
        className="p-4 border-b border-border bg-muted/20 hover:bg-muted/50 transition-colors flex items-center justify-between group text-start w-full cursor-default"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">التوصيل إلى</span>
          <span className="font-bold text-sm text-foreground truncate max-w-[150px]">{customerAddress || 'المدينة المنورة'}</span>
        </div>
      </button>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            جاري التحميل...
          </div>
        ) : (
          categories.map((cat, index) => (
            <Link 
              key={cat.id} 
              href={`/${cat.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                {getCategoryIcon(index)}
              </div>
              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
