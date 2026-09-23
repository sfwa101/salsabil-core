'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Maximize2, Minimize2, ShoppingBag } from 'lucide-react';
import { CartBreakdownStem } from './CartBreakdownStem';
import { CartUpgradeBannerStem } from './CartUpgradeBannerStem';
import { VendorCartGroupStem } from './VendorCartGroupStem';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { awaitPendingCartMutations } from '@/components/cartMutationGate';
import { groupByTenant } from '@/app/(reef)/cart/cart-grouping';

export interface MobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lines: CartLineSummary[];
  totalItems: number;
  totalPrice: number;
}

export const MobileCartSheetStem: React.FC<MobileCartSheetProps> = ({ 
  isOpen, 
  onClose, 
  lines,
  totalItems,
  totalPrice,
}) => {
  const router = useRouter();
  const [sheetState, setSheetState] = useState<'half' | 'full'>('half');

  const handleToggleState = () => {
    setSheetState(prev => (prev === 'half' ? 'full' : 'half'));
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setSheetState('half'), 300);
  };



  const handleCheckoutClick = () => {
    if (totalItems === 0) return;
    awaitPendingCartMutations().then(() => {
      onClose();
      router.push('/cart'); // Existing Cart logic will handle the checkout flow.
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Expandable Sheet */}
      <div 
        className={`fixed bottom-0 left-0 w-full z-50 bg-[var(--sb-background)] shadow-2xl transition-all duration-300 ease-out flex flex-col lg:hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'} ${sheetState === 'half' ? 'h-[72vh] rounded-t-[28px]' : 'h-full rounded-none inset-0'}`}
        dir="rtl"
      >
        {/* Drag Handle & Header */}
        <div className="flex flex-col w-full px-4 pt-2 pb-3 border-b border-border/40 shrink-0">
          <div 
            className="w-12 h-1.5 bg-[var(--sb-muted)] border border-border/40 rounded-full my-1 mx-auto cursor-pointer hover:opacity-70 active:scale-95 transition-all"
            onClick={handleToggleState}
            aria-label="توسيع أو تصغير السلة"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-foreground">سلة المشتريات</h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems} عناصر
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleToggleState}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sb-muted)] text-muted-foreground transition-colors"
              >
                {sheetState === 'half' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button 
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--sb-muted)] hover:opacity-80 text-foreground transition-all"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col scrollbar-none">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground opacity-70">
              <ShoppingBag size={48} strokeWidth={1.5} />
              <p className="font-medium text-sm">السلة فارغة حالياً</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Upgrade Banner */}
              <CartUpgradeBannerStem currentTotal={totalPrice} />

              {/* Vendor Groups */}
              {groupByTenant(lines, new Map()).map((group) => (
                <VendorCartGroupStem 
                  key={group.key}
                  vendorId={group.key}
                  vendorName={group.merchantName}
                  lines={group.lines}
                />
              ))}

              {/* Breakdown Section */}
              <div className="px-1 pb-4">
                <CartBreakdownStem
                  subtotal={totalPrice}
                  tipAmount={0}
                  walletAmount={0}
                  finalTotal={totalPrice}
                />
              </div>
            </div>
          )}
        </div>
        <div className="h-20 shrink-0" />
      </div>

      {/* Sticky Checkout Action Bar (Replaces BottomNavStem) */}
      <div 
        className={`fixed bottom-0 left-0 w-full z-[60] bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] border-t border-border/40 p-3 flex items-center gap-3 transition-transform duration-300 ease-out lg:hidden pb-safe ${isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        dir="rtl"
      >
        <button 
          onClick={handleClose}
          className="w-14 sm:w-16 h-12 flex flex-col items-center justify-center rounded-xl bg-[var(--sb-muted)] text-foreground hover:opacity-80 transition-all shrink-0 border border-border/40"
          aria-label="الرئيسية"
        >
          <ShoppingBag size={18} className="mb-0.5" />
          <span className="text-[9px] font-bold">الرئيسية</span>
        </button>

        <button 
          disabled={totalItems === 0}
          onClick={handleCheckoutClick}
          className="flex-1 h-12 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center justify-between px-4 shadow-md transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-[0.98]"
        >
          <span>إتمام الطلب</span>
          <span>{totalPrice} ج.م</span>
        </button>
      </div>
    </>
  );
};
