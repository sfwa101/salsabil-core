// src/app/(reef)/[district]/[category]/page.tsx
// صفحة قسم رئيسي داخل حي (TASK-18) — تعرض الأقسام الفرعية إن وُجدت (chips، نفس نمط subCategories
// القديم في [category]/page.tsx السابق) + شبكة كل منتجات القسم (catalog_category_id = هذا القسم،
// يشمل تلقائياً منتجات أي قسم فرعي تابع له — القسم الفرعي تفصيل إضافي اختياري لا مجموعة منفصلة).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CategoryProductGrid } from '@/components/CategoryProductGrid';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import { getCartSummaryIfExistsAction } from '@/app/(reef)/cart/actions';

export default async function CatalogCategoryPage({
  params,
}: {
  params: Promise<{ district: string; category: string }>;
}) {
  const { district: districtSlug, category: categorySlug } = await params;
  const district = await catalogService.getDistrictBySlug(districtSlug);
  if (!district) notFound();

  const category = await catalogService.getCategoryBySlugInDistrict(district.id, categorySlug);
  if (!category) notFound();

  const [subcategories, products, cartSummary] = await Promise.all([
    catalogService.getSubcategoriesForCategory(category.id),
    catalogService.listProductsByCatalogCategory(category.id),
    getCartSummaryIfExistsAction(),
  ]);
  const activeProducts = products.filter((p) => p.isActive);
  const identity = getNeighborhoodIdentity('reef', district.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl xl:max-w-6xl">
      <Link
        href={`/${district.slug}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-primary"
      >
        → {district.nameAr}
      </Link>

      <section
        className="animate-sb-fade-scale-in mb-6 rounded-3xl bg-primary p-6 text-primary-foreground shadow-[var(--sb-shadow-tinted)]"
        style={identity ? { backgroundColor: identity.accentColor, color: identity.accentForeground } : undefined}
      >
        <h1 className="text-2xl font-bold md:text-3xl">{category.nameAr}</h1>
        <p className="mt-1 text-sm opacity-90">
          {activeProducts.length > 0 ? `${activeProducts.length} منتج متاح الآن` : 'منتجات هذا القسم'}
        </p>
      </section>

      {subcategories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/${district.slug}/${category.slug}/${sub.slug}`}
              className="sb-press shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-[var(--sb-shadow-soft)] transition hover:border-primary"
            >
              {sub.nameAr}
            </Link>
          ))}
        </div>
      )}

      {activeProducts.length === 0 ? (
        <p className="text-muted-foreground">لا توجد منتجات في هذا القسم حالياً.</p>
      ) : (
        <CategoryProductGrid products={activeProducts} cartLines={cartSummary?.lines ?? []} />
      )}
    </main>
  );
}
