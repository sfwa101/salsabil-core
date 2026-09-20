// src/app/merchant/dashboard/page.tsx
// §31 بند 6 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §4/§29 بند 5) — Dashboard أساسي أول مرة؛
// كانت `/merchant` مجرد redirect لـ`/merchant/orders` بلا أي ملخص. حساب بحت في طبقة العرض على
// نتيجة ordersService.getOrdersForTenant الموجودة أصلاً — لا استعلام تجميع SQL جديد (نفس مبرر
// findAllProducts: لا خطر أداء بحجم الطلبات الحالي، يُعاد تقييمه عند النمو الفعلي).

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUS_LABELS_AR } from '@/core/modules/orders/types';
import { logoutMerchantAction } from '../orders/actions';

const ACTIONABLE_STATUSES = ['pending', 'confirmed', 'preparing'] as const;

export default async function MerchantDashboardPage() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    redirect('/merchant/login');
  }
  if (session.mustChangePassword) {
    redirect('/merchant/change-password');
  }

  const orders = await ordersService.getOrdersForTenant(session.tenantId);

  const totalOrders = orders.length;
  const actionableOrders = orders.filter((o) => ACTIONABLE_STATUSES.includes(o.status as (typeof ACTIONABLE_STATUSES)[number])).length;
  // إجمالي تقريبي — كل الطلبات غير الملغاة (لا فرق بين "مُسلَّم فعلياً محصَّل" و"قيد المعالجة" اليوم،
  // لا حقل دفع منفصل في النموذج الحالي، COD فقط). يُعرَض صراحة كـ"تقريبي" لا رقماً محاسبياً نهائياً.
  const approximateRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">لوحتي</h1>
        <form action={logoutMerchantAction}>
          <button
            type="submit"
            className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">تحتاج إجراءً الآن</p>
          <p className="text-2xl font-bold text-primary">{actionableOrders}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">إجمالي المبيعات (تقريبي، غير الملغاة)</p>
          <p className="text-2xl font-bold text-foreground">{approximateRevenue} جنيه</p>
        </div>
      </div>

      {totalOrders > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">الطلبات حسب الحالة</p>
          <ul className="flex flex-col gap-1 text-sm text-foreground">
            {Object.entries(statusCounts).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{ORDER_STATUS_LABELS_AR[status as keyof typeof ORDER_STATUS_LABELS_AR]}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href="/merchant/orders"
          className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          طلباتي ←
        </Link>
        <Link
          href="/merchant/offers"
          className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          عروضي ←
        </Link>
      </div>
    </main>
  );
}
