'use client';
// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — قبل هذه المهمة: زر الشعار كان يفتح
// قائمة "تبديل عوالم" وهمية (stub بلا وظيفة حقيقية، خيار واحد فيها بلا onClick أصلاً) بدل الانتقال
// للرئيسية كما يفعل src/components/Header.tsx اليوم؛ أزرار التنقّل الوسطى (الرئيسية/المنتجات/الريلز/
// المنشورات) كانت <button> بلا href/onClick إطلاقاً — لا تنقل لأي مكان؛ زر الملف الشخصي كان بلا
// href/onClick أيضاً بينما مكافئه الحقيقي في Header.tsx رابط فعلي لـ/account. كل ذلك أُصلِح هنا بروابط
// Next.js حقيقية. "الريلز" أُسقِط من التبويبات (لا reels حقيقية — نفس القرار المُطبَّق فعلاً في
// Header.tsx، راجع تعليقه هناك). أزرار المحفظة/الدعم تُركت كما هي عمداً — بلا onClick في Header.tsx
// الأصلي أيضاً (لا "تسريب" هنا، مطابقة تامة). لا تغيير على DesktopHeaderProps.

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search, Home, Package, FileText, Wallet, MessageCircle, User } from 'lucide-react';

export interface DesktopHeaderProps {
  storeName?: string;
  logoUrl?: string;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

const NAV_TABS = [
  { id: 'all', label: 'الرئيسية', href: '/?tab=all', icon: Home },
  { id: 'products', label: 'المنتجات', href: '/?tab=products', icon: Package },
  { id: 'posts', label: 'المنشورات', href: '/?tab=posts', icon: FileText },
];

export const DesktopHeaderStem: React.FC<DesktopHeaderProps> = ({
  storeName = 'ريف المدينة',
  logoUrl,
  searchQuery,
  onSearch
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = pathname === '/' ? (searchParams.get('tab') ?? 'all') : null;

  return (
    <header className="hidden lg:flex w-full h-20 bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] border-b border-border/40 sticky top-0 z-[100] justify-center" dir="rtl">
      <div className="w-full max-w-[1400px] h-full mx-auto flex items-center justify-between px-6 relative z-[100]">

      {/* Right (Start): Logo + Search */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="w-12 h-12 rounded-xl bg-[var(--sb-muted)] border border-border/40 flex items-center justify-center overflow-hidden hover:opacity-90 active:scale-95 transition-all"
          aria-label={storeName}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">ريف</span>
          )}
        </Link>

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
        {NAV_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={20} />
              <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Left (End): User Actions (No Cart) */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors" title="محفظة تيسير">
          <Wallet size={18} />
        </button>
        <button className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors" title="الدعم والتواصل">
          <MessageCircle size={18} />
        </button>
        <Link href="/account" className="w-10 h-10 rounded-full bg-[var(--sb-muted)] flex items-center justify-center text-foreground hover:bg-muted-foreground/10 transition-colors" title="حسابي">
          <User size={18} />
        </Link>
      </div>

      </div>
    </header>
  );
};
