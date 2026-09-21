// src/app/(reef)/cart/cart-grouping.ts
// VERTICAL-SLICE-3-CART-INTEGRATION (2026-09-22) — استُخرِجت من page.tsx (كانت محلية هناك) إلى ملف
// مستقل: page.tsx (Server) وCartStemView.tsx (Client) يحتاجان كلاهما نفس منطق التجميع الحرفي —
// إبقاؤها داخل page.tsx وتصديرها للاستيراد من CartStemView كان يُنتج تبعية دائرية
// (page.tsx → CartStemView.tsx → page.tsx)، مرفوضة فعلياً بواسطة npm run arch:check (no-circular).
// دالة نقية بلا أي استدعاء شبكة/قاعدة بيانات — لا تغيير في المنطق نفسه، نقل موضع فقط.

import type { CartLineSummary } from '@/core/modules/cart/types';

const NO_TENANT_GROUP_KEY = '__no_tenant__';
const NO_TENANT_LABEL = 'المتجر';

export interface VendorGroup {
  key: string;
  merchantName: string;
  lines: CartLineSummary[];
}

// تجميع بصري حسب التاجر — checkout يدعم فعلياً طلب متعدد التجار منذ ADR-033 (يُقسَّم تلقائياً حسب
// tenant_id إلى merchant_suborders منفصلة، لا رفض). منتج بلا tenantId (نظرياً حسب types.ts، لا حالة
// حية اليوم) يُجمَّع تحت تسمية عامة بدل كسر الصفحة.
export function groupByTenant(lines: CartLineSummary[], merchantNameById: Map<string, string>): VendorGroup[] {
  const groups = new Map<string, VendorGroup>();
  for (const line of lines) {
    const tenantId = line.product.tenantId;
    const key = tenantId ?? NO_TENANT_GROUP_KEY;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        merchantName: tenantId ? (merchantNameById.get(tenantId) ?? NO_TENANT_LABEL) : NO_TENANT_LABEL,
        lines: [],
      });
    }
    groups.get(key)!.lines.push(line);
  }
  return [...groups.values()];
}
