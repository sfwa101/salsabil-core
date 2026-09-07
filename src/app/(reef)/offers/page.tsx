// src/app/(reef)/offers/page.tsx
// صفحة "العروض" — RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS: غلاف صفحة مستقل فوق قدرة موجودة فعلياً
// بالكامل (postType: 'offer' في POST_TYPES، bayan/types.ts؛ نفس فلترة الخلاصة الرئيسية عبر ?tab=offer
// اليوم). لا قدرة بيانات جديدة — Server Component بنفس نمط src/app/(reef)/page.tsx، لكن بلا
// StoryBar/FeedTabBar (هذه الصفحة نفسها الفلتر). حالة فارغة صادقة إن لم يوجد منشور 'offer' منشور
// بعد (لا منشور من هذا النوع مزروع اليوم — راجع scripts/seed-daily-food-demo-content.ts).

import { Feed } from '@/components/Feed';
import { loadFeedPageAction } from '../feed-actions';

export default async function OffersPage() {
  const firstPage = await loadFeedPageAction({ postTypes: ['offer'], offset: 0 });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">العروض</h1>
      <Feed
        initialPosts={firstPage.posts}
        initialHasMore={firstPage.hasMore}
        initialProducts={firstPage.products}
        postTypes={['offer']}
      />
    </main>
  );
}
