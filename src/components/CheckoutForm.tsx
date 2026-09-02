'use client';

import { useState } from 'react';
import { submitCheckoutAction } from '@/app/(reef)/checkout/actions';
import type { Order } from '@/core/modules/orders/types';

export function CheckoutForm() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await submitCheckoutAction({
      customerName,
      customerPhone,
      deliveryAddress: { line1, city, notes: notes || undefined },
    });

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
    } else {
      setOrder(result.order);
    }
  }

  if (order) {
    return (
      <div className="rounded-2xl border border-primary bg-primary/5 p-6 text-center">
        <p className="mb-2 text-lg font-semibold text-foreground">تم استلام طلبك ✓</p>
        <p className="text-sm text-muted-foreground">
          رقم الطلب: {order.id.slice(0, 8)} — الإجمالي: {order.total} جنيه (الدفع عند الاستلام)
        </p>
      </div>
    );
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
