'use client';
// src/components/FeedTabBar.tsx
// شريط تبويبات الخلاصة — حالة عميل بحتة تُقرأ/تُكتَب عبر رابط الصفحة (?tab=...) لا حالة React محلية
// معزولة، لتبقى قابلة للقراءة مباشرة من مكوّن خادم (page.tsx يقرأ searchParams.tab لتحديد الفلتر)
// بلا حاجة لأي مزامنة إضافية.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 3/5): التبويبات الأربعة (الكل|ريلز|
// منتجات|منشورات) ومنطق التفعيل/التعطيل يُقرآن الآن من src/config/content-type-registry.ts — لا
// Hardcode هنا. القيمة المخزَّنة في ?tab= أصبحت FeedTabKey (all/reel/products/posts) لا PostType خام
// (تبويب "منتجات" يمثّل نوعين معاً: product_highlight + offer). مبني فوق Button (shadcn/ui، ADR-025)
// بدل <button> خام — أول استهلاك حقيقي لمكوّن shadcn في هذه الشجرة.
//
// تحديث: لم يعد هذا المكوّن نفسه sticky — مُغلَّف داخل ScrollHideBar في page.tsx (مع StoryBar كوحدة
// واحدة تختفي/تظهر معاً بالتمرير)، فالتموضع اللاصق مسؤولية الغلاف الأب لا هذا المكوّن.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FEED_TAB_LABELS_AR, getVisibleFeedTabs, type FeedTabKey } from '@/config/content-type-registry';

const ALL_TAB: FeedTabKey = 'all';

export function FeedTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as FeedTabKey | null) ?? ALL_TAB;
  const visibleTabs = getVisibleFeedTabs();

  function selectTab(value: FeedTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_TAB) {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      {/* مقياس العرض الموحَّد — يطابق Header/main عند md/xl (خلفية كاملة العرض، صف التبويبات نفسه
          مُمركَز). */}
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto md:max-w-4xl xl:max-w-6xl">
        {visibleTabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            aria-current={activeTab === tab}
            variant={activeTab === tab ? 'default' : 'secondary'}
            className="shrink-0 rounded-full"
          >
            {FEED_TAB_LABELS_AR[tab]}
          </Button>
        ))}
      </div>
    </div>
  );
}
