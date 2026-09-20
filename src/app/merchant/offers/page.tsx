// src/app/merchant/offers/page.tsx
// §31 بند 5 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — لوحة "عروضي": التاجر يبحث في Product
// Library، يضيف منتجاً موجوداً لعروضه، ويعدّل كمية/سعر توريد عرض قائم فردياً — بديل تفاعلي حقيقي
// أول مرة، لا استبدال Excel كامل فقط (import/page.tsx يبقى بلا تغيير، مساراً موازياً).

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { inventoryService } from '@/core/modules/inventory/inventory.service';
import { MerchantOfferSearch } from '@/components/merchant/MerchantOfferSearch';
import { MerchantOfferRow } from '@/components/merchant/MerchantOfferRow';

export default async function MerchantOffersPage() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    redirect('/merchant/login');
  }
  if (session.mustChangePassword) {
    redirect('/merchant/change-password');
  }

  const products = await catalogService.listMerchantOffers(session.tenantId);
  const inventoryRecords = await inventoryService.getStockForProducts(products.map((p) => p.id));
  const inventoryByProductId = new Map(inventoryRecords.map((r) => [r.productId, r]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">عروضي</h1>
        <Link href="/merchant/orders" className="text-sm text-muted-foreground transition hover:text-primary">
          → طلباتي
        </Link>
      </div>

      <MerchantOfferSearch />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">منتجاتي الحالية ({products.length})</h2>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا توجد منتجات في عروضك بعد — ابحث أعلاه لإضافة أول منتج
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.map((product) => (
              <MerchantOfferRow
                key={product.id}
                productId={product.id}
                name={product.name}
                unit={product.unit}
                salePrice={product.basePrice}
                quantityAvailable={inventoryByProductId.get(product.id)?.quantityAvailable ?? 0}
                costPrice={inventoryByProductId.get(product.id)?.costPrice ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
