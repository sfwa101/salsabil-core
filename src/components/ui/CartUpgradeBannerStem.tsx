'use client';

import React from 'react';

export interface CartUpgradeBannerProps {
  currentTotal: number;
  freeShippingThreshold?: number;
}

export const CartUpgradeBannerStem: React.FC<CartUpgradeBannerProps> = ({
  currentTotal,
  freeShippingThreshold = 500
}) => {
  const safeTotal = Number(currentTotal) || 0;
  const remaining = Math.max(0, freeShippingThreshold - safeTotal);
  const percentage = Math.min(100, (safeTotal / freeShippingThreshold) * 100);

  if (remaining === 0) {
    return (
      <div className="bg-primary/10 text-primary border border-primary/20 rounded-2xl p-3 flex flex-col gap-2 mb-4 w-full">
        <div className="flex items-center justify-between text-xs font-bold">
          <span>🎉 مبروك! حصلت على توصيل مجاني</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/10 text-primary border border-primary/20 rounded-2xl p-3 flex flex-col gap-2 mb-4 w-full">
      <div className="flex items-center justify-between text-xs font-bold">
        <span>أضف {remaining} ج.م لتحصل على توصيل مجاني</span>
      </div>
      <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
