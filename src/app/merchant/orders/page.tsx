import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_TRANSITIONS, ORDER_TRANSITION_ACTORS } from '@/core/modules/orders/types';
import { OrderRow } from '@/components/OrderRow';
import { logoutMerchantAction, transitionOrderAction } from './actions';

export default async function MerchantOrdersPage() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    redirect('/merchant/login');
  }
  // URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — يمنع الوصول لأي صفحة أخرى قبل تغيير كلمة المرور
  // المؤقتة إجبارياً (لا يمكن تجاوزه بالانتقال المباشر للرابط) — راجع specs/identity/PASSWORD_AUTH_SPEC.md §5
  if (session.mustChangePassword) {
    redirect('/merchant/change-password');
  }

  const orders = await ordersService.getOrdersForTenant(session.tenantId);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">طلباتي</h1>
        <form action={logoutMerchantAction}>
          <button
            type="submit"
            className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>

      <Link
        href="/merchant/import"
        className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        استيراد الكتالوج (Excel) ←
      </Link>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          لا توجد طلبات بعد
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const nextStatuses = ORDER_TRANSITIONS[order.status].filter((next) =>
              ORDER_TRANSITION_ACTORS[next].includes(session.role)
            );
            return (
              <OrderRow
                key={order.id}
                orderId={order.id}
                status={order.status}
                total={order.total}
                createdAt={order.createdAt}
                nextStatuses={nextStatuses}
                onTransition={transitionOrderAction}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
