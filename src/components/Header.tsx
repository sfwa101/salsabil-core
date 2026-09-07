// src/components/Header.tsx
// شريط علوي موحّد لكل صفحات (reef) — محايد لونياً بالكامل (توكنز دلالية فقط).
// مكوّن خادم ذاتي الجلب (نفس نمط بقية صفحات المشروع) — لا 'use client'، لا تفاعل يتطلب جافاسكربت.
//
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 1: غلاف بصري فوق shadcn/ui (Button،
// ADR-025) — نفس البنية والوظائف الحقيقية القائمة (رابط السلة الحقيقي + عدّاده الحي)، بلا نظام
// ألوان موازٍ، فقط توكنز --sb-* الحالية عبر الطبقة الدلالية (globals.css). HeaderSearchBar.tsx
// بلا تعديل — منطقه وتوسته "قريباً" كما هما.

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCartItemCountAction } from '@/app/(reef)/cart/actions';
import { HeaderSearchBar } from './HeaderSearchBar';

export async function Header() {
  const itemCount = await getCartItemCountAction();

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-sm">
      {/* مقياس العرض الموحَّد (يطابق FeedTopBar/FeedTabBar/main) + HeaderSearchBar مدموج من lg
          فصاعداً — راجع تعليق HeaderSearchBar.tsx للسبب. */}
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 md:max-w-4xl xl:max-w-6xl">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          ريف المدينة
        </Link>
        <HeaderSearchBar />
        <Button asChild variant="outline" size="icon" className="relative shrink-0 rounded-full">
          <Link href="/cart" aria-label="السلة">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
}
