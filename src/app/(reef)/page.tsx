import { Suspense } from 'react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CategoryCard } from '@/components/CategoryCard';
import { FeedTopBar } from '@/components/FeedTopBar';
import { StoryBar } from '@/components/StoryBar';
import { FeedTabBar } from '@/components/FeedTabBar';

export default async function HomePage() {
  const categories = await catalogService.listCategories();
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <>
      {/* اليوم 26 (BAYAN-HOME-FEED-001) — طبقة بصرية غالباً ثابتة، أعلى المحتوى القائم بلا لمسه.
          الخلاصة الفعلية (اليوم 27) تستبدل قائمة CategoryCard أدناه، لا هذه الطبقة. */}
      <FeedTopBar />
      <div className="border-b border-border bg-card px-4 py-3">
        <StoryBar categories={activeCategories} />
      </div>
      <Suspense fallback={null}>
        <FeedTabBar />
      </Suspense>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">أحياء ريف المدينة</h1>
        {activeCategories.length === 0 ? (
          <p className="text-muted-foreground">لا توجد أقسام متاحة حالياً.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {activeCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
