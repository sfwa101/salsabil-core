// src/app/(reef)/order/[id]/page.tsx
// تتبّع طلب لعميل ضيف بلا حساب/تسجيل دخول — رابط دائم يحمل orderId، قابل للحفظ/المشاركة
// (اليوم 14). راجع ordersService.getOrderForCustomerView للتبرير الأمني الكامل (رابط حامل =
// آلية تفويض متعمَّدة، لا يعرض عنوان التوصيل أو بيانات العميل).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUS_LABELS_AR } from '@/core/modules/orders/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // صيغة غير صحيحة وطلب غير موجود يؤديان لنفس 404 — لا تمييز بينهما (نفس نمط ProductPage)
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) notFound();

  const view = await ordersService.getOrderForCustomerView(parsed.data);
  if (!view) notFound();

  const { order, items } = view;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">تتبّع الطلب</h1>
      <p className="mb-6 font-mono text-sm text-muted-foreground" dir="ltr">
        #{order.id.slice(0, 8)}
      </p>

      <div className="mb-6 rounded-2xl border border-primary bg-primary/5 p-4 text-center">
        <span className="text-lg font-semibold text-foreground">{ORDER_STATUS_LABELS_AR[order.status]}</span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {items.map(({ item, productName }) => (
          <div key={item.id} className="flex justify-between py-1 text-sm text-foreground">
            <span>
              {productName ?? 'منتج غير معروف'} × {item.quantity}
            </span>
            <span>{item.unitPriceSnapshot * item.quantity} جنيه</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
          <span>الإجمالي</span>
          <span>{order.total} جنيه</span>
        </div>
      </div>
    </main>
  );
}
