// src/components/ReelsShelfPlaceholder.tsx
// عنصر نائب بصري بحت لرف الريلز (اليوم 27، BAYAN-HOME-FEED-001) — يظهر متداخلاً بين بطاقات الخلاصة
// (Feed.tsx). لا بيانات ريل حقيقية بعد (post_media بلا حقل فيديو، post_type='reel' لا يزال يُعرَض
// كمنشور صور عادي عبر listFeed) — نفس فلسفة "قريباً" في FeedTopBar (اليوم 26): تلميح بصري للميزة
// القادمة بلا وظيفة نقر فعلية، لا اختراع مصدر بيانات غير موجود.

import { Play } from 'lucide-react';
import { HorizontalShelf } from './HorizontalShelf';

const PLACEHOLDER_TILE_COUNT = 6;

export function ReelsShelfPlaceholder() {
  return (
    <HorizontalShelf title="ريلز">
      {Array.from({ length: PLACEHOLDER_TILE_COUNT }).map((_, i) => (
        <div
          key={i}
          className="flex aspect-[9/16] w-28 shrink-0 snap-start items-center justify-center rounded-2xl bg-muted md:w-32 xl:w-36"
        >
          <Play size={22} className="text-muted-foreground" />
        </div>
      ))}
    </HorizontalShelf>
  );
}
