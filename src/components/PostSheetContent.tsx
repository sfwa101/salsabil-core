'use client';
// src/components/PostSheetContent.tsx
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 2) — وضع "منشور" في Bottom Sheet، مسار
// منفصل تماماً عن ProductSheetContent/RecipeSheetContent. يُفتَح فقط لمنشورات لا مرتبطة بمنتج واحد
// مباشر (postType = 'post'/'reel') — راجع تعليق PostCard.tsx لمنطق التوجيه الكامل. المحتوى: نفس
// عرض الـcarousel/caption الموجود أصلاً inline في الخلاصة (لا اختراع تصميم جديد)، بالإضافة لرف
// "المنتجات المذكورة" كمصدر وحيد لفتح Product Sheet من داخل هذا السياق — لا تنقّل لصفحة كاملة.

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';
import { ProductCard } from './ProductCard';

interface PostSheetContentProps {
  post: PostWithDetails;
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export function PostSheetContent({ post, products, onSelectProduct }: PostSheetContentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="flex flex-col gap-3">
      {post.media.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl"
          >
            {post.media.map((m) => (
              <div key={m.id} className="relative aspect-square w-full shrink-0 snap-center">
                <Image src={m.imageUrl} alt="" fill sizes="100vw" className="object-cover" />
              </div>
            ))}
          </div>
          {post.media.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {post.media.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === activeIndex ? 'bg-primary' : 'bg-background/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {post.caption && <p className="px-1 text-sm leading-relaxed text-foreground">{post.caption}</p>}

      {products.length > 0 && (
        <HorizontalShelf title="المنتجات المذكورة">
          {products.map((product) => (
            <div key={product.id} className="w-36 shrink-0 snap-start md:w-44 xl:w-48">
              <ProductCard product={product} onOpenSheet={onSelectProduct} />
            </div>
          ))}
        </HorizontalShelf>
      )}
    </div>
  );
}
