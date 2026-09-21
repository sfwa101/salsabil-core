'use client';

import React from 'react';
import { Store } from 'lucide-react';
import { CartLineItemStem } from './CartLineItemStem';

export interface VendorGroupProps {
  vendorId: string;
  vendorName: string;
  items: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    unit?: string;
  }[];
  onUpdateQuantity: (id: string, price: number, newQuantity: number) => void;
}

export const VendorCartGroupStem: React.FC<VendorGroupProps> = ({
  vendorName,
  items,
  onUpdateQuantity
}) => {
  const groupTotal = items.reduce((acc, item) => {
    const safePrice = Number(item.price) || 0;
    const safeQty = Number(item.quantity) || 0;
    return acc + safePrice * safeQty;
  }, 0);

  return (
    <div className="mb-6 flex flex-col gap-2">
      {/* Vendor Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--sb-muted)] flex items-center justify-center text-muted-foreground border border-border/40">
            <Store size={12} />
          </div>
          <span className="text-sm font-bold text-foreground">{vendorName}</span>
          <span className="text-[10px] font-bold text-muted-foreground bg-[var(--sb-muted)] px-1.5 py-0.5 rounded-md">
            {items.length} منتجات
          </span>
        </div>
        <span className="text-xs font-bold text-foreground">{groupTotal} ج.م</span>
      </div>

      {/* Group Items */}
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <CartLineItemStem 
            key={item.id}
            {...item}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>

    </div>
  );
};
