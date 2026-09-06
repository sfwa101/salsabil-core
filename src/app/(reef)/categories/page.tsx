// src/app/(reef)/categories/page.tsx
// وجهة تبويب "الأقسام" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS) — لا صفحة قائمة أقسام كاملة كانت
// موجودة (تصفّح الأحياء اليوم فقط عبر StoryBar الأفقي في الخلاصة، <CategoryCard>/القائمة الكاملة
// حُذفتا يوم 27). يعكس src/app/(reef)/[category]/page.tsx بنيوياً — يستهلك catalogService
// .listCategories() الموجودة أصلاً (StoryBar.tsx يستخدمها فعلاً)، لا قدرة جديدة.

import Link from 'next/link';
import { catalogService } from '@/core/modules/catalog/catalog.service';

export default async function CategoriesPage() {
  const categories = await catalogService.listCategories();
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">كل الأحياء</h1>
      {activeCategories.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أحياء بعد.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {activeCategories.map((category) => (
            <Link
              key={category.id}
              href={`/${category.slug}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition hover:border-primary hover:shadow-sm"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-muted text-lg font-semibold text-primary">
                {category.name.charAt(0)}
              </span>
              <span className="font-medium text-card-foreground">{category.name}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
