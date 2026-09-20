'use client';
// §31 بند 8 — إضافة حي جديد بالكامل.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDistrictAction } from '@/app/admin/taxonomy/actions';

export function TaxonomyAddDistrictForm({ existingCount }: { existingCount: number }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const result = await createDistrictAction({ slug, nameAr, sortOrder: existingCount });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('idle');
    setSlug('');
    setNameAr('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-foreground">إضافة حي جديد</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="معرّف (slug)، مثال: nasr-city" dir="ltr" className="w-48 rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
        <input required value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="اسم الحي بالعربية" className="flex-1 rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
        <button type="submit" disabled={status === 'submitting'} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {status === 'submitting' ? 'جارٍ الإضافة...' : 'إضافة'}
        </button>
      </div>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
