// src/app/(reef)/[district]/[category]/[subcategory]/page.tsx
// صفحة قسم فرعي (TASK-18) — أضيق مستوى في شجرة التصنيف الثلاثية (حي → قسم → قسم فرعي). شبكة منتجات
// مفلترة بـ catalog_subcategory_id فقط (مجموعة فرعية من منتجات القسم الأب، لا مجموعة منفصلة).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CategoryProductGrid } from '@/components/CategoryProductGrid';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import { getCartSummaryIfExistsAction } from '@/app/(reef)/cart/actions';

export default async function CatalogSubcategoryPage({
  params,
}: {
  params: Promise<{ district: string; category: string; subcategory: string }>;
}) {
  const { district: districtSlug, category: categorySlug, subcategory: subcategorySlug } = await params;
  const district = await catalogService.getDistrictBySlug(districtSlug);
  if (!district) notFound();

  const category = await catalogService.getCategoryBySlugInDistrict(district.id, categorySlug);
  if (!category) notFound();

  const subcategory = await catalogService.getSubcategoryBySlugInCategory(category.id, subcategorySlug);
  if (!subcategory) notFound();

  const [products, cartSummary] = await Promise.all([
    catalogService.listProductsByCatalogSubcategory(subcategory.id),
    getCartSummaryIfExistsAction(),
  ]);
  const activeProducts = products.filter((p) => p.isActive);
  const identity = getNeighborhoodIdentity('reef', district.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl xl:max-w-6xl">
      <Link
        href={`/${district.slug}/${category.slug}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-primary"
      >
        → {category.nameAr}
      </Link>

      <section
        className="animate-sb-fade-scale-in mb-6 rounded-3xl bg-primary p-6 text-primary-foreground shadow-[var(--sb-shadow-tinted)]"
        style={identity ? { backgroundColor: identity.accentColor, color: identity.accentForeground } : undefined}
      >
        <h1 className="text-2xl font-bold md:text-3xl">{subcategory.nameAr}</h1>
        <p className="mt-1 text-sm opacity-90">
          {activeProducts.length > 0 ? `${activeProducts.length} منتج متاح الآن` : 'منتجات هذا القسم الفرعي'}
        </p>
      </section>

      {activeProducts.length === 0 ? (
        <p className="text-muted-foreground">لا توجد منتجات في هذا القسم الفرعي حالياً.</p>
      ) : (
        <CategoryProductGrid products={activeProducts} cartLines={cartSummary?.lines ?? []} />
      )}
    </main>
  );
}
