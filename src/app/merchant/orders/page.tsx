import { redirect } from 'next/navigation';
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

  const orders = await ordersService.getOrdersForTenant(session.tenantId);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">طلباتي</h1>
        <form action={logoutMerchantAction}>
          <button type="submit" className="text-sm text-muted-foreground underline">
            تسجيل الخروج
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground">لا توجد طلبات بعد</p>
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
