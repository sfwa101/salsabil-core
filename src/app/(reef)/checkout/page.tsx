// src/app/(reef)/checkout/page.tsx — EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (المرحلة 2):
// غلاف بصري بحت فوق getCartSummaryAction/CheckoutForm الموجودين بالكامل — صفر لمس لمنطق Checkout
// المالي نفسه (قيد صارم من موجّه المهمة، المرحلة 3 توثيقية فقط لهذا الملف).
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { getCartSummaryAction } from '../cart/actions';
import { CheckoutForm } from '@/components/CheckoutForm';

export default async function CheckoutPage() {
  const summary = await getCartSummaryAction();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/cart" className="mb-4 inline-block text-sm text-muted-foreground transition hover:text-primary">
        → السلة
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-foreground">إتمام الطلب</h1>

      {summary.lines.length === 0 ? (
        <p className="text-muted-foreground">السلة فارغة — لا يمكن إتمام طلب.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--sb-shadow-soft)]">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingBag size={16} />
              ملخّص الطلب
            </div>
            {summary.lines.map(({ item, product, lineTotal }) => (
              <div key={item.id} className="flex justify-between py-1.5 text-sm text-foreground">
                <span>
                  {product.name} × {item.quantity}
                </span>
                <span>{lineTotal} جنيه</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-lg font-bold text-foreground">
              <span>الإجمالي</span>
              <span>{summary.total} جنيه</span>
            </div>
          </div>

          <CheckoutForm />
        </div>
      )}
    </main>
  );
}
