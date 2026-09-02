'use client';
// مكوّن مشترك بين بوابة التاجر (اليوم 10) ولوحة الإدارة (اليوم 11) — عرض طلب واحد بأزرار
// انتقال حالة. onTransition يُمرَّر من كل بوابة بصلاحيتها الخاصة (Server Action مختلف لكل
// جلسة/كوكي) — المكوّن نفسه لا يعرف شيئاً عن هوية الفاعل أو نوع الجلسة.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUS_LABELS_AR, ORDER_TRANSITION_ACTION_LABELS_AR, type OrderStatus } from '@/core/modules/orders/types';

type TransitionResult = { success: true } | { error: string };

interface OrderRowProps {
  orderId: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  nextStatuses: OrderStatus[];
  onTransition: (orderId: string, toStatus: OrderStatus) => Promise<TransitionResult>;
}

export function OrderRow({ orderId, status, total, createdAt, nextStatuses, onTransition }: OrderRowProps) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTransition(toStatus: OrderStatus) {
    setPending(toStatus);
    setError(null);
    const result = await onTransition(orderId, toStatus);
    setPending(null);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">#{orderId.slice(0, 8)}</span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {ORDER_STATUS_LABELS_AR[status]}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} جنيه</span>
        <span>{new Date(createdAt).toLocaleString('ar-EG')}</span>
      </div>
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => (
            <button
              key={next}
              onClick={() => handleTransition(next)}
              disabled={pending !== null}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {pending === next ? 'جارٍ التنفيذ...' : ORDER_TRANSITION_ACTION_LABELS_AR[next]}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </li>
  );
}
