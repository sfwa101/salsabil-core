import Link from 'next/link';
import { getCartSummaryAction, updateCartItemAction, removeCartItemAction } from './actions';

export default async function CartPage() {
  const summary = await getCartSummaryAction();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-foreground">سلتي</h1>

      {summary.lines.length === 0 ? (
        <p className="text-muted-foreground">السلة فارغة.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {summary.lines.map(({ item, product, unitPrice, lineTotal }) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-medium text-card-foreground">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {unitPrice} جنيه × {item.quantity} = {lineTotal} جنيه
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form
                  action={async () => {
                    'use server';
                    await updateCartItemAction(item.id, item.quantity - 1);
                  }}
                >
                  <button type="submit" className="rounded-lg border border-border px-2 py-1 text-foreground">
                    −
                  </button>
                </form>
                <span className="text-foreground">{item.quantity}</span>
                <form
                  action={async () => {
                    'use server';
                    await updateCartItemAction(item.id, item.quantity + 1);
                  }}
                >
                  <button type="submit" className="rounded-lg border border-border px-2 py-1 text-foreground">
                    +
                  </button>
                </form>
                <form
                  action={async () => {
                    'use server';
                    await removeCartItemAction(item.id);
                  }}
                >
                  <button type="submit" className="text-sm text-destructive">
                    حذف
                  </button>
                </form>
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-muted p-4 text-center text-lg font-semibold text-foreground">
            الإجمالي: {summary.total} جنيه
          </div>
        </div>
      )}
    </main>
  );
}
