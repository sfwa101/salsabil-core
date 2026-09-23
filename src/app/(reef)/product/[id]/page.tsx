// src/app/(reef)/product/[id]/page.tsx
// صفحة المنتج الفردية — EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (المرحلة 2): غلاف بصري بحت
// فوق قدرات موجودة فعلياً بالكامل (catalogService.getProductById، neighborhood-identity-registry.ts،
// ProductOptions.tsx) — صفر قدرة بيانات جديدة، صفر تغيير منطق خدمة. الشاشة كانت عارية تماماً قبل هذه
// الدفعة (عنوان + وصف + ProductOptions بلا أي صورة أو هوية حي) — أول لمسة بصرية حقيقية لها.
//
// TASK-18: الفتات (breadcrumb) وشارة الهوية كانتا تعتمدان على categories.find(product.categoryId)
// (جدول categories القديم — null لكل الـ7,506 منتجاً المستورَدة TASK-17). الآن تعتمدان على
// product.districtId عبر catalogService.getDistrictBySlug غير المتاح هنا مباشرة (لا نملك السلاگ، بل
// المعرّف) — راجع getDistrictById الجديد أدناه (يُنفَّذ محلياً عبر getDistricts() + find، لا استعلام
// إضافي بمعرّف واحد — نفس نمط التحميل الكامل ثم الفلترة القائم أصلاً في هذا الملف). منتج بلا
// districtId (~1,979 منتجاً غير مصنَّف، راجع تقرير TASK-18) يعرض "كل الأحياء" بدل كسر الصفحة.
//
// ⚠️ لا معرض صور حقيقي (Gallery): Product.imageUrl حقل مفرد (types.ts) — لا مصفوفة صور في النموذج
// اليوم (product_images مذكورة في تعليق ProductCard.tsx كمفهوم غير مرتبط أصلاً). بناء Carousel/نقاط
// تنقّل فوق صورة واحدة فقط كان سيخترع واجهة بلا بيانات حقيقية تدعمها (docs/design/UX_RULES.md §5) —
// الهيرو أدناه يعرض الصورة الواحدة المتاحة بأكبر حجم ممكن بدل ذلك، جاهز للتوسعة لاحقاً إن أُضيف نموذج
// صور متعددة فعلياً (راجع نهاية تقرير المرحلة 2 لهذه الفجوة).

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ImageOff } from 'lucide-react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ProductOptions } from '@/components/ProductOptions';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import { getVisibleProductPageBlockIds } from '@/config/product-page-blocks-registry';
import { getCartSummaryIfExistsAction } from '@/app/(reef)/cart/actions';
import { RealCatalogShelfSDUI } from '@/app/(reef)/RealCatalogShelfSDUI';

const UPSELL_LIMIT = 6;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, districts] = await Promise.all([
    catalogService.getProductById(id),
    catalogService.getDistricts(),
  ]);

  if (!product || !product.isActive) {
    notFound();
  }

  const district = districts.find((d) => d.id === product.districtId) ?? null;
  const identity = district ? getNeighborhoodIdentity('reef', district.slug) : null;

  // بلوك 3 — رف Upsell («منتجات قد تعجبك»): يُبنى فقط إن كان مسجَّلاً ظاهراً في السجل (اليوم دائماً
  // true — البنية جاهزة لتعطيله من لوحة إدارة مستقبلية بلا لمس هذا الملف). يعيد استخدام إشارة
  // "الأكثر طلباً" الموجودة أصلاً (ordersService.getMostOrderedProductIds، نفس مصدر رف "غالباً ما
  // يُشترى معه" في السلة) بدل اختراع خوارزمية "منتجات ذات صلة" جديدة (AGENTS.md §2).
  //
  // VERTICAL-SLICE-4-PRODUCT-DETAIL-UPSELL (2026-09-22): يُعرَض الآن عبر RealCatalogShelfSDUI (نفس
  // مكوّن الشريحتين 1-2 حرفياً بلا تعديل، مُعاد استخدامه لا مُستنسَخاً — AGENTS.md §2).
  // getCartSummaryIfExistsAction لا getCartSummaryAction عمداً — قراءة فقط بلا كتابة كوكي
  // أثناء عرض RSC (نفس نمط [district]/[category]/page.tsx، راجع تعليق الدالة في cart/actions.ts).
  const showUpsell = getVisibleProductPageBlockIds(product, 'page').includes('upsellShelf');
  const [upsellProducts, upsellCartSummary] = await Promise.all([
    showUpsell
      ? ordersService
          .getMostOrderedProductIds([product.id], UPSELL_LIMIT)
          .then((ids) => (ids.length > 0 ? catalogService.getProductsByIds(ids) : []))
      : Promise.resolve([]),
    showUpsell ? getCartSummaryIfExistsAction() : Promise.resolve(null),
  ]);
  const upsellInitialQuantities: Record<string, number> = {};
  for (const line of upsellCartSummary?.lines ?? []) {
    upsellInitialQuantities[line.product.id] = line.item.quantity;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:max-w-4xl">
      <Link
        href={district ? `/${district.slug}` : '/categories'}
        className="mb-4 inline-block text-sm text-muted-foreground transition hover:text-primary"
      >
        → {district?.nameAr ?? 'كل الأحياء'}
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        {/* الهيرو — صورة واحدة (لا معرض حقيقي، راجع تعليق أعلى الملف) بشارة هوية الحي عائمة فوقها */}
        <div className="animate-sb-fade-scale-in relative aspect-square overflow-hidden rounded-3xl bg-muted shadow-[var(--sb-shadow-tile)] md:aspect-[4/5]">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff size={40} />
            </div>
          )}

          {district && (
            <span
              className="sb-glass absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground"
              style={identity ? { color: identity.accentColor } : undefined}
            >
              {district.nameAr}
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

          {/* بند 4 — هوية الحي تمتد الآن للحدود لا فقط لون النص/الزر (كانت تُطبَّق فقط داخل
              ProductOptions نفسها) — راجع docs/DECISIONS.md → ADR-024 لمصدر accentColor. */}
          <div
            className="rounded-3xl border border-border bg-card p-5 shadow-[var(--sb-shadow-tinted)]"
            style={identity ? { borderColor: `${identity.accentColor}55` } : undefined}
          >
            <ProductOptions product={product} accentColor={identity?.accentColor} />
          </div>
        </div>
      </div>

      {upsellProducts.length > 0 && (
        <div className="mt-8">
          <RealCatalogShelfSDUI
            title="منتجات قد تعجبك"
            products={upsellProducts}
            initialQuantities={upsellInitialQuantities}
          />
        </div>
      )}
    </main>
  );
}
