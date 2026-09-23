'use client';
// §31 بند 8 — تعديل قسم فرعي واحد (اسم/معرّف/ترتيب/تفعيل) + نقل لقسم رئيسي آخر + حذف محروس.
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — أضاف isActive/slug/الحذف/النقل، بعد
// إضافة عمود is_active على catalog_subcategories (كان غير موجود، راجع commentary القديم هنا).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSubcategoryAction, moveSubcategoryAction, deleteSubcategoryAction } from '@/app/admin/taxonomy/actions';
import type { CatalogSubcategory } from '@/core/modules/catalog/types';

interface TaxonomySubcategoryRowProps {
  subcategory: CatalogSubcategory;
  allCategoriesFlat: Array<{ id: string; nameAr: string; districtNameAr: string }>;
}

export function TaxonomySubcategoryRow({ subcategory, allCategoriesFlat }: TaxonomySubcategoryRowProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(subcategory.slug);
  const [nameAr, setNameAr] = useState(subcategory.nameAr);
  const [sortOrder, setSortOrder] = useState(String(subcategory.sortOrder));
  const [isActive, setIsActive] = useState(subcategory.isActive);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [moveTarget, setMoveTarget] = useState('');
  const [moveStatus, setMoveStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [moveError, setMoveError] = useState<string | null>(null);

  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateSubcategoryAction({ id: subcategory.id, slug, nameAr, sortOrder: Number(sortOrder), isActive });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('saved');
    router.refresh();
  }

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (!moveTarget) return;
    setMoveStatus('submitting');
    setMoveError(null);
    const result = await moveSubcategoryAction({ id: subcategory.id, newCategoryId: moveTarget });
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
    if (!window.confirm(`حذف القسم الفرعي "${subcategory.nameAr}"؟`)) return;
    setDeleteStatus('submitting');
    setDeleteError(null);
    const result = await deleteSubcategoryAction(subcategory.id);
    if ('error' in result) {
      setDeleteStatus('error');
      setDeleteError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className={`flex flex-col gap-1.5 rounded-lg border p-2 text-sm ${isActive ? 'border-border/60 bg-background' : 'border-border/40 bg-muted/40 opacity-70'}`}>
      <form onSubmit={handleSave} className="flex flex-1 flex-wrap items-center gap-2">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" className="w-28 rounded border border-border bg-card p-1.5 font-mono text-xs text-foreground" />
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="flex-1 rounded border border-border bg-card p-1.5 text-foreground" />
        <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16 rounded border border-border bg-card p-1.5 text-foreground" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          نشط
        </label>
        <button type="submit" disabled={status === 'submitting'} className="rounded border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-50">
          {status === 'saved' ? 'حُفظ ✓' : 'حفظ'}
        </button>
        <button type="button" onClick={handleDelete} disabled={deleteStatus === 'submitting'} className="rounded border border-destructive/50 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50">
          حذف
        </button>
      </form>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
      {deleteStatus === 'error' && deleteError && <span className="text-xs text-destructive">{deleteError}</span>}

      <form onSubmit={handleMove} className="flex flex-wrap items-center gap-2">
        <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="flex-1 rounded border border-border bg-card p-1.5 text-xs text-foreground">
          <option value="">نقل لقسم رئيسي آخر...</option>
          {allCategoriesFlat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.districtNameAr} ← {c.nameAr}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!moveTarget || moveStatus === 'submitting'} className="rounded border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-50">
          نقل
        </button>
      </form>
      {moveStatus === 'error' && moveError && <span className="text-xs text-destructive">{moveError}</span>}
    </li>
  );
}
