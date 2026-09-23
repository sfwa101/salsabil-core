'use client';
// §31 بند 8 — حي واحد كامل: تعديل (معرّف/اسم/وصف تعريفي/ترتيب/تفعيل) + حذف محروس، قائمة أقسامه
// الرئيسية (كل واحد مع أقسامه الفرعية عبر TaxonomyCategorySection)، ونموذج إضافة قسم رئيسي جديد.
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — أضاف slug/tagline/الحذف، ومرَّر
// allDistricts/allCategoriesFlat للأسفل (نقل قسم رئيسي/فرعي بين آباء).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDistrictAction, createCategoryAction, deleteDistrictAction } from '@/app/admin/taxonomy/actions';
import { TaxonomyCategorySection } from './TaxonomyCategorySection';
import type { District, CatalogCategory, CatalogSubcategory } from '@/core/modules/catalog/types';

interface TaxonomyDistrictCardProps {
  district: District;
  categories: Array<{ category: CatalogCategory; subcategories: CatalogSubcategory[] }>;
  allDistricts: District[];
  allCategoriesFlat: Array<{ id: string; nameAr: string; districtNameAr: string }>;
}

export function TaxonomyDistrictCard({ district, categories, allDistricts, allCategoriesFlat }: TaxonomyDistrictCardProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(district.slug);
  const [nameAr, setNameAr] = useState(district.nameAr);
  const [tagline, setTagline] = useState(district.tagline ?? '');
  const [sortOrder, setSortOrder] = useState(String(district.sortOrder));
  const [isActive, setIsActive] = useState(district.isActive);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await updateDistrictAction({ id: district.id, slug, nameAr, tagline: tagline.trim() || null, sortOrder: Number(sortOrder), isActive });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('saved');
    router.refresh();
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus('submitting');
    setAddError(null);
    const result = await createCategoryAction({ districtId: district.id, slug: newSlug, nameAr: newName, sortOrder: categories.length });
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

  async function handleDelete() {
    if (!window.confirm(`حذف الحي "${district.nameAr}"؟`)) return;
    setDeleteStatus('submitting');
    setDeleteError(null);
    const result = await deleteDistrictAction(district.id);
    if ('error' in result) {
      setDeleteStatus('error');
      setDeleteError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${isActive ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-70'}`}>
      <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" className="w-32 rounded-lg border border-border bg-background p-2 font-mono text-xs text-muted-foreground" />
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="flex-1 rounded-lg border border-border bg-background p-2 text-sm font-medium text-foreground" />
        <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-16 rounded-lg border border-border bg-background p-2 text-sm text-foreground" />
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
      <input
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        placeholder="وصف تعريفي قصير (اختياري)"
        className="rounded-lg border border-border bg-background p-2 text-xs text-muted-foreground"
      />
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
      {deleteStatus === 'error' && deleteError && <span className="text-xs text-destructive">{deleteError}</span>}

      <div className="flex flex-col gap-2 ps-3">
        {categories.map(({ category, subcategories }) => (
          <TaxonomyCategorySection
            key={category.id}
            category={category}
            subcategories={subcategories}
            allDistricts={allDistricts}
            allCategoriesFlat={allCategoriesFlat}
          />
        ))}

        <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/70 p-2">
          <input required value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="معرّف (slug)" dir="ltr" className="w-32 rounded-lg border border-border bg-background p-2 text-sm text-foreground" />
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم القسم الرئيسي" className="flex-1 rounded-lg border border-border bg-background p-2 text-sm text-foreground" />
          <button type="submit" disabled={addStatus === 'submitting'} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            إضافة قسم رئيسي
          </button>
        </form>
        {addStatus === 'error' && addError && <span className="text-xs text-destructive">{addError}</span>}
      </div>
    </div>
  );
}
