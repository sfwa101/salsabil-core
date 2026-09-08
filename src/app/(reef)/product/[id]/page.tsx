// src/app/(reef)/product/[id]/page.tsx
// صفحة المنتج الفردية — EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (المرحلة 2): غلاف بصري بحت
// فوق قدرات موجودة فعلياً بالكامل (catalogService.getProductById/listCategories،
// neighborhood-identity-registry.ts، ProductOptions.tsx) — صفر قدرة بيانات جديدة، صفر تغيير منطق
// خدمة. الشاشة كانت عارية تماماً قبل هذه الدفعة (عنوان + وصف + ProductOptions بلا أي صورة أو هوية
// حي) — أول لمسة بصرية حقيقية لها.
//
// ⚠️ لا معرض صور حقيقي (Gallery): Product.imageUrl حقل مفرد (types.ts) — لا مصفوفة صور في النموذج
// اليوم (product_images مذكورة في تعليق ProductCard.tsx كمفهوم غير مرتبط أصلاً). بناء Carousel/نقاط
// تنقّل فوق صورة واحدة فقط كان سيخترع واجهة بلا بيانات حقيقية تدعمها (docs/design/UX_RULES.md §5) —
// الهيرو أدناه يعرض الصورة الواحدة المتاحة بأكبر حجم ممكن بدل ذلك، جاهز للتوسعة لاحقاً إن أُضيف نموذج
// صور متعددة فعلياً (راجع نهاية تقرير المرحلة 2 لهذه الفجوة).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImageOff } from 'lucide-react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { ProductOptions } from '@/components/ProductOptions';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    catalogService.getProductById(id),
    catalogService.listCategories(),
  ]);

  if (!product || !product.isActive) {
    notFound();
  }

  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const identity = category ? getNeighborhoodIdentity('reef', category.slug) : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl">
      <Link
        href={category ? `/${category.slug}` : '/'}
        className="mb-4 inline-block text-sm text-muted-foreground transition hover:text-primary"
      >
        → {category?.name ?? 'كل الأحياء'}
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        {/* الهيرو — صورة واحدة (لا معرض حقيقي، راجع تعليق أعلى الملف) بشارة هوية الحي عائمة فوقها */}
        <div className="animate-sb-fade-scale-in relative aspect-square overflow-hidden rounded-3xl bg-muted shadow-[var(--sb-shadow-tile)] md:aspect-[4/5]">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- نفس نمط ProductCard.tsx/PostCard.tsx القائم (img خام، لا next/image)
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff size={40} />
            </div>
          )}

          {category && (
            <span
              className="sb-glass absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground"
              style={identity ? { color: identity.accentColor } : undefined}
            >
              {category.name}
            </span>
          )}
        </div>

        {/* معلومات المنتج */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">السعر لكل {product.unit}</p>
          </div>

          {product.description && (
            <p className="leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--sb-shadow-tinted)]">
            <ProductOptions product={product} accentColor={identity?.accentColor} />
          </div>
        </div>
      </div>
    </main>
  );
}
