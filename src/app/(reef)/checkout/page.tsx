import Link from 'next/link';
import { getCartSummaryAction } from '../cart/actions';
import { CheckoutForm } from '@/components/CheckoutForm';

export default async function CheckoutPage() {
  const summary = await getCartSummaryAction();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/cart" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → السلة
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-foreground">إتمام الطلب</h1>

      {summary.lines.length === 0 ? (
        <p className="text-muted-foreground">السلة فارغة — لا يمكن إتمام طلب.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            {summary.lines.map(({ item, product, lineTotal }) => (
              <div key={item.id} className="flex justify-between py-1 text-sm text-foreground">
                <span>
                  {product.name} × {item.quantity}
                </span>
                <span>{lineTotal} جنيه</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
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
