'use client';
// src/components/ScrollHideBar.tsx
// غلاف عام (اليوم 28، BAYAN-HOME-FEED-001) — يُثبِّت أطفاله أعلى الصفحة (sticky top-0) ويُخفيهم
// بالتمرير للأسفل (transform: translateY خارج الشاشة)، ثم يُظهرهم فوراً عند أي تمرير للأعلى — نفس
// نمط "الشريط المنسحب" الشائع في تطبيقات الجوّال (Instagram/Twitter). حالة الإخفاء تُحسَب من فرق
// scrollY بين نبضتين متتاليتين (requestAnimationFrame لتفادي إغراق الحدث)، لا مكتبة خارجية.
//
// ⚠️ نطاق مقصود بالاستثناء: يُغلِّف هنا فقط FeedTopBar/StoryBar/FeedTabBar (page.tsx، مُتجاورة في
// نفس الملف). Header.tsx يبقى بلا تعديل — يعيش في layout.tsx المشترك بين كل صفحات (reef) (سلة/
// checkout/منتج/قسم/طلب)، وربطه بنفس آلية الإخفاء يتطلب تنسيق ارتفاع بين ملفين منفصلين (Header
// عبر layout.tsx مقابل هذا الغلاف عبر page.tsx) بلا فائدة تناسب حجم هذه المهمة — Header أصلاً غير
// sticky اليوم فيختفي طبيعياً بالتمرير للأسفل بلا أي كود إضافي. راجع Task Report اليوم 28 للتفصيل.
//
// BAYAN-CLOSEOUT-UI-GAPS: prop اختياري `edge` (افتراضي 'top'، بلا تغيير سلوك أي استدعاء قائم) —
// `BottomNav.tsx` يستهلك نفس منطق تتبّع scrollY/rAF عبر `edge="bottom"` (fixed bottom-0 بدل
// sticky top-0، اتجاه إخفاء translate-y-full بدل -translate-y-full) بدل إعادة بناء آلية منفصلة.

import { useEffect, useRef, useState } from 'react';

const TOP_THRESHOLD_PX = 8; // دون هذا الارتفاع من أعلى الصفحة، الشريط ظاهر دائماً — لا اختفاء وامض قرب القمة

interface ScrollHideBarProps {
  children: React.ReactNode;
  edge?: 'top' | 'bottom';
}

export function ScrollHideBar({ children, edge = 'top' }: ScrollHideBarProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY <= TOP_THRESHOLD_PX) {
          setHidden(false);
        } else if (currentY > lastScrollY.current) {
          setHidden(true);
        } else if (currentY < lastScrollY.current) {
          setHidden(false);
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const positionClass = edge === 'top' ? 'sticky top-0' : 'fixed inset-x-0 bottom-0';
  const hiddenTranslateClass = edge === 'top' ? '-translate-y-full' : 'translate-y-full';

  return (
    <div
      data-hidden={hidden}
      className={`${positionClass} z-20 transition-transform duration-300 ${hidden ? hiddenTranslateClass : 'translate-y-0'}`}
    >
      {children}
    </div>
  );
}
