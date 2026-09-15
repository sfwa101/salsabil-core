// src/core/modules/merchant/types.ts
// نطاق التاجر — عزل المستأجرين (Multi-Tenancy) وفق SALSABIL_CONSTITUTION.md §5, §26
//
// ملاحظة: specs/identity/SPEC.md وقواعد عدالة التجار BR-007..BR-011 غير موثّقة بعد
// في هذا المشروع. commissionRate هنا قيمة قابلة للتهيئة لكل تاجر على حدة،
// وليست نسبة ثابتة مبرمجة — يجب عدم الاعتماد على رقم افتراضي دون مصدر موثّق.

export interface Merchant {
  id: string;
  ownerId: string;
  businessName: string;
  phone: string;
  slug: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  // TASK-13 (specs/orders/PHASE_2_DOMAIN_DESIGN.md §7.3) — يُنسَخ حرفياً إلى
  // merchant_suborders.settlement_model وقت إنشاء كل suborder عند Checkout. عمود جديد nullable —
  // كل التجار الحاليين NULL حتى يُحدَّد لكل تاجر يدوياً؛ orders.service.ts يفترض 'reef_collected'
  // (قرار مؤسس صريح) لأي تاجر لم يحدّده بعد، حفاظاً على عمل Checkout فوراً لكل التجار الحاليين —
  // اختياري هنا (لا `| null` إلزامي) لتفادي كسر أي بناء كائن Merchant حرفي قديم في الاختبارات.
  defaultSettlementModel?: 'driver_fronted' | 'reef_collected' | null;
}

// عقد الاتفاقية بين المنصة والتاجر — إسقاط من بيانات التاجر الأساسية
export interface MerchantAgreement {
  merchantId: string;
  commissionRate: number;
  isActive: boolean;
}

export interface MerchantRegistrationInput {
  ownerId: string;
  businessName: string;
  phone: string;
  slug: string;
  commissionRate: number;
}
