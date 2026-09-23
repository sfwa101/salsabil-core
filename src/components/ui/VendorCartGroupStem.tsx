'use client';

import React from 'react';
import { Store } from 'lucide-react';
import { CartLineItem } from '@/components/CartLineItem';
import type { CartLineSummary } from '@/core/modules/cart/types';

export interface VendorGroupProps {
  vendorId: string;
  vendorName: string;
  lines: CartLineSummary[];
}

export const VendorCartGroupStem: React.FC<VendorGroupProps> = ({
  vendorName,
  lines,
}) => {
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
            {lines.length} منتجات
          </span>
        </div>
      </div>

      {/* Group Items */}
      <div className="flex flex-col gap-2">
        {lines.map(line => (
          <CartLineItem
            key={line.item.id}
            line={line}
          />
        ))}
      </div>

    </div>
  );
};
