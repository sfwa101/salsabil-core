import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { CartActionButton } from '@/components/CartActionButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import { addToCartAction, updateCartItemAction } from '@/app/(reef)/cart/actions';

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
// وحيداً يستدعي addToCartAction بكمية 1. **مُستبعَد عمداً لمنتجات بخيارات حجم** (راجع تعليق
// QuantityStepper.tsx للسبب الكامل — .bind() على Server Action مُصدَّرة لا closure محلية، ProductCard
// يصل أحياناً عبر PostCard.tsx 'use client'). **مُستبعَد أيضاً لمنتجات بخيارات حجم**
// (product.options من نوع 'size') — إضافة سريعة بلا اختيار حجم تفشل فعلياً في
// CatalogService.validateSelection (يتطلب sizeId صراحة)؛ هذه المنتجات (مثال: "دجاجة كاملة طازجة")
// تبقى بلا تغيير — البطاقة كاملة رابط لصفحة المنتج كما كانت دائماً. الرابط والزر عنصران منفصلان (لا
// زر داخل <Link>، HTML غير صالح لعناصر تفاعلية متداخلة).
export function ProductCard({ product, cartLine }: { product: Product; cartLine?: CartLineSummary }) {
  const hasSizeOptions = product.options.some((o) => o.type === 'size');

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-[var(--sb-shadow-soft)]">
      <Link href={`/product/${product.id}`} className="flex flex-col gap-2">
        {product.imageUrl && (
          <span className="relative -mx-5 -mt-5 mb-1 block aspect-square overflow-hidden rounded-t-2xl bg-muted">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover"
            />
          </span>
        )}
        <span className="text-base font-medium text-card-foreground">{product.name}</span>
        <span className="text-sm text-muted-foreground">
          يبدأ من <span className="font-semibold text-primary">{product.basePrice} جنيه</span>
        </span>
      </Link>

      {!hasSizeOptions &&
        (cartLine ? (
          <QuantityStepper
            quantity={cartLine.item.quantity}
            onDecrement={updateCartItemAction.bind(null, cartLine.item.id, cartLine.item.quantity - 1)}
            onIncrement={updateCartItemAction.bind(null, cartLine.item.id, cartLine.item.quantity + 1)}
          />
        ) : (
          <form action={addToCartAction.bind(null, { productId: product.id, quantity: 1 }) as () => void}>
            <CartActionButton ariaLabel="أضف للسلة" variant="default" size="icon" className="w-full rounded-full shadow-sm">
              <Plus size={16} />
            </CartActionButton>
          </form>
        ))}
    </div>
  );
}
