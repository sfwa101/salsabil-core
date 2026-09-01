'use client';

import { useEffect, useState, useTransition } from 'react';
import { calculatePriceAction } from '@/app/(reef)/product/[id]/actions';
import type { Product } from '@/core/modules/catalog/types';

export function ProductOptions({ product }: { product: Product }) {
  const sizeOptions = product.options.filter((o) => o.type === 'size');
  const addonOptions = product.options.filter((o) => o.type === 'addon');

  const [sizeId, setSizeId] = useState<string | undefined>(sizeOptions[0]?.id);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await calculatePriceAction(product.id, { sizeId, addonIds });
      if ('error' in result) {
        setError(result.error);
        setPrice(null);
      } else {
        setError(null);
        setPrice(result.price);
      }
    });
  }, [product.id, sizeId, addonIds]);

  function toggleAddon(addonId: string) {
    setAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
  }

  return (
    <div className="flex flex-col gap-6">
      {sizeOptions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">الحجم</h2>
          <div className="flex flex-col gap-2">
            {sizeOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                  sizeId === option.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="size"
                    checked={sizeId === option.id}
                    onChange={() => setSizeId(option.id)}
                  />
                  {option.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {option.priceModifier > 0 ? `+${option.priceModifier}` : option.priceModifier === 0 ? '—' : option.priceModifier}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {addonOptions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">إضافات</h2>
          <div className="flex flex-col gap-2">
            {addonOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                  addonIds.includes(option.id) ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={addonIds.includes(option.id)} onChange={() => toggleAddon(option.id)} />
                  {option.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {option.priceModifier > 0 ? `+${option.priceModifier}` : option.priceModifier === 0 ? '—' : option.priceModifier}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted p-4 text-center">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-lg font-semibold text-foreground">
            السعر: {isPending ? '...' : `${price} جنيه`}
          </span>
        )}
      </div>
    </div>
  );
}
