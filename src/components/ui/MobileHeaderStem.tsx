'use client';

import React from 'react';
import { Search, ShoppingCart, ChevronDown } from 'lucide-react';
import { getSegmentedFeedTabsConfig } from '@/services/dynamic-nav-config';

export interface MobileHeaderProps {
  storeName?: string;
  currentAddress?: string;
  logoUrl?: string;
  onToggleWorlds?: () => void;
  onOpenCart?: () => void;
  onAddressClick?: () => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  showBars?: boolean;
  activeFeedTab?: string;
  onFeedTabChange?: (tabId: string) => void;
  totalItems?: number;
  totalPrice?: number;
}

export const MobileHeaderStem: React.FC<MobileHeaderProps> = ({
  storeName = 'ريف المدينة',
  currentAddress = 'التوصيل إلى جدة، حي النزهة',
  logoUrl,
  onToggleWorlds,
  onOpenCart,
  onAddressClick,
  searchQuery,
  onSearch,
  showBars = true,
  activeFeedTab = 'all',
  onFeedTabChange,
  totalItems = 0,
  totalPrice = 0
}) => {
  const feedTabs = getSegmentedFeedTabsConfig();

  return (
    <>
      <header 
        className={`flex lg:hidden w-full fixed top-0 inset-x-0 z-40 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] px-4 py-3 border-b border-border/40 flex-col gap-3 transition-all duration-300 ease-out ${!showBars ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`} 
        dir="rtl"
      >
        
        {/* Row 1: Top Bar */}
      <div className="flex flex-row justify-between items-center w-full">
        
        {/* Right: Logo & Worlds Toggle */}
        <div className="relative">
          <button 
            onClick={onToggleWorlds}
            className="w-10 h-10 rounded-full bg-[var(--sb-muted)] border border-border/60 flex items-center justify-center overflow-hidden hover:opacity-90 active:scale-95 transition-all shadow-sm"
            aria-label="تبديل العوالم"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">ريف</span>
            )}
          </button>
        </div>
        
        {/* Center: Title & Address */}
        <div className="flex flex-col items-center relative">
          <span className="font-bold text-base text-foreground">{storeName}</span>
          <button 
            onClick={onAddressClick}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="line-clamp-1 max-w-[120px]">{currentAddress}</span>
            <ChevronDown size={14} />
          </button>
        </div>
        
        {/* Left: Smart Cart */}
        <button 
          onClick={onOpenCart}
          className="focus:outline-none active:scale-95 transition-transform"
          aria-label="سلة المشتريات"
        >
          {totalItems === 0 ? (
            <div className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground shadow-sm">
              <ShoppingCart size={18} strokeWidth={2} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-md transition-all">
              <div className="w-5 h-5 bg-[var(--sb-background)] text-primary flex items-center justify-center rounded-full text-[10px] font-bold">
                {totalItems}
              </div>
              <span className="text-sm font-extrabold">{totalPrice} ج</span>
              <ShoppingCart size={16} strokeWidth={2.5} />
            </div>
          )}
        </button>

      </div>

      {/* Row 2: Search */}
      <div className="w-full h-10 bg-[var(--sb-muted)] rounded-[var(--sb-radius-2xl)] flex items-center px-3 text-sm text-muted-foreground gap-2">
        <Search size={16} />
        <input 
          type="text" 
          placeholder="ابحث عن منتجات..." 
          className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/80"
          value={searchQuery || ''}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      {/* Row 3: Segmented Feed Switcher */}
      {onFeedTabChange && (
        <div className="bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl flex items-center justify-between gap-1 w-full mt-1">
          {feedTabs.map(tab => {
            const isActive = activeFeedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFeedTabChange(tab.id)}
                className={`flex-1 flex justify-center items-center py-1.5 px-2 rounded-xl text-xs transition-all ${
                  isActive 
                    ? 'bg-white text-emerald-700 font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      </header>

      {/* Detached Cart Capsule (When Header is Hidden) */}
      {!showBars && totalItems > 0 && (
        <button 
          onClick={onOpenCart}
          className="fixed top-3 left-4 z-50 bg-white/90 backdrop-blur-xl shadow-lg border border-slate-200/60 rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-2 lg:hidden"
          dir="rtl"
        >
          <div className="w-5 h-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-[10px] font-bold">
            {totalItems}
          </div>
          <span className="text-sm font-extrabold text-foreground">{totalPrice} ج</span>
          <ShoppingCart size={16} strokeWidth={2.5} className="text-primary" />
        </button>
      )}
    </>
  );
};
