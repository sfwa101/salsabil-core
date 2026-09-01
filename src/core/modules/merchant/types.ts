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
