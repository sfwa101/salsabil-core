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
import { CategoryBarNav } from '@/app/(reef)/CategoryBarNav';

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
        // VISUAL-PARITY-PASS (2026-09-22) — CategoryBarStem يحل محل الشبكة القديمة (نفس بيانات
        // catalogService.getCategoriesForDistrict الحقيقية، لا image حقيقية على CatalogCategory
        // اليوم فتُترَك undefined — الـStem يعرض حالته الاحتياطية المبنية أصلاً بدل قيمة وهمية).
        <CategoryBarNav
          basePath={`/${district.slug}`}
          items={categories.map((category) => ({ id: category.slug, name: category.nameAr }))}
        />
      )}
    </main>
  );
}
