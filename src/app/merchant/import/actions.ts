'use server';
// استيراد Excel ذاتي للتاجر (CATALOG-IMPORT-WORKFLOW، ADR-025) — يفرض عزل المستأجرين عبر tenantId
// من الجلسة، لا من أي مدخل عميل (نفس نمط merchant/orders/actions.ts). قالب 3 أعمدة فقط: اسم
// المنتج، الكمية، التكلفة — لا سعر بيع (يحدده المالك فقط عبر /admin/catalog).

import { revalidatePath } from 'next/cache';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { parseMerchantImportFile } from '@/core/modules/catalog/excel-import';
import type { MerchantImportRowError } from '@/core/modules/catalog/types';

type ImportActionResult = { success: true; data: { matched: number; queued: number; errors: MerchantImportRowError[] } } | { error: string };

const MERCHANT_ACTOR_ROLES = ['merchant_owner', 'merchant_manager', 'employee'] as const;

export async function importCatalogExcelAction(formData: FormData): Promise<ImportActionResult> {
  const session = await getMerchantSession();
  if (!session || !session.tenantId || !MERCHANT_ACTOR_ROLES.includes(session.role as (typeof MERCHANT_ACTOR_ROLES)[number])) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'يرجى اختيار ملف Excel (.xlsx)' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseMerchantImportFile(buffer);

    if (parsed.rows.length === 0) {
      return { success: true, data: { matched: 0, queued: 0, errors: parsed.errors } };
    }

    const result = await catalogService.importMerchantExcel(session.tenantId, parsed.rows);
    revalidatePath('/merchant/import');
    return { success: true, data: { matched: result.matched, queued: result.queued, errors: parsed.errors } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء الاستيراد' };
  }
}
