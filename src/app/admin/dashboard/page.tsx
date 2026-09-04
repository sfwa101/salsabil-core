import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { adminService } from '@/core/modules/admin/admin.service';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUS_LABELS_AR, ORDER_TRANSITIONS, ORDER_TRANSITION_ACTORS } from '@/core/modules/orders/types';
import { AdminMerchantRow } from '@/components/AdminMerchantRow';
import { OrderRow } from '@/components/OrderRow';
import { logoutAdminAction, transitionOrderAdminAction } from './actions';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const [merchants, orders, history] = await Promise.all([
    adminService.listMerchants(),
    ordersService.getAllOrders(),
    ordersService.getRecentStatusHistory(50),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">لوحة الإدارة</h1>
        <form action={logoutAdminAction}>
          <button type="submit" className="text-sm text-muted-foreground underline">
            تسجيل الخروج
          </button>
        </form>
      </div>

      <Link
        href="/admin/posts"
        className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        إدارة منشورات بيان ←
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">التجار ({merchants.length})</h2>
        {merchants.length === 0 ? (
          <p className="text-center text-muted-foreground">لا يوجد تجار بعد</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {merchants.map((merchant) => (
              <AdminMerchantRow
                key={merchant.id}
                merchantId={merchant.id}
                businessName={merchant.businessName}
                phone={merchant.phone}
                isActive={merchant.isActive}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">كل الطلبات ({orders.length})</h2>
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
                  onTransition={transitionOrderAdminAction}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">سجل التدقيق (آخر {history.length})</h2>
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد حركات مسجَّلة بعد</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="font-mono text-muted-foreground">#{entry.orderId.slice(0, 8)}</span>
                <span className="text-foreground">
                  {entry.fromStatus ? ORDER_STATUS_LABELS_AR[entry.fromStatus] : '—'} ← {ORDER_STATUS_LABELS_AR[entry.toStatus]}
                </span>
                <span className="text-muted-foreground">{entry.actorRole}</span>
                <span className="text-muted-foreground" dir="ltr">
                  {new Date(entry.createdAt).toLocaleString('ar-EG')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
