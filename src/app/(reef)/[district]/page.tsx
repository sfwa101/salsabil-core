// src/app/(reef)/[district]/page.tsx
// صفحة حي واحد (TASK-18) — يستبدل src/app/(reef)/[category]/page.tsx القديم (كان يقرأ من جدول
// categories القديم عبر catalogService.getCategoryBySlug/listProductsByCategory — 6 صفوف تجريبية،
// 50 منتجاً فقط). الحي الآن مصدره catalog_districts (19 حياً حقيقياً مستورَداً في TASK-17)، وهذه
// الصفحة تعرض أقسامه الرئيسية (catalog_categories) بدل منتجاته مباشرة — التصفح ثلاثي المستوى
// (حي → قسم → منتج، راجع docs/audits/2026-09-19-launch-readiness-report.md لقرار التصميم الكامل).
// كل قسم يربط بـ /[district]/[category] (صفحة جديدة تعرض الأقسام الفرعية إن وُجدت + منتجات القسم).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';

export default async function DistrictPage({ params }: { params: Promise<{ district: string }> }) {
  const { district: slug } = await params;
  const district = await catalogService.getDistrictBySlug(slug);

  if (!district) {
    notFound();
  }

  const categories = await catalogService.getCategoriesForDistrict(district.id);
  const identity = getNeighborhoodIdentity('reef', district.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl xl:max-w-6xl">
      <Link href="/categories" className="mb-4 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>

      <section
        className="animate-sb-fade-scale-in mb-6 rounded-3xl bg-primary p-6 text-primary-foreground shadow-[var(--sb-shadow-tinted)]"
        style={identity ? { backgroundColor: identity.accentColor, color: identity.accentForeground } : undefined}
      >
        <h1 className="text-2xl font-bold md:text-3xl">{district.nameAr}</h1>
        <p className="mt-1 text-sm opacity-90">
          {categories.length > 0 ? `${categories.length} قسم في هذا الحي` : 'لا توجد أقسام بعد'}
        </p>
      </section>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أقسام في هذا الحي حالياً.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${district.slug}/${category.slug}`}
              className="sb-press flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition hover:border-primary hover:shadow-[var(--sb-shadow-soft)]"
            >
              <span
                className="animate-sb-scale-pop flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-muted text-lg font-semibold text-primary"
                style={identity ? { borderColor: identity.accentColor, color: identity.accentColor } : undefined}
              >
                {category.nameAr.charAt(0)}
              </span>
              <span className="font-medium text-card-foreground">{category.nameAr}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
