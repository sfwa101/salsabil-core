'use client';
// صف عنصر كتالوج أساسي — تعديل سعر البيع فقط (المالك وحده يقرره، CATALOG-IMPORT-WORKFLOW، ADR-031).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMasterItemPriceAction } from '@/app/admin/catalog/actions';

interface MasterItemRowProps {
  id: string;
  name: string;
  categoryName: string;
  unit: string;
  basePrice: number;
}

export function MasterItemRow({ id, name, categoryName, unit, basePrice }: MasterItemRowProps) {
  const router = useRouter();
  const [price, setPrice] = useState(String(basePrice));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setStatus('submitting');
    setError(null);
    const result = await updateMasterItemPriceAction(id, Number(price) || 0);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('idle');
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          {categoryName} · {unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'submitting'}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          حفظ السعر
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  );
}
