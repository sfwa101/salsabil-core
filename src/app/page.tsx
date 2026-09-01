import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CategoryCard } from '@/components/CategoryCard';

export default async function HomePage() {
  const categories = await catalogService.listCategories();
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">أحياء ريف المدينة</h1>
      {activeCategories.length === 0 ? (
        <p className="text-stone-500">لا توجد أقسام متاحة حالياً.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {activeCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </main>
  );
}
