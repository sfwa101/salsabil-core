// src/components/Header.tsx
// شريط علوي موحّد لكل صفحات (reef) — محايد لونياً بالكامل (توكنز دلالية فقط، اليوم 14).
// مكوّن خادم ذاتي الجلب (نفس نمط بقية صفحات المشروع) — لا 'use client'، لا تفاعل يتطلب جافاسكربت.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { getCartItemCountAction } from '@/app/(reef)/cart/actions';
import { HeaderSearchBar } from './HeaderSearchBar';

export async function Header() {
  const itemCount = await getCartItemCountAction();

  return (
    <header className="border-b border-border bg-card">
      {/* اليوم 31: مقياس العرض الموحَّد (يطابق FeedTopBar/FeedTabBar/main) + HeaderSearchBar مدموج
          من lg فصاعداً — راجع تعليق HeaderSearchBar.tsx للسبب. */}
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4 md:max-w-4xl xl:max-w-6xl">
        <Link href="/" className="text-lg font-semibold text-foreground">
          ريف المدينة
        </Link>
        <HeaderSearchBar />
        <Link href="/cart" className="flex items-center gap-2 text-foreground">
          <span className="relative">
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                {itemCount}
              </span>
            )}
          </span>
        </Link>
      </div>
    </header>
  );
}
