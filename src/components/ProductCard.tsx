import Link from 'next/link';
import type { Product } from '@/core/modules/catalog/types';

// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 2: إضافة معاينة صورة — product.imageUrl
// كان موجوداً في types.ts/DB منذ البداية لكن بلا أي مستهلك واجهة فعلياً (product_images غير مرتبطة
// بـpost_media، مفهوم مختلف تماماً). بلا هذه الإضافة، الصور الاحترافية المستوردة في هذه الدفعة غير
// مرئية لأي مستخدم رغم وجودها في القاعدة — إضافة بصرية بحتة، مضمونة الرجوع (guarded بـimageUrl
// اختياري، منتج بلا صورة يبقى بنفس الشكل القديم بلا كسر).
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
    >
      {product.imageUrl && (
        <span className="-mx-5 -mt-5 mb-1 block aspect-square overflow-hidden rounded-t-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- نفس نمط PostCard.tsx القائم (img خام، لا next/image) */}
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        </span>
      )}
      <span className="text-base font-medium text-card-foreground">{product.name}</span>
      <span className="text-sm text-muted-foreground">
        يبدأ من <span className="font-semibold text-primary">{product.basePrice} جنيه</span>
      </span>
    </Link>
  );
}
