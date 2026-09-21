'use client';

import React from 'react';

export interface CartBreakdownProps {
  subtotal: number;
  deliveryFeeText?: string;
  tipAmount?: number;
  walletAmount?: number;
  finalTotal?: number;
}

export const CartBreakdownStem: React.FC<CartBreakdownProps> = ({ 
  subtotal, 
  deliveryFeeText = 'يحدد لاحقاً',
  tipAmount = 0,
  walletAmount = 0,
  finalTotal
}) => {
  const safeSubtotal = Number(subtotal) || 0;
  const safeTip = Number(tipAmount) || 0;
  const safeWallet = Number(walletAmount) || 0;
  const safeFinal = finalTotal !== undefined ? Number(finalTotal) || 0 : undefined;

  const calculatedTotal = safeFinal ?? (safeSubtotal + safeTip + safeWallet);

  return (
    <div className="bg-[var(--sb-muted)] rounded-[var(--sb-radius-2xl)] p-4 mt-4 space-y-3 w-full border border-border/40 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">قيمة المنتجات</span>
        <span className="text-foreground text-sm font-bold">{safeSubtotal} ج.م</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">رسوم التوصيل</span>
        <span className="text-foreground text-sm font-bold">{deliveryFeeText}</span>
      </div>

      {safeTip > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">إكرامية (Tip)</span>
          <span className="text-foreground text-sm font-bold">{safeTip} ج.م</span>
        </div>
      )}

      {safeWallet > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">شحن المحفظة (الفكة)</span>
          <span className="text-foreground text-sm font-bold">{safeWallet} ج.م</span>
        </div>
      )}
      
      <div className="border-t border-border/60 border-dashed pt-3 flex items-center justify-between">
        <span className="text-foreground text-base font-bold">الإجمالي المستحق</span>
        <span className="text-primary text-base font-extrabold">{calculatedTotal} ج.م</span>
      </div>
    </div>
  );
};
