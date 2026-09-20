import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { ordersService } from '@/core/modules/orders/orders.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { khalilService } from '@/core/kernel/khalil/service';
import { ORDER_TRANSITIONS, ORDER_TRANSITION_ACTORS } from '@/core/modules/orders/types';
import { OrderRow } from '@/components/OrderRow';
import { MerchantOrderDetails } from '@/components/merchant/MerchantOrderDetails';
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

  // §31 بند 6 — تفاصيل كل طلب (عميل/عنوان/منتجات)، لا نصيب حالة/إجمالي فقط كما كانت الصفحة سابقاً.
  // getOrderWithItems يفرض assertActorCanAccessOrder أصلاً (نفس عزل المستأجرين المستخدَم للانتقال) —
  // لا كشف بيانات طلب لا يخص هذا التاجر حتى لو حاول أحد التلاعب بمعرّف الطلب.
  const orderDetailsById = new Map(
    await Promise.all(
      orders.map(async (order) => {
        const [withItems, customer] = await Promise.all([
          ordersService.getOrderWithItems({ role: session.role, tenantId: session.tenantId! }, order.id),
          khalilService.findUserById(order.userId),
        ]);
        const productIds = withItems?.items.map((i) => i.productId) ?? [];
        const products = productIds.length > 0 ? await catalogService.getProductsByIds(productIds) : [];
        const productNameById = new Map(products.map((p) => [p.id, p.name]));
        const items = (withItems?.items ?? []).map((item) => ({
          productName: productNameById.get(item.productId) ?? 'منتج غير معروف',
          quantity: item.quantity,
          unitPriceSnapshot: item.unitPriceSnapshot,
        }));
        return [order.id, { customerName: customer?.fullName ?? null, customerPhone: customer?.phone ?? null, items }] as const;
      })
    )
  );

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

      <div className="flex gap-2">
        <Link
          href="/merchant/offers"
          className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          عروضي ←
        </Link>
        <Link
          href="/merchant/import"
          className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          استيراد الكتالوج (Excel) ←
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          لا توجد طلبات بعد
        </p>
      ) : (
        // div لا ul — OrderRow.tsx (مشترك مع لوحة الإدارة) يُصدِر جذره الخاص كـ<li> بالفعل؛ تغليفه
        // هنا بـ<li> آخر داخل <ul> كان سينتج li متداخلاً داخل li (HTML غير صالح).
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const nextStatuses = ORDER_TRANSITIONS[order.status].filter((next) =>
              ORDER_TRANSITION_ACTORS[next].includes(session.role)
            );
            const details = orderDetailsById.get(order.id);
            return (
              <div key={order.id} className="flex flex-col gap-2">
                {details && (
                  <MerchantOrderDetails
                    customerName={details.customerName}
                    customerPhone={details.customerPhone}
                    addressLine1={order.deliveryAddress.line1}
                    addressCity={order.deliveryAddress.city}
                    addressNotes={order.deliveryAddress.notes}
                    items={details.items}
                  />
                )}
                <OrderRow
                  orderId={order.id}
                  status={order.status}
                  total={order.total}
                  createdAt={order.createdAt}
                  nextStatuses={nextStatuses}
                  onTransition={transitionOrderAction}
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
