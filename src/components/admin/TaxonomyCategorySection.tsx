'use client';
// §31 بند 8 — قسم رئيسي واحد داخل حي: تعديل (اسم/معرّف/ترتيب/تفعيل) + نقل لحي آخر + حذف محروس + قائمة
// أقسامه الفرعية + نموذج إضافة قسم فرعي جديد.
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — أضاف isActive/slug/الحذف/النقل، بعد
// إضافة عمود is_active على catalog_categories.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCategoryAction, createSubcategoryAction, moveCategoryAction, deleteCategoryAction } from '@/app/admin/taxonomy/actions';
import { TaxonomySubcategoryRow } from './TaxonomySubcategoryRow';
import type { CatalogCategory, CatalogSubcategory, District } from '@/core/modules/catalog/types';

interface TaxonomyCategorySectionProps {
  category: CatalogCategory;
  subcategories: CatalogSubcategory[];
  allDistricts: District[];
  allCategoriesFlat: Array<{ id: string; nameAr: string; districtNameAr: string }>;
}

export function TaxonomyCategorySection({ category, subcategories, allDistricts, allCategoriesFlat }: TaxonomyCategorySectionProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(category.slug);
  const [nameAr, setNameAr] = useState(category.nameAr);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [addError, setAddError] = useState<string | null>(null);

  const [moveTarget, setMoveTarget] = useState('');
  const [moveStatus, setMoveStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [moveError, setMoveError] = useState<string | null>(null);

  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateCategoryAction({ id: category.id, slug, nameAr, sortOrder: Number(sortOrder), isActive });
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

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (!moveTarget) return;
    setMoveStatus('submitting');
    setMoveError(null);
    const result = await moveCategoryAction({ id: category.id, newDistrictId: moveTarget });
    if ('error' in result) {
      setMoveStatus('error');
      setMoveError(result.error);
      return;
    }
    setMoveStatus('idle');
    setMoveTarget('');
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`حذف القسم الرئيسي "${category.nameAr}"؟`)) return;
    setDeleteStatus('submitting');
    setDeleteError(null);
    const result = await deleteCategoryAction(category.id);
    if ('error' in result) {
      setDeleteStatus('error');
      setDeleteError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <details className={`rounded-xl border p-3 ${isActive ? 'border-border/70 bg-muted/20' : 'border-border/40 bg-muted/10 opacity-70'}`}>
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {category.nameAr} <span dir="ltr" className="font-mono text-xs text-muted-foreground">({category.slug})</span> — {subcategories.length} قسم فرعي
        {!isActive && <span className="ms-2 text-xs text-muted-foreground">(مخفي)</span>}
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" className="w-32 rounded-lg border border-border bg-card p-2 font-mono text-xs text-foreground" />
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="flex-1 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16 rounded-lg border border-border bg-card p-2 text-sm text-foreground" />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            نشط
          </label>
          <button type="submit" disabled={status === 'submitting'} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50">
            {status === 'saved' ? 'حُفظ ✓' : 'حفظ'}
          </button>
          <button type="button" onClick={handleDelete} disabled={deleteStatus === 'submitting'} className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
            حذف
          </button>
        </form>
        {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
        {deleteStatus === 'error' && deleteError && <span className="text-xs text-destructive">{deleteError}</span>}

        <form onSubmit={handleMove} className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="flex-1 rounded-lg border border-border bg-card p-2 text-xs text-foreground">
            <option value="">نقل لحي آخر...</option>
            {allDistricts
              .filter((d) => d.id !== category.districtId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
          </select>
          <button type="submit" disabled={!moveTarget || moveStatus === 'submitting'} className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted disabled:opacity-50">
            نقل
          </button>
        </form>
        {moveStatus === 'error' && moveError && <span className="text-xs text-destructive">{moveError}</span>}

        {subcategories.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {subcategories.map((s) => (
              <TaxonomySubcategoryRow key={s.id} subcategory={s} allCategoriesFlat={allCategoriesFlat} />
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
