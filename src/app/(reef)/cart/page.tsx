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
import { HorizontalShelf } from '@/components/HorizontalShelf';
import { ProductCard } from '@/components/ProductCard';
import { CartStemView } from './CartStemView';
import { groupByTenant } from './cart-grouping';

const CROSS_SELL_LIMIT = 6;

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
  const cartProductIds = summary.lines.map((line) => line.product.id);

  // FIX-DD-010-CART-QUANTITY-UI-STALE: هاتان مستقلتان تماماً عن بعضهما (تجميع التاجر لا يعتمد على
  // رف "غالباً ما يُشترى معه" ولا العكس) — كانتا تُنتظَران بالتتابع، تضيفان رحلة شبكة كاملة زائدة
  // على كل تحميل/تحديث لصفحة السلة (~85-150ms إضافية مقيسة). Promise.all يدمجهما في رحلة واحدة.
  const [merchants, mostOrderedIds] = await Promise.all([
    tenantIds.length > 0 ? merchantService.getByIds(tenantIds) : Promise.resolve([]),
    ordersService.getMostOrderedProductIds(cartProductIds, CROSS_SELL_LIMIT),
  ]);
  const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

  const groups = groupByTenant(summary.lines, merchantNameById);

  // هذه تعتمد على mostOrderedIds فعلياً — تبقى متتابعة بعده، لا يمكن دمجها في Promise.all أعلاه
  const crossSellProducts = mostOrderedIds.length > 0 ? await catalogService.getProductsByIds(mostOrderedIds) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">سلتي</h1>

      {/* VERTICAL-SLICE-3-CART-INTEGRATION (2026-09-22) — VendorCartGroupStem/CartLineItemStem/
          CartBreakdownStem (بدل CartVendorGroup + قسم الملخّص المضمَّن القديمين، الملف الأخير لا
          يزال قائماً بلا استدعاء لغرض التراجع). بانر تعدد التجار/زر إتمام الطلب انتقلا داخل
          CartStemView أيضاً — كلاهما يعتمدان على groups، الذي أصبح تفاعلياً هناك بعد كل تعديل حقيقي
          (راجع تعليق CartStemView.tsx للتفصيل). */}
      <CartStemView
        initialGroups={groups}
        initialTotal={summary.total}
        merchantNames={Object.fromEntries(merchantNameById)}
      />

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
