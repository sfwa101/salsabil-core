'use client';
// §31 بند 9 — صف رحلة توصيل في لوحة المكتب: إسناد سائق (لو لم يُسنَد بعد) أو عرض السائق الحالي/الحالة.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignDriverAction } from '@/app/delivery/office/dashboard/actions';

interface DeliveryJobRowProps {
  jobId: string;
  statusLabel: string;
  driverName: string | null;
  availableDrivers: Array<{ id: string; name: string }>;
  canAssign: boolean;
}

export function DeliveryJobRow({ jobId, statusLabel, driverName, availableDrivers, canAssign }: DeliveryJobRowProps) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState(availableDrivers[0]?.id ?? '');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!selectedDriverId) return;
    setStatus('submitting');
    setError(null);
    const result = await assignDriverAction({ jobId, driverId: selectedDriverId });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
      <div className="flex items-center justify-between">
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">#{jobId.slice(0, 8)}</span>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{statusLabel}</span>
      </div>
      {driverName ? (
        <span className="text-foreground">السائق: {driverName}</span>
      ) : canAssign && availableDrivers.length > 0 ? (
        <div className="flex items-center gap-2">
          <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className="flex-1 rounded-lg border border-border bg-background p-2 text-sm text-foreground">
            {availableDrivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button onClick={handleAssign} disabled={status === 'submitting'} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            إسناد
          </button>
        </div>
      ) : (
        <span className="text-muted-foreground">بلا سائق نشط متاح</span>
      )}
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
    </li>
  );
}
