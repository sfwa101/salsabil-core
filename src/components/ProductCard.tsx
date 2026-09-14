'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ImageOff, Plus } from 'lucide-react';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';

// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 2: إضافة معاينة صورة — product.imageUrl
// كان موجوداً في types.ts/DB منذ البداية لكن بلا أي مستهلك واجهة فعلياً (product_images غير مرتبطة
// بـpost_media، مفهوم مختلف تماماً). بلا هذه الإضافة، الصور الاحترافية المستوردة في هذه الدفعة غير
// مرئية لأي مستخدم رغم وجودها في القاعدة — إضافة بصرية بحتة، مضمونة الرجوع (guarded بـimageUrl
// اختياري، منتج بلا صورة يبقى بنفس الشكل القديم بلا كسر).
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — زر +/- الكمية مباشرة على
// البطاقة (صفحة الحي)، بلا حاجة لفتح صفحة المنتج أولاً. `cartLine` اختياري (من [category]/page.tsx،
// عبر getCartSummaryIfExistsAction — قراءة فقط، آمنة أثناء عرض RSC، لا استعلام جديد): وجوده يعني
// "هذا المنتج في السلة فعلاً"، فتُعرَض QuantityStepper (نفس مكوّن السلة حرفياً)؛ غيابه يعرض زر "+"
// وحيداً. **مُستبعَد عمداً لمنتجات بخيارات حجم** (product.options من نوع 'size') — إضافة سريعة بلا
// اختيار حجم تفشل فعلياً في CatalogService.validateSelection (يتطلب sizeId صراحة)؛ هذه المنتجات
// (مثال: "دجاجة كاملة طازجة") تبقى بلا تغيير — البطاقة كاملة رابط لصفحة المنتج كما كانت دائماً.
// الرابط والزر عنصران منفصلان (لا زر داخل <Link>، HTML غير صالح لعناصر تفاعلية متداخلة).
//
// IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS — 'use client' أصبح صريحاً هنا (كان ضمنياً فقط عبر
// استيراد PostCard.tsx 'use client' لهذا الملف — تصنيف Next.js على مستوى الملف لا موضع الاستخدام،
// فكان هذا الملف يُبنى كعميل فعلياً بالفعل في كل استخداماته، فقط بلا توجيه صريح). useOptimisticCartLine
// يدير كلا الحالتين (منتج غير مُضاف بعد / مُضاف فعلاً بكمية N) عبر useOptimistic حقيقي — الضغط على
// "+" أو أي زر في QuantityStepper يُحدِّث الرقم فوراً، وaddToCartAction/updateCartItemAction (بلا أي
// تعديل على منطقهما) يُرسَلان في الخلفية. فشل نادر (نفاد مخزون) يُعيد الحالة تلقائياً + توست بالسبب.
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 2) — `onOpenSheet` اختياري جديد: عند
// تمريره (رفوف بيان — منتجات المنشور، Upsell) تفتح البطاقة Bottom Sheet المنتج بدل التنقل لصفحة
// كاملة (يطابق "الضغط على منتج مفرد من رف يفتح ProductSheetContent" من موجّه المهمة). بلا تمريره
// (شبكة صفحة الحي، سلة "غالباً ما يُشترى معه") السلوك القديم كما هو حرفياً — صفر تغيير لأي مستهلك
// حالي، إضافة خالصة (Additive).
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 7) — إعادة بناء بصرية لمطابقة
// D:\temp\reefam-lovable-reference\src\components\ProductCard.tsx حرفياً: صورة full-bleed بلا هامش
// (كانت داخل padding البطاقة بحيلة margin سالب)، محتوى بـp-3 (كان p-5)، عنوان أصغر وأثقل +
// leading-tight + line-clamp-2 (منتجات بأسماء طويلة لا تكسر ارتفاع البطاقة)، سطر وحدة القياس الآن
// ظاهر (product.unit — كان موجوداً في البيانات بلا أي مستهلك واجهة من قبل)، صف السعر/الزر أسفل
// البطاقة (mt-auto) بدل تتابع عمودي بسيط، سعر أكبر وأثقل (text-lg font-extrabold). زر الإضافة الآن
// دائرة واحدة h-9 w-9 (كان زراً بعرض كامل) + QuantityStepper variant="pill" (كبسولة واحدة، يطابق
// شكل +/- في هذا المرجع تحديداً — مرجع مختلف عن ButcherSheet.tsx المستخدَم لتصميم CartLineItem.tsx،
// راجع تعليق QuantityStepper.tsx). "يبدأ من" يبقى فقط لمنتجات بخيارات حجم فعلية (بياناتنا تدعم سعراً
// متغيراً، بيانات المرجع لا تدعمه — لا حذف معلومة حقيقية لمطابقة مرجع أبسط بياناتياً). بادجات
// الخصم/التفضيل/الأكثر مبيعاً في المرجع مُستبعَدة عمداً — لا حقول مقابلة في Product (badge/oldPrice/
// isFavorite) اليوم، إضافتها Schema/Business Rule جديد يحتاج قراراً مؤسس منفصلاً (AGENTS.md §17)، لا
// قراراً بصرياً منفرداً ضمن هذه الدفعة.
export function ProductCard({
  product,
  cartLine,
  onOpenSheet,
}: {
  product: Product;
  cartLine?: CartLineSummary;
  onOpenSheet?: (productId: string) => void;
}) {
  const hasSizeOptions = product.options.some((o) => o.type === 'size');
  const { showToast, toastNode } = useCartToast();
  const { quantity, setQuantity } = useOptimisticCartLine(
    product.id,
    cartLine?.unitPrice ?? product.basePrice,
    cartLine ? { itemId: cartLine.item.id, quantity: cartLine.item.quantity } : undefined,
    showToast
  );

  // COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 7) — الحاوية دائماً aspect-square الآن
  // (بدل تخطّي منطقة الصورة كلياً لمنتج بلا صورة كما كان سابقاً) لبقاء ارتفاع كل بطاقات الشبكة
  // متطابقاً بصرياً — نفس أيقونة ImageOff المستخدَمة أصلاً في product/[id]/page.tsx للحالة نفسها.
  const image = product.imageUrl ? (
    <Image
      src={product.imageUrl}
      alt={product.name}
      fill
      loading="lazy"
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 20vw"
      className="object-contain"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <ImageOff size={28} />
    </div>
  );

  const titleBlock = (
    <>
      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-card-foreground">{product.name}</h3>
      <p className="text-xs text-muted-foreground">{product.unit}</p>
    </>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--sb-shadow-soft)] transition hover:border-primary">
      {onOpenSheet ? (
        <button
          type="button"
          onClick={() => onOpenSheet(product.id)}
          className="relative block aspect-square w-full overflow-hidden bg-muted text-right"
          aria-label={product.name}
        >
          {image}
        </button>
      ) : (
        <Link href={`/product/${product.id}`} className="relative block aspect-square w-full overflow-hidden bg-muted">
          {image}
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-1 p-3">
        {onOpenSheet ? (
          <button type="button" onClick={() => onOpenSheet(product.id)} className="block text-right">
            {titleBlock}
          </button>
        ) : (
          <Link href={`/product/${product.id}`} className="block">
            {titleBlock}
          </Link>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-lg font-extrabold leading-none text-foreground">
            {hasSizeOptions && <span className="text-xs font-normal text-muted-foreground">يبدأ من </span>}
            {product.basePrice}
            <span className="text-xs font-medium text-muted-foreground"> جنيه</span>
          </span>

          {!hasSizeOptions &&
            (quantity > 0 ? (
              <QuantityStepper
                variant="pill"
                quantity={quantity}
                onDecrement={() => setQuantity(quantity - 1)}
                onIncrement={() => setQuantity(quantity + 1)}
              />
            ) : (
              <Button
                type="button"
                onClick={() => setQuantity(1)}
                aria-label="أضف للسلة"
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full shadow-[var(--sb-shadow-pill)]"
              >
                <Plus size={16} strokeWidth={3} />
              </Button>
            ))}
        </div>
      </div>
      {toastNode}
    </div>
  );
}
