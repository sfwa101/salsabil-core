'use client';
// §31 بند 5 — بحث التاجر في Product Library بالاسم (لا Barcode، غير موجود بالمخطط)، ثم إضافة منتج
// مُختار لعروضه (كمية + سعر توريد). بحث عند الإرسال (لا debounce تلقائي — تبسيط V1 مقبول لحجم
// الكتالوج الأساسي الحالي، catalog_master_items صغير جداً اليوم).

import { useState, useTransition } from 'react';
import type { MasterCatalogItem } from '@/core/modules/catalog/types';
import { searchMasterItemsAction, addMerchantOfferAction } from '@/app/merchant/offers/actions';

export function MerchantOfferSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MasterCatalogItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const items = await searchMasterItemsAction(query);
      setResults(items);
      setSearched(true);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground">إضافة منتج من مكتبة المنتجات</h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اسم المنتج..."
          className="flex-1 rounded-xl border border-border bg-background p-3 text-foreground"
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length === 0}
          className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'جارٍ البحث...' : 'بحث'}
        </button>
      </form>

      {searched && !isPending && results.length === 0 && (
        <p className="text-sm text-muted-foreground">لا نتائج مطابقة</p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((item) => (
            <AddOfferRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddOfferRow({ item }: { item: MasterCatalogItem }) {
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await addMerchantOfferAction({
      masterItemId: item.id,
      quantity: Number(quantity),
      costPrice: Number(costPrice),
    });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('done');
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          سعر البيع: {item.basePrice} جنيه / {item.unit}
        </span>
      </div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          required
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="الكمية"
          className="w-24 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        />
        <input
          required
          type="number"
          min={0}
          step="0.01"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          placeholder="سعر التوريد"
          className="w-28 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'done' ? 'أُضيف ✓' : status === 'submitting' ? 'جارٍ...' : 'إضافة لعروضي'}
        </button>
      </form>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
    </li>
  );
}
