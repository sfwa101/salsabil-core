'use client';

import { useEffect, useState, useTransition } from 'react';
import { calculatePriceAction } from '@/app/(reef)/product/[id]/actions';
import { addToCartAction } from '@/app/(reef)/cart/actions';
import type { Product } from '@/core/modules/catalog/types';

// accentColor اختياري بحت (EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS، المرحلة 2) — لون هوية
// حي المنتج (neighborhood-identity-registry.ts) إن وُجد، لتلوين الاختيار النشط/السعر/الزر بدل
// primary العام دائماً. غيابه (كما في ProductSheetContent.tsx، لا يمرّره) يُبقي السلوك والمظهر
// كما كانا تماماً قبل هذه الدفعة — لا تغيير افتراضي، لا لمس لمنطق الحساب/الإضافة.
export function ProductOptions({ product, accentColor }: { product: Product; accentColor?: string }) {
  const sizeOptions = product.options.filter((o) => o.type === 'size');
  const addonOptions = product.options.filter((o) => o.type === 'addon');

  const [sizeId, setSizeId] = useState<string | undefined>(sizeOptions[0]?.id);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [addError, setAddError] = useState<string | null>(null);

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

  async function handleAddToCart() {
    setAddState('adding');
    setAddError(null);
    const result = await addToCartAction({ productId: product.id, quantity: 1, selection: { sizeId, addonIds } });
    if ('error' in result) {
      setAddState('error');
      setAddError(result.error);
    } else {
      setAddState('added');
    }
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
                className={`sb-press flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  sizeId === option.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                style={sizeId === option.id && accentColor ? { borderColor: accentColor, backgroundColor: `${accentColor}0D` } : undefined}
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
                className={`sb-press flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  addonIds.includes(option.id) ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                style={addonIds.includes(option.id) && accentColor ? { borderColor: accentColor, backgroundColor: `${accentColor}0D` } : undefined}
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

      <div
        className="rounded-2xl bg-muted p-4 text-center shadow-[var(--sb-shadow-soft)]"
        style={accentColor ? { backgroundColor: `${accentColor}1A` } : undefined}
      >
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-lg font-semibold text-foreground" style={accentColor ? { color: accentColor } : undefined}>
            السعر: {isPending ? '...' : `${price} جنيه`}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={addState === 'adding' || !!error}
        className="sb-press rounded-full bg-primary px-4 py-3 font-medium text-primary-foreground shadow-[var(--sb-shadow-pill)] transition hover:opacity-90 disabled:opacity-50"
        style={accentColor ? { backgroundColor: accentColor } : undefined}
      >
        {addState === 'adding' ? 'جارٍ الإضافة...' : addState === 'added' ? 'أُضيف للسلة ✓' : 'أضف للسلة'}
      </button>
      {addState === 'error' && addError && <span className="text-center text-sm text-destructive">{addError}</span>}
    </div>
  );
}
