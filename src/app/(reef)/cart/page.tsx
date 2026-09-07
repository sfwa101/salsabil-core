// src/app/(reef)/cart/page.tsx
// REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1: إعادة بناء بصرية/بنيوية فوق قدرات
// حقيقية موجودة فعلاً — تجميع حسب التاجر (product.tenantId → merchant.businessName)، بطاقات
// منتج غنية بالصور (CartLineItem.tsx)، ورف "غالباً ما يُشترى معه" (ordersService الجديدة
// getMostOrderedProductIds + catalogService.getProductsByIds القائمة، عبر ProductCard.tsx نفسه —
// لا مكوّن جديد للبطاقة الفردية). لا صفحة/جدول جديد — كل هذا فوق Schema قائم بالكامل.
//
// مُستبعَد صراحة (لا بنية بيانات له في هذا المشروع بعد — فجوة موثَّقة، لا اختراع):
// موعد استلام محدد، عربون/دفع جزئي، هدايا، شريط تقدم توصيل مجاني. المرجع (Cart.tsx) يبنيها فوق
// app_settings/addresses/wallet_balances/حقول حجز — لا شيء من هذا موجود عندنا.

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { getCartSummaryAction } from './actions';
import { merchantService } from '@/core/modules/merchant/merchant.service';
import { ordersService } from '@/core/modules/orders/orders.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { CartVendorGroup } from '@/components/CartVendorGroup';
import { HorizontalShelf } from '@/components/HorizontalShelf';
import { ProductCard } from '@/components/ProductCard';
import type { CartLineSummary } from '@/core/modules/cart/types';

const CROSS_SELL_LIMIT = 6;
const NO_TENANT_GROUP_KEY = '__no_tenant__';
const NO_TENANT_LABEL = 'المتجر';

interface VendorGroup {
  key: string;
  merchantName: string;
  lines: CartLineSummary[];
}

// تجميع بصري بحت حسب التاجر — لا يعني دعم checkout لطلب متعدد التجار (لا يزال يرفضه صراحة،
// ordersService.performCheckout، ADR-009). منتج بلا tenantId (نظرياً حسب types.ts، لا حالة حية
// اليوم) يُجمَّع تحت تسمية عامة بدل كسر الصفحة.
function groupByTenant(lines: CartLineSummary[], merchantNameById: Map<string, string>): VendorGroup[] {
  const groups = new Map<string, VendorGroup>();
  for (const line of lines) {
    const tenantId = line.product.tenantId;
    const key = tenantId ?? NO_TENANT_GROUP_KEY;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        merchantName: tenantId ? (merchantNameById.get(tenantId) ?? NO_TENANT_LABEL) : NO_TENANT_LABEL,
        lines: [],
      });
    }
    groups.get(key)!.lines.push(line);
  }
  return [...groups.values()];
}

export default async function CartPage() {
  const summary = await getCartSummaryAction();

  if (summary.lines.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center md:max-w-4xl xl:max-w-6xl">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
          <ShoppingBag size={28} />
        </span>
        <h1 className="text-xl font-semibold text-foreground">السلة فارغة</h1>
        <p className="text-muted-foreground">ابدأ التسوق من أقسامنا المختلفة</p>
        <Link
          href="/"
          className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90"
        >
          تصفّح الأقسام
        </Link>
      </main>
    );
  }

  const tenantIds = [...new Set(summary.lines.map((line) => line.product.tenantId).filter((id): id is string => id !== null))];
  const merchants = tenantIds.length > 0 ? await merchantService.getByIds(tenantIds) : [];
  const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

  const groups = groupByTenant(summary.lines, merchantNameById);
  const isMultiVendor = groups.length > 1;

  const cartProductIds = summary.lines.map((line) => line.product.id);
  const mostOrderedIds = await ordersService.getMostOrderedProductIds(cartProductIds, CROSS_SELL_LIMIT);
  const crossSellProducts = mostOrderedIds.length > 0 ? await catalogService.getProductsByIds(mostOrderedIds) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">سلتي</h1>

      {isMultiVendor && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-800 dark:text-amber-300">
          طلبك يحتوي على منتجات من {groups.length} تجار — طلبات من أكثر من تاجر واحد غير مدعومة بعد،
          يُرجى إكمال كل تاجر في طلب منفصل.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <CartVendorGroup key={group.key} merchantName={group.merchantName} lines={group.lines} />
        ))}

        <div className="rounded-xl bg-muted p-4 text-center text-lg font-semibold text-foreground">
          الإجمالي: {summary.total} جنيه
        </div>

        <Link
          href="/checkout"
          className="rounded-xl bg-primary px-4 py-3 text-center font-medium text-primary-foreground transition hover:opacity-90"
        >
          إتمام الطلب
        </Link>
      </div>

      {crossSellProducts.length > 0 && (
        <div className="mt-6">
          <HorizontalShelf title="غالباً ما يُشترى معه">
            {crossSellProducts.map((product) => (
              <div key={product.id} className="w-40 shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalShelf>
        </div>
      )}
    </main>
  );
}
