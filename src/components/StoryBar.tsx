// src/components/StoryBar.tsx
// شريط "ستوري" فوق الأحياء الحقيقية (اليوم 26، BAYAN-HOME-FEED-001) — يستهلك HorizontalShelf
// (اليوم 25) + categories حقيقية من catalogService.listCategories() الموجودة أصلاً (لا استعلام
// جديد). حرف أول اسم القسم كصورة بديلة (Avatar) — لا مكتبة أيقونات محسومة بعد (UI_UX_SYSTEM.md §6)،
// ولا حقل صورة/رمز على Category أصلاً — بلا اختراع بيانات غير موجودة.

import Link from 'next/link';
import type { Category } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';

export function StoryBar({ categories }: { categories: Category[] }) {
  return (
    <HorizontalShelf emptyMessage="لا توجد أحياء بعد">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/${category.slug}`}
          className="flex w-20 shrink-0 snap-start flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-muted text-lg font-semibold text-primary">
            {category.name.charAt(0)}
          </span>
          <span className="w-full truncate text-center text-xs text-foreground">{category.name}</span>
        </Link>
      ))}
    </HorizontalShelf>
  );
}
