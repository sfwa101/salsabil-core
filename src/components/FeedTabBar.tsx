'use client';
// src/components/FeedTabBar.tsx
// شريط تبويبات الخلاصة (اليوم 26، BAYAN-HOME-FEED-001) — حالة عميل بحتة تُقرأ/تُكتَب عبر رابط
// الصفحة (?tab=...) لا حالة React محلية معزولة، لتبقى قابلة للقراءة مباشرة من مكوّن خادم (اليوم 27
// يقرأ searchParams.tab لتمرير postType لـ bayanService.listFeed) بلا حاجة لأي مزامنة إضافية —
// نفس فلسفة "الحالة عبر الرابط/الكوكي لا مخزّن عميل عام" المتّبعة في كل صفحات المشروع حتى الآن.
//
// تحديث اليوم 28: لم يعد هذا المكوّن نفسه sticky — أصبح مُغلَّفاً داخل ScrollHideBar في page.tsx
// (مع FeedTopBar/StoryBar كوحدة واحدة تختفي/تظهر معاً بالتمرير)، فالتموضع اللاصق أصبح مسؤولية
// الغلاف الأب لا هذا المكوّن.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { POST_TYPES, POST_TYPE_LABELS_AR, type PostType } from '@/core/modules/bayan/types';

const ALL_TAB = 'all' as const;
type TabValue = typeof ALL_TAB | PostType;

const TABS: { value: TabValue; label: string }[] = [
  { value: ALL_TAB, label: 'الكل' },
  ...POST_TYPES.map((t) => ({ value: t, label: POST_TYPE_LABELS_AR[t] })),
];

export function FeedTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab: TabValue = (searchParams.get('tab') as TabValue | null) ?? ALL_TAB;

  function selectTab(value: TabValue) {
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
      {/* اليوم 31: مقياس العرض الموحَّد — يطابق FeedTopBar/Header/main عند md/xl (خلفية كاملة العرض،
          صف التبويبات نفسه مُمركَز). */}
      <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto md:max-w-4xl xl:max-w-6xl">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => selectTab(tab.value)}
            aria-current={activeTab === tab.value}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
