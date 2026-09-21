'use client';

import React, { useState } from 'react';
import { Search, Home, Package, Clapperboard, FileText, Wallet, MessageCircle, User } from 'lucide-react';
import Image from 'next/image';

export interface DesktopHeaderProps {
  storeName?: string;
  logoUrl?: string;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export const DesktopHeaderStem: React.FC<DesktopHeaderProps> = ({
  storeName = 'ريف المدينة',
  logoUrl,
  searchQuery,
  onSearch
}) => {
  const [showWorlds, setShowWorlds] = useState(false);

  return (
    <header className="hidden lg:flex w-full h-20 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] border-b border-border/40 sticky top-0 z-[100] justify-center" dir="rtl">
      <div className="w-full max-w-[1400px] h-full mx-auto flex items-center justify-between px-6 relative z-[100]">
      
      {/* Right (Start): Logo + Search */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowWorlds(!showWorlds)}
            className="w-12 h-12 rounded-xl bg-[var(--sb-muted)] border border-border/40 flex items-center justify-center overflow-hidden hover:opacity-90 active:scale-95 transition-all"
            aria-label="تبديل العوالم"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">ريف</span>
            )}
          </button>
          
          {/* Dropdown Stub */}
          {showWorlds && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] border border-border/40 rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50">
              <button className="text-right p-2 hover:bg-muted rounded-lg text-sm font-bold text-foreground">{storeName} (الحالي)</button>
              <button className="text-right p-2 hover:bg-muted rounded-lg text-sm font-medium text-muted-foreground">أسراب طيبة</button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="w-80 h-10 bg-[var(--sb-muted)] rounded-[var(--sb-radius-2xl)] flex items-center px-4 text-sm text-muted-foreground gap-2">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن منتجات..." 
            className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/80"
            value={searchQuery || ''}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      {/* Center: Navigation Links */}
      <div className="flex gap-6 items-center justify-center flex-1">
        <button className="flex flex-col items-center gap-1 text-primary">
          <Home size={20} />
          <span className="text-xs font-bold">الرئيسية</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Package size={20} />
          <span className="text-xs font-medium">المنتجات</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Clapperboard size={20} />
          <span className="text-xs font-medium">الريلز</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <FileText size={20} />
          <span className="text-xs font-medium">المنشورات</span>
        </button>
      </div>

      {/* Left (End): User Actions (No Cart) */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors">
          <Wallet size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors">
          <MessageCircle size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors">
          <User size={18} />
        </button>
      </div>

      </div>
    </header>
  );
};
