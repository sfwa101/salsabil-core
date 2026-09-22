'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitCheckoutAction } from '@/app/(reef)/checkout/actions';
import { getCartSummaryAction } from '@/app/(reef)/cart/actions';
import { saveLastOrderId } from '@/lib/last-order';
import { saveOrderSuccessFlash } from '@/lib/order-success-flash';

export function CheckoutForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    // يُقرَأ قبل submitCheckoutAction مباشرة (لا من عرض الصفحة عند التحميل) — نفس لحظة الحساب التي
    // يعتمدها ordersService.checkout() لهذه السلة بالذات. المصدر الوحيد للإجمالي الحقيقي هنا: Order
    // المُعاد من submitCheckoutAction هو نصيب تاجر واحد فقط (merchant_suborder الأول، TASK-13) — لا
    // يمثّل إجمالي سلة متعددة التجار؛ ملخّص السلة يمثّل الإجمالي الكلي الصحيح في الحالتين.
    const summary = await getCartSummaryAction();

    const result = await submitCheckoutAction({
      customerName,
      customerPhone,
      deliveryAddress: { line1, city, notes: notes || undefined },
    });

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }

    // "طلباتي" في BottomNav (BAYAN-CLOSEOUT-UI-GAPS) يقرأ هذا لاحقاً للعودة المباشرة لآخر طلب —
    // localStorage فقط، لا حساب عميل حقيقي يُخزَّن الطلب تحته
    saveLastOrderId(result.order.id);

    // بيانات نجاح الطلب لـOrderSuccessModalStem — sessionStorage تُقرَأ مرة واحدة في صفحة
    // /order/[id] الحقيقية (راجع order-success-flash.ts). العنوان مصدره مدخلات هذا النموذج بالذات، لا
    // getOrderForCustomerView (التي تتعمَّد عدم إعادة عنوان التوصيل لأي حامل رابط لاحقاً). tip/change
    // بلا أي حقل Backend مقابل — 0 دائماً (الـStem يُخفي صف "إضافات" تلقائياً عند صفر، لا تلفيق).
    //
    // ملاحظة معمارية (AGENTS.md §13): submitCheckoutAction ينعش مسار التوجيه الحالي تلقائياً بعد
    // نجاحه (سلوك Server Actions القياسي في Next.js) — عرض نافذة النجاح مباشرة فوق صفحة /checkout
    // نفسها غير مستقر فعلياً (السلة فارغة الآن → Server Component يُعيد عرض حالة "السلة فارغة" فيُزيل
    // CheckoutForm بالكامل قبل أن يراها المستخدم، مُتحقَّق منه حياً عبر Playwright). لذلك يبقى التنقّل
    // الحقيقي لصفحة تتبّع الطلب الدائمة هو المسار، مع لمحة نجاح تُقرَأ محلياً في تلك الصفحة بدل نافذة
    // على صفحة /checkout نفسها.
    saveOrderSuccessFlash({
      orderId: result.order.id,
      total: summary.total,
      itemsCount: summary.lines.reduce((sum, l) => sum + l.item.quantity, 0),
      address: city ? `${line1}، ${city}` : line1,
      tip: 0,
      change: 0,
      items: summary.lines.map((l) => ({ title: l.product.name, quantity: l.item.quantity })),
    });

    router.push(`/order/${result.order.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">الاسم</label>
        <input
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">رقم الهاتف</label>
        <input
          required
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">العنوان</label>
        <input
          required
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">المدينة</label>
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">ملاحظات (اختياري)</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ الإرسال...' : 'تأكيد الطلب (الدفع عند الاستلام)'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
