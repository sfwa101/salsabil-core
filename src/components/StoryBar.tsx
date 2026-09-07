// src/components/StoryBar.tsx
// شريط "ستوري" فوق الأحياء الحقيقية (اليوم 26، BAYAN-HOME-FEED-001) — يستهلك HorizontalShelf
// (اليوم 25) + categories حقيقية من catalogService.listCategories() الموجودة أصلاً (لا استعلام
// جديد). حرف أول اسم القسم كصورة بديلة (Avatar) — لا مكتبة أيقونات محسومة بعد (UI_UX_SYSTEM.md §6)،
// ولا حقل صورة/رمز على Category أصلاً — بلا اختراع بيانات غير موجودة.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 3): حلقة تدرّج لوني + ظل حول كل Avatar —
// بتوكنز --sb-* (primary→accent) لا Hex مباشر، يعمل صحيحاً عبر أي [data-world]. نفس روح ReefStories
// المرجعي (D:\temp\reefam-lovable-reference\src\components\ReefStories.tsx) بلا نسخ قيم الألوان.

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
          className="flex w-20 shrink-0 snap-start flex-col items-center gap-2 md:w-24"
        >
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent p-[2.5px] shadow-md transition active:scale-95 md:h-[84px] md:w-[84px]">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-card text-lg font-semibold text-primary ring-2 ring-card">
              {category.name.charAt(0)}
            </span>
          </span>
          <span className="w-full truncate text-center text-xs text-foreground">{category.name}</span>
        </Link>
      ))}
    </HorizontalShelf>
  );
}
