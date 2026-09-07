'use client';
// src/components/ScrollHideBar.tsx
// غلاف عام — يُثبِّت أطفاله أعلى الصفحة (sticky top) ويُخفيهم بالتمرير للأسفل (transform: translateY
// خارج الشاشة)، ثم يُظهرهم فوراً عند أي تمرير للأعلى — نفس نمط "الشريط المنسحب" الشائع في تطبيقات
// الجوّال (Instagram/Twitter). حالة الإخفاء تُحسَب من فرق scrollY بين نبضتين متتاليتين
// (requestAnimationFrame لتفادي إغراق الحدث)، لا مكتبة خارجية.
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1ج) — إعادة تصميم سلوك الإخفاء/الإظهار بالكامل:
//  - Header.tsx (سلة+عنوان+بحث) أصبح sticky+hide فعلياً الآن (`edge="top"`، publishHeightAs=
//    "--header-height") — كان "بلا تعديل" سابقاً بحجة عدم وجود فائدة تناسب حجم تلك المهمة؛ هذه
//    المهمة تحديداً تطلب تنسيق الارتفاع بين Header.tsx (layout.tsx) وFeedTabBar (page.tsx)، فبُني.
//  - StoryBar لم يعد داخل أي ScrollHideBar — عاد لتدفق المحتوى العادي (Scrollable)، ليس جزءاً من
//    مجموعة الإخفاء/الإظهار إطلاقاً (قرار مؤسس صريح).
//  - FeedTabBar وحده الآن، بوضع جديد `mode="reposition"`: **لا يختفي أبداً** (خلافاً لـHeader/
//    BottomNav) — فقط يتحرك بين `top:0` (حين يكون Header مخفياً بالتمرير للأسفل، فيلتصق أعلى الشاشة
//    تماماً) و`top: var(--header-height)` (حين يكون Header ظاهراً، فيرتد أسفله) — بنفس إشارة scrollY
//    المُستخدَمة لحساب حالة الإخفاء في نسخته الخاصة (متطابقة حتماً مع حالة Header لأنها نفس الدالة
//    على نفس scrollY، لا تنسيق صريح بين المكوّنين مطلوب). هذا يحقق حرفياً: "عند التمرير للأسفل يختفي
//    الهيدر فقط (FeedTabBar يبقى ظاهراً، يلتصق أعلى الشاشة)، وعند التمرير للأعلى يظهر الهيدر ويرتد
//    FeedTabBar تحته معاً".
//
// prop `edge` قائم من قبل — `BottomNav.tsx` يستهلك نفس منطق تتبّع scrollY/rAF عبر `edge="bottom"`
// (fixed bottom-0 بدل sticky top، اتجاه إخفاء translate-y-full بدل -translate-y-full).

import { useEffect, useRef, useState } from 'react';

const TOP_THRESHOLD_PX = 8; // دون هذا الارتفاع من أعلى الصفحة، الشريط ظاهر دائماً — لا اختفاء وامض قرب القمة

interface ScrollHideBarProps {
  children: React.ReactNode;
  edge?: 'top' | 'bottom';
  /** وضع 'hide' (افتراضي): يختفي بالكامل (translate) بالتمرير للأسفل. 'reposition' (edge='top' فقط):
   * لا يختفي أبداً — يتنقّل بين top:0 وtopOffset تبعاً لنفس إشارة الإخفاء المحسوبة داخلياً. */
  mode?: 'hide' | 'reposition';
  /** قيمة CSS لـ`top` عند edge='top' — الوضع الطبيعي (Header ظاهر) في mode='reposition'، أو نقطة
   * الالتصاق الثابتة في mode='hide' (افتراضي '0px' في كلتا الحالتين). */
  topOffset?: string;
  /** إن مُرِّر، يُنشَر ارتفاع هذا الشريط فعلياً (ResizeObserver) كمتغيّر CSS على `:root` بهذا الاسم —
   * يستهلكه شريط آخر (`topOffset="var(--header-height)"`) ليرتد تحته بدقة بلا قيمة مُقدَّرة يدوياً. */
  publishHeightAs?: string;
}

export function ScrollHideBar({ children, edge = 'top', mode = 'hide', topOffset = '0px', publishHeightAs }: ScrollHideBarProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!publishHeightAs || !barRef.current) return;
    const el = barRef.current;
    const publish = () => document.documentElement.style.setProperty(publishHeightAs, `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [publishHeightAs]);

  const positionClass = edge === 'top' ? 'sticky' : 'fixed inset-x-0 bottom-0';
  const repositioning = edge === 'top' && mode === 'reposition';
  // reposition: لا translate إطلاقاً، فقط top يتغيّر. hide (السلوك الأصلي): translate خارج الشاشة.
  const translateClass = repositioning
    ? 'translate-y-0'
    : hidden
      ? edge === 'top'
        ? '-translate-y-full'
        : 'translate-y-full'
      : 'translate-y-0';
  const style = edge === 'top' ? { top: repositioning ? (hidden ? '0px' : topOffset) : topOffset } : undefined;

  return (
    <div
      ref={barRef}
      data-hidden={hidden}
      className={`${positionClass} z-20 transition-transform duration-300 ${translateClass}`}
      style={style}
    >
      {children}
    </div>
  );
}
