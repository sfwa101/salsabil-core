'use client';
// §31 بند 9 — بطاقة رحلة للسائق: عنوان/تاجر/إجمالي كل بند، وأزرار الانتقال للحالة التالية.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { transitionDeliveryJobAction } from '@/app/delivery/driver/dashboard/actions';

interface SuborderInfo {
  merchantName: string;
  total: number;
  addressLine1: string;
  addressCity: string;
}

interface DriverJobCardProps {
  jobId: string;
  statusLabel: string;
  nextStatuses: Array<{ value: string; label: string }>;
  suborders: SuborderInfo[];
}

export function DriverJobCard({ jobId, statusLabel, nextStatuses, suborders }: DriverJobCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTransition(toStatus: string) {
    setPending(toStatus);
    setError(null);
    const result = await transitionDeliveryJobAction(jobId, toStatus);
    setPending(null);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span dir="ltr" className="font-mono text-sm text-muted-foreground">#{jobId.slice(0, 8)}</span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{statusLabel}</span>
      </div>
      {suborders.map((s, i) => (
        <div key={i} className="rounded-xl bg-muted/30 p-2 text-sm">
          <p className="font-medium text-foreground">{s.merchantName} — {s.total} جنيه</p>
          <p className="text-muted-foreground">{s.addressLine1}، {s.addressCity}</p>
        </div>
      ))}
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((next) => (
            <button
              key={next.value}
              onClick={() => handleTransition(next.value)}
              disabled={pending !== null}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {pending === next.value ? 'جارٍ التنفيذ...' : next.label}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </li>
  );
}
