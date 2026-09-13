'use client';
// نموذج إنشاء عنصر كتالوج أساسي — سعر البيع هنا فقط، يحدده المالك (CATALOG-IMPORT-WORKFLOW، ADR-025).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMasterItemAction, type MasterItemFormInput } from '@/app/admin/catalog/actions';

interface CategoryOption {
  id: string;
  name: string;
}

const inputClassName = 'rounded-xl border border-border bg-card p-3 text-foreground';

export function MasterItemForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [unit, setUnit] = useState('piece');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const input: MasterItemFormInput = {
      categoryId,
      name: name.trim(),
      basePrice: Number(basePrice) || 0,
      unit: unit.trim(),
      imageUrl: imageUrl.trim() || undefined,
    };

    const result = await createMasterItemAction(input);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setName('');
    setBasePrice('');
    setImageUrl('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-foreground">إضافة منتج جديد للكتالوج الأساسي</h2>

      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClassName} required>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسم المنتج"
        className={inputClassName}
        required
      />

      <div className="flex gap-3">
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
          placeholder="الوحدة (piece/kg...)"
          className={`${inputClassName} flex-1`}
          required
        />
      </div>

      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="رابط صورة (اختياري)"
        className={inputClassName}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ الإضافة...' : 'إضافة للكتالوج الأساسي'}
      </button>
    </form>
  );
}
