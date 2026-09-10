// src/app/(reef)/[category]/page.tsx
// صفحة حي واحد — RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS: إعادة تصميم بصري بحت فوق قدرات موجودة
// فعلياً بالكامل (catalogService.listProductsByCategory/listCategories) — لا قدرة بيانات جديدة.
//
// بانر الهوية: يستهلك src/config/neighborhood-identity-registry.ts — لون تمييز إن وُجد للحي، وإلا
// توكنز الثيم العامة (bg-primary) بلا أي تخصيص. أحياء فرعية: فلترة catalogService.listCategories()
// بـ parentId === category.id (نفس حقل Category.parentId الموجود أصلاً في types.ts — لا عمود جديد).
// لا حي فرعي مسجَّل في القاعدة اليوم (حي واحد فقط، بلا أبناء) — القسم يختفي تلقائياً حين تكون
// المصفوفة فارغة، جاهز فوراً متى أُضيف أول حي فرعي حقيقي بلا أي تعديل كود إضافي.
//
// PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 1) — شبكة المنتجات (CategoryProductGrid.tsx،
// 'use client') تفتح الآن Bottom Sheet عند الضغط على أي بطاقة، بدل التنقّل لصفحة `/product/[id]`
// الكاملة — يطابق سلوك الخلاصة الرئيسية (PostCard.tsx) تماماً. الصفحة نفسها (Server Component) بلا
// تغيير في الجلب — فقط تمرير `activeProducts`/`cartSummary.lines` كمصفوفات قابلة للتسلسل بدل بناء
// Map هنا (Map غير قابلة للتسلسل عبر حدود Server/Client).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CategoryProductGrid } from '@/components/CategoryProductGrid';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import { getCartSummaryIfExistsAction } from '@/app/(reef)/cart/actions';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await catalogService.getCategoryBySlug(slug);

  if (!category || !category.isActive) {
    notFound();
  }

  const [products, allCategories, cartSummary] = await Promise.all([
    catalogService.listProductsByCategory(category.id),
    catalogService.listCategories(),
    getCartSummaryIfExistsAction(),
  ]);
  const activeProducts = products.filter((p) => p.isActive);
  const subCategories = allCategories.filter((c) => c.isActive && c.parentId === category.id);
  const identity = getNeighborhoodIdentity('reef', category.slug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl xl:max-w-6xl">
      <Link href="/categories" className="mb-4 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>

      <section
        className="animate-sb-fade-scale-in mb-6 rounded-3xl bg-primary p-6 text-primary-foreground shadow-[var(--sb-shadow-tinted)]"
        style={identity ? { backgroundColor: identity.accentColor, color: identity.accentForeground } : undefined}
      >
        <h1 className="text-2xl font-bold md:text-3xl">{category.name}</h1>
        <p className="mt-1 text-sm opacity-90">
          {activeProducts.length > 0 ? `${activeProducts.length} منتج متاح الآن` : 'منتجات هذا الحي'}
        </p>
      </section>

      {subCategories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {subCategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/${sub.slug}`}
              className="sb-press shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-[var(--sb-shadow-soft)] transition hover:border-primary"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {activeProducts.length === 0 ? (
        <p className="text-muted-foreground">لا توجد منتجات في هذا الحي حالياً.</p>
      ) : (
        <CategoryProductGrid products={activeProducts} cartLines={cartSummary?.lines ?? []} />
      )}
    </main>
  );
}
