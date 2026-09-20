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

// تجميع بصري حسب التاجر — checkout يدعم فعلياً طلب متعدد التجار منذ ADR-033 (يُقسَّم تلقائياً حسب
// tenant_id إلى merchant_suborders منفصلة، لا رفض). منتج بلا tenantId (نظرياً حسب types.ts، لا حالة
// حية اليوم) يُجمَّع تحت تسمية عامة بدل كسر الصفحة.
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
  const isMultiVendor = groups.length > 1;

  // هذه تعتمد على mostOrderedIds فعلياً — تبقى متتابعة بعده، لا يمكن دمجها في Promise.all أعلاه
  const crossSellProducts = mostOrderedIds.length > 0 ? await catalogService.getProductsByIds(mostOrderedIds) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">سلتي</h1>

      {isMultiVendor && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">
          طلبك يحتوي على منتجات من {groups.length} تجار — سيُقسَّم طلبك تلقائياً حسب كل تاجر، وستصلك
          الأصناف على استلامات منفصلة، كل واحدة بحالتها الخاصة.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <CartVendorGroup key={group.key} merchantName={group.merchantName} lines={group.lines} />
        ))}

        {/* COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 8) — بطاقة ملخّص بدل صندوق
            مسطَّح واحد، يطابق قسم "Summary" في مرجع Lovable (Cart.tsx) بصرياً — بلا صفوف توصيل/
            خصم/إكرامية (لا حقول مقابلة في نظامنا، لا تُضاف صفوف بقيمة صفر لميزات غير موجودة). */}
        <section className="rounded-2xl bg-card p-4 shadow-[var(--sb-shadow-soft)] ring-1 ring-border/50">
          <div className="my-1 h-px bg-border" />
          <div className="flex items-baseline justify-between pt-2">
            <span className="text-base font-bold text-foreground">الإجمالي</span>
            <span className="text-2xl font-extrabold text-primary">
              {summary.total} <span className="text-sm font-medium text-muted-foreground">جنيه</span>
            </span>
          </div>
        </section>

        <Link
          href="/checkout"
          className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[var(--sb-shadow-pill)] transition hover:opacity-90"
        >
          <span>إتمام الطلب</span>
          <span className="rounded-xl bg-primary-foreground/15 px-3 py-1.5 text-sm">{summary.total} جنيه</span>
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
