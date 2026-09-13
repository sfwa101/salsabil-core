'use client';
// رفع ملف Excel لاستيراد الكمية/التكلفة الخاصة بالتاجر (CATALOG-IMPORT-WORKFLOW، ADR-025).

import { useState } from 'react';
import { importCatalogExcelAction } from '@/app/merchant/import/actions';
import type { MerchantImportRowError } from '@/core/modules/catalog/types';

type Summary = { matched: number; queued: number; errors: MerchantImportRowError[] };

export function MerchantImportForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    setSummary(null);

    const formData = new FormData(e.currentTarget);
    const result = await importCatalogExcelAction(formData);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setStatus('idle');
    setSummary(result.data);
    e.currentTarget.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          ملف Excel (.xlsx) بـ3 أعمدة: اسم المنتج، الكمية، التكلفة. سعر البيع يحدده المالك، لا يُستورَد هنا.
        </p>
        <input type="file" name="file" accept=".xlsx" required className="text-sm text-foreground" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {status === 'submitting' ? 'جارٍ الاستيراد...' : 'استيراد الملف'}
        </button>
      </form>

      {summary && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="text-foreground">
            تم ربط <span className="font-semibold">{summary.matched}</span> منتجاً تلقائياً، وأُرسِل{' '}
            <span className="font-semibold">{summary.queued}</span> لقائمة مراجعة المالك.
          </p>
          {summary.errors.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">صفوف مرفوضة ({summary.errors.length}):</p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {summary.errors.map((err, i) => (
                  <li key={i}>
                    السطر {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
