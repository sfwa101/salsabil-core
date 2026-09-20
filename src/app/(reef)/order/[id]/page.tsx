// src/app/(reef)/order/[id]/page.tsx
// تتبّع طلب لعميل ضيف بلا حساب/تسجيل دخول — رابط دائم يحمل orderId، قابل للحفظ/المشاركة
// (اليوم 14). راجع ordersService.getOrderForCustomerView للتبرير الأمني الكامل (رابط حامل =
// آلية تفويض متعمَّدة، لا يعرض عنوان التوصيل أو بيانات العميل).
//
// EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (المرحلة 2): غلاف بصري بحت فوق نفس البيانات —
// نقطة نابضة (animation-registry.ts → pulseSoft) على الحالات غير النهائية فقط (تعكس آلة حالة حقيقية
// موجودة أصلاً في orders/types.ts، لا حالة مُخترَعة)، أيقونة ثابتة على النهائيتين (delivered/cancelled).
//
// §31 بند 2 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §17) — كانت هذه الصفحة تعرض نصيب تاجر واحد
// فقط حتى لطلب حقيقي متعدد التجار (فجوة موثَّقة صراحة في ADR-033)، فيظن العميل أن إجمالي تاجر واحد
// هو كل ما يدين به. الآن تعرض كل merchant_suborders معاً، كل تاجر ببطاقته الخاصة، بإجمالي كلي حقيقي.

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

  const { suborders, grandTotal } = view;
  const isMultiMerchant = suborders.length > 1;
  // حالة "الطلب" المعروضة أعلى الصفحة: لو كان متعدد التجار، نعرض أقدم حالة غير نهائية (أي تاجر لم
  // يُنهِ بعد يعني الطلب ككل "قيد المعالجة" منطقياً)، أو delivered فقط لو أنهى الجميع، أو cancelled
  // فقط لو أُلغي الجميع — لا نختار عشوائياً أول suborder كما لو كان يمثّل الكل.
  const allDelivered = suborders.every((s) => s.order.status === 'delivered');
  const allCancelled = suborders.every((s) => s.order.status === 'cancelled');
  const overallStatus: OrderStatus = allDelivered ? 'delivered' : allCancelled ? 'cancelled' : (suborders.find((s) => !FINAL_STATUSES.includes(s.order.status))?.order.status ?? suborders[0].order.status);
  const isFinal = FINAL_STATUSES.includes(overallStatus);
  const isCancelled = overallStatus === 'cancelled';

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground transition hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-foreground">تتبّع الطلب</h1>
      <p className="mb-6 font-mono text-sm text-muted-foreground" dir="ltr">
        #{suborders[0].order.id.slice(0, 8)}
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
        <span className="text-lg font-bold text-foreground">{ORDER_STATUS_LABELS_AR[overallStatus]}</span>
      </div>

      {isMultiMerchant && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">
          طلبك من {suborders.length} تجار مختلفين — سيصلك كل جزء بشكل مستقل، وحالة كل جزء مبيَّنة أدناه.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {suborders.map(({ order, merchantName, items }) => (
          <div key={order.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--sb-shadow-soft)]">
            {isMultiMerchant && (
              <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm font-bold text-foreground">{merchantName ?? 'متجر'}</span>
                <span className="text-xs font-medium text-muted-foreground">{ORDER_STATUS_LABELS_AR[order.status]}</span>
              </div>
            )}
            {items.map(({ item, productName }) => (
              <div key={item.id} className="flex justify-between py-1.5 text-sm text-foreground">
                <span>
                  {productName ?? 'منتج غير معروف'} × {item.quantity}
                </span>
                <span>{item.unitPriceSnapshot * item.quantity} جنيه</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold text-foreground">
              <span>{isMultiMerchant ? 'إجمالي هذا التاجر' : 'الإجمالي'}</span>
              <span>{order.total} جنيه</span>
            </div>
          </div>
        ))}

        {isMultiMerchant && (
          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 shadow-[var(--sb-shadow-soft)]">
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>الإجمالي الكلي (كل التجار)</span>
              <span>{grandTotal} جنيه</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
