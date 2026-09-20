// src/core/kernel/money.ts
// جمع/ضرب أعداد عشرية (أسعار) في JavaScript يُنتج أخطاء تقريب حقيقية (IEEE 754) — مثال حي مُكتشَف
// أثناء §31 بند 2 (orders.service.ts، 30.99+92.99 → 123.97999999999999) وبند 6
// (MerchantOrderDetails.tsx، 19.99×5 → 99.94999999999999). أي جمع/ضرب لسعرين أو أكثر خارج عمود
// قاعدة بيانات عشري مضبوط الخانتين مسبقاً يجب أن يمر عبر هذه الدالة قبل العرض.

export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
