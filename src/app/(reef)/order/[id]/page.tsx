// src/app/(reef)/order/[id]/page.tsx
// تتبّع طلب لعميل ضيف بلا حساب/تسجيل دخول — رابط دائم يحمل orderId، قابل للحفظ/المشاركة
// (اليوم 14). راجع ordersService.getOrderForCustomerView للتبرير الأمني الكامل (رابط حامل =
// آلية تفويض متعمَّدة، لا يعرض عنوان التوصيل أو بيانات العميل).
//
// EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (المرحلة 2): غلاف بصري بحت فوق نفس البيانات —
// نقطة نابضة (animation-registry.ts → pulseSoft) على الحالات غير النهائية فقط (تعكس آلة حالة حقيقية
// موجودة أصلاً في orders/types.ts، لا حالة مُخترَعة)، أيقونة ثابتة على النهائيتين (delivered/cancelled).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUS_LABELS_AR, type OrderStatus } from '@/core/modules/orders/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

const FINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // صيغة غير صحيحة وطلب غير موجود يؤديان لنفس 404 — لا تمييز بينهما (نفس نمط ProductPage)
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) notFound();

  const view = await ordersService.getOrderForCustomerView(parsed.data);
  if (!view) notFound();

  const { order, items } = view;
  const isFinal = FINAL_STATUSES.includes(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground transition hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-foreground">تتبّع الطلب</h1>
      <p className="mb-6 font-mono text-sm text-muted-foreground" dir="ltr">
        #{order.id.slice(0, 8)}
      </p>

      <div
        className={`mb-6 flex items-center justify-center gap-2 rounded-3xl border p-5 text-center shadow-[var(--sb-shadow-soft)] ${
          isCancelled ? 'border-destructive/30 bg-destructive/5' : 'border-primary/30 bg-primary/5'
        }`}
      >
        {isFinal ? (
          isCancelled ? (
            <X size={20} className="text-destructive" />
          ) : (
            <Check size={20} className="text-primary" />
          )
        ) : (
          <span className="animate-sb-pulse-soft h-2.5 w-2.5 rounded-full bg-primary" />
        )}
        <span className="text-lg font-bold text-foreground">{ORDER_STATUS_LABELS_AR[order.status]}</span>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--sb-shadow-soft)]">
        {items.map(({ item, productName }) => (
          <div key={item.id} className="flex justify-between py-1.5 text-sm text-foreground">
            <span>
              {productName ?? 'منتج غير معروف'} × {item.quantity}
            </span>
            <span>{item.unitPriceSnapshot * item.quantity} جنيه</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-3 text-lg font-bold text-foreground">
          <span>الإجمالي</span>
          <span>{order.total} جنيه</span>
        </div>
      </div>
    </main>
  );
}
