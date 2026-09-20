'use client';
// §31 بند 8 — قسم رئيسي واحد داخل حي: تعديل (اسم/ترتيب) + قائمة أقسامه الفرعية + نموذج إضافة قسم فرعي جديد.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCategoryAction, createSubcategoryAction } from '@/app/admin/taxonomy/actions';
import { TaxonomySubcategoryRow } from './TaxonomySubcategoryRow';
import type { CatalogCategory, CatalogSubcategory } from '@/core/modules/catalog/types';

interface TaxonomyCategorySectionProps {
  category: CatalogCategory;
  subcategories: CatalogSubcategory[];
}

export function TaxonomyCategorySection({ category, subcategories }: TaxonomyCategorySectionProps) {
  const router = useRouter();
  const [nameAr, setNameAr] = useState(category.nameAr);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [addError, setAddError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateCategoryAction({ id: category.id, nameAr, sortOrder: Number(sortOrder) });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('saved');
    router.refresh();
  }

  async function handleAddSubcategory(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus('submitting');
    setAddError(null);
    const result = await createSubcategoryAction({ categoryId: category.id, slug: newSlug, nameAr: newName, sortOrder: subcategories.length });
    if ('error' in result) {
      setAddStatus('error');
      setAddError(result.error);
      return;
    }
    setAddStatus('idle');
    setNewSlug('');
    setNewName('');
    router.refresh();
  }

  return (
    <details className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {category.nameAr} <span dir="ltr" className="font-mono text-xs text-muted-foreground">({category.slug})</span> — {subcategories.length} قسم فرعي
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="flex-1 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <button type="submit" disabled={status === 'submitting'} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50">
            {status === 'saved' ? 'حُفظ ✓' : 'حفظ'}
          </button>
        </form>
        {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}

        {subcategories.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {subcategories.map((s) => (
              <TaxonomySubcategoryRow key={s.id} subcategory={s} />
            ))}
          </ul>
        )}

        <form onSubmit={handleAddSubcategory} className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <input required value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="معرّف (slug)" dir="ltr" className="w-32 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم القسم الفرعي" className="flex-1 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <button type="submit" disabled={addStatus === 'submitting'} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            إضافة قسم فرعي
          </button>
        </form>
        {addStatus === 'error' && addError && <span className="text-xs text-destructive">{addError}</span>}
      </div>
    </details>
  );
}
