'use client';
// §31 بند 5 — تعديل كمية/سعر توريد عرض قائم فردياً (بديل تفاعلي لاستبدال Excel كامل).

import { useState } from 'react';
import { updateMerchantOfferAction } from '@/app/merchant/offers/actions';

interface MerchantOfferRowProps {
  productId: string;
  name: string;
  unit: string;
  salePrice: number;
  quantityAvailable: number;
  costPrice: number;
}

export function MerchantOfferRow({ productId, name, unit, salePrice, quantityAvailable, costPrice }: MerchantOfferRowProps) {
  const [quantity, setQuantity] = useState(String(quantityAvailable));
  const [cost, setCost] = useState(String(costPrice));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateMerchantOfferAction({ productId, quantity: Number(quantity), costPrice: Number(cost) });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('saved');
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-xs text-muted-foreground">
          سعر البيع: {salePrice} جنيه / {unit}
        </span>
      </div>
      <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          الكمية
          <input
            required
            type="number"
            min={0}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          سعر التوريد
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-24 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {status === 'saved' ? 'حُفظ ✓' : status === 'submitting' ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
      </form>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
    </li>
  );
}
