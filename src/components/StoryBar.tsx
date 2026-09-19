// src/components/StoryBar.tsx
// شريط "ستوري" فوق الأحياء الحقيقية (اليوم 26، BAYAN-HOME-FEED-001) — يستهلك HorizontalShelf
// (اليوم 25) + أحياء حقيقية من catalogService.getDistricts() (TASK-18 — كانت Category[] من جدول
// categories القديم، 6 صفوف تجريبية؛ الآن District[] من catalog_districts، 19 حياً مستورَداً
// TASK-17). حرف أول اسم الحي كصورة بديلة (Avatar) — لا مكتبة أيقونات محسومة بعد (UI_UX_SYSTEM.md
// §6)، ولا حقل صورة/رمز على District أصلاً — بلا اختراع بيانات غير موجودة.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 3): حلقة تدرّج لوني + ظل حول كل Avatar —
// بتوكنز --sb-* (primary→accent) لا Hex مباشر، يعمل صحيحاً عبر أي [data-world]. نفس روح ReefStories
// المرجعي (D:\temp\reefam-lovable-reference\src\components\ReefStories.tsx) بلا نسخ قيم الألوان.

import Link from 'next/link';
import type { District } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';

const FALLBACK_GRADIENTS = [
  'bg-gradient-to-br from-emerald-400 to-teal-600',
  'bg-gradient-to-br from-orange-400 to-red-500',
  'bg-gradient-to-br from-blue-400 to-indigo-600',
  'bg-gradient-to-br from-purple-400 to-fuchsia-600',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-rose-400 to-pink-600',
];

export function StoryBar({ districts = [] }: { districts?: District[] }) {
  return (
    <HorizontalShelf emptyMessage="لا توجد أحياء بعد">
      {districts.map((district, index) => (
        <Link
          key={district.id}
          href={`/${district.slug}`}
          className={`group relative flex h-40 w-[100px] shrink-0 snap-start flex-col items-center justify-center overflow-hidden rounded-2xl md:h-48 md:w-[120px] shadow-sm transition-transform active:scale-95 border border-border/50 ${FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]}`}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
          <span className="relative z-10 text-4xl text-white/50 font-black mb-2 group-hover:scale-110 transition-transform duration-500">
            {district.nameAr.substring(0, 1)}
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2">
            <span className="block w-full text-center text-[11px] font-bold text-white md:text-sm px-1 truncate">
              {district.nameAr}
            </span>
          </div>
        </Link>
      ))}
    </HorizontalShelf>
  );
}
