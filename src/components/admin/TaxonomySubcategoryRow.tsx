'use client';
// §31 بند 8 — تعديل قسم فرعي واحد (اسم/ترتيب). لا حذف ولا تفعيل/تعطيل — العمود غير موجود أصلاً على
// catalog_subcategories (راجع catalog.repository.ts → CatalogSubcategoryRow).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSubcategoryAction } from '@/app/admin/taxonomy/actions';
import type { CatalogSubcategory } from '@/core/modules/catalog/types';

export function TaxonomySubcategoryRow({ subcategory }: { subcategory: CatalogSubcategory }) {
  const router = useRouter();
  const [nameAr, setNameAr] = useState(subcategory.nameAr);
  const [sortOrder, setSortOrder] = useState(String(subcategory.sortOrder));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateSubcategoryAction({ id: subcategory.id, nameAr, sortOrder: Number(sortOrder) });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('saved');
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background p-2 text-sm">
      <span dir="ltr" className="font-mono text-xs text-muted-foreground">{subcategory.slug}</span>
      <form onSubmit={handleSave} className="flex flex-1 flex-wrap items-center gap-2">
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="flex-1 rounded border border-border bg-card p-1.5 text-foreground" />
        <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16 rounded border border-border bg-card p-1.5 text-foreground" />
        <button type="submit" disabled={status === 'submitting'} className="rounded border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-50">
          {status === 'saved' ? 'حُفظ ✓' : 'حفظ'}
        </button>
      </form>
      {status === 'error' && error && <span className="w-full text-xs text-destructive">{error}</span>}
    </li>
  );
}
