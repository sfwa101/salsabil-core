'use client';
// §31 بند 9 — صف طلب جاهز للإسناد + زر "إنشاء رحلة توصيل" (إسناد يدوي بسيط، بلا خوارزمية ترشيح).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDeliveryJobAction } from '@/app/delivery/office/dashboard/actions';

export function ReadySuborderRow({ suborderId, merchantName, total }: { suborderId: string; merchantName: string; total: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setStatus('submitting');
    setError(null);
    const result = await createDeliveryJobAction(suborderId);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{merchantName}</span>
        <span className="text-muted-foreground">{total} جنيه</span>
      </div>
      <div className="flex items-center justify-between">
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">#{suborderId.slice(0, 8)}</span>
        <button
          onClick={handleCreate}
          disabled={status === 'submitting'}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'submitting' ? 'جارٍ الإنشاء...' : 'إنشاء رحلة توصيل'}
        </button>
      </div>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
    </li>
  );
}
