'use client';
// صف قائمة مراجعة استيراد — المالك يحسم: منتج جديد كلياً، أو دمج مع عنصر كتالوج أساسي موجود
// (CATALOG-IMPORT-WORKFLOW، ADR-025). بحث نصي بسيط عبر التصفية المحلية (الكتالوج صغير اليوم) —
// لا مطابقة تقريبية (fuzzy)/اقتراحات مرتَّبة، قرار مؤسس صريح (راجع docs/DECISIONS.md → ADR-025).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveReviewQueueAsMergeAction, resolveReviewQueueAsNewAction } from '@/app/admin/catalog/review/actions';

interface CategoryOption {
  id: string;
  name: string;
}

interface MasterItemOption {
  id: string;
  name: string;
}

interface ReviewQueueRowProps {
  queueId: string;
  tenantBusinessName: string;
  rawName: string;
  quantity: number;
  costPrice: number;
  categories: CategoryOption[];
  masterItems: MasterItemOption[];
}

const inputClassName = 'rounded-lg border border-border bg-background p-2 text-sm text-foreground';

export function ReviewQueueRow({ queueId, tenantBusinessName, rawName, quantity, costPrice, categories, masterItems }: ReviewQueueRowProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'closed' | 'new' | 'merge'>('closed');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(rawName);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [basePrice, setBasePrice] = useState('');
  const [unit, setUnit] = useState('piece');

  const [search, setSearch] = useState('');
  const filteredMasterItems = masterItems.filter((m) => m.name.includes(search.trim()));

  async function handleApproveNew(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await resolveReviewQueueAsNewAction({
      queueId,
      categoryId,
      name: name.trim(),
      basePrice: Number(basePrice) || 0,
      unit: unit.trim(),
    });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleMerge(masterItemId: string) {
    setStatus('submitting');
    setError(null);
    const result = await resolveReviewQueueAsMergeAction(queueId, masterItemId);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium text-foreground">{rawName}</p>
        <p className="text-xs text-muted-foreground">
          {tenantBusinessName} · الكمية: {quantity} · التكلفة: {costPrice}
        </p>
      </div>

      {mode === 'closed' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('new')}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            منتج جديد
          </button>
          <button
            type="button"
            onClick={() => setMode('merge')}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            دمج مع منتج موجود
          </button>
        </div>
      )}

      {mode === 'new' && (
        <form onSubmit={handleApproveNew} className="flex flex-col gap-2 border-t border-border pt-3">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClassName} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} required />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="سعر البيع"
              className={`${inputClassName} flex-1`}
              required
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="الوحدة"
              className={`${inputClassName} flex-1`}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              تأكيد كمنتج جديد
            </button>
            <button type="button" onClick={() => setMode('closed')} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {mode === 'merge' && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج في الكتالوج الأساسي..."
            className={inputClassName}
          />
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {filteredMasterItems.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleMerge(m.id)}
                  disabled={status === 'submitting'}
                  className="w-full rounded-lg border border-border px-3 py-2 text-right text-xs text-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setMode('closed')} className="self-start rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            إلغاء
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  );
}
