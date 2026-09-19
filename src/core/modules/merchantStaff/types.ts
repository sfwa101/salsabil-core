// src/core/modules/merchantStaff/types.ts
// موظفو التاجر (TASK-14، specs/orders/PHASE_2_DOMAIN_DESIGN.md §6) — owner/staff بسيط، بدون
// خوارزميات توزيع/ورديات. لا صف owner في جدول merchant_staff إطلاقاً (قرار معتمَد §10.1 بند 1) —
// merchants.owner_id/users.role='merchant_owner' يبقيان المصدر الرسمي الوحيد لصلاحية owner.
// role مقصور بنيوياً على 'staff' فقط (نفس قيد CHECK الحي على الجدول).

import type { UserRole } from '../../kernel/khalil/types';

export type MerchantStaffRole = 'staff';

export interface MerchantStaff {
  id: string;
  tenantId: string;
  userId: string;
  role: MerchantStaffRole;
  isActive: boolean;
  createdAt: string;
}

// سياق الفاعل الذي يستدعي عمليات إدارة الموظفين (إضافة/تعطيل/قراءة قائمة) — نفس شكل
// OrderActorContext (orders/types.ts) عمداً بلا استيراده مباشرة (لا اقتران بين نطاقين بلا حاجة
// فعلية له هنا؛ كلاهما يعكس نفس مصدر الحقيقة: الجلسة). فقط merchant_owner يدير موظفي تاجره —
// platform_admin لا يتجاوز هنا عمداً (لا نص صريح في التصميم المعتمَد يمنحه ذلك، عكس
// orders.service.ts حيث platform_admin يتجاوز كل شيء صراحة) — قرار متحفّظ حتى تكليف صريح لاحق.
export interface StaffActorContext {
  role: UserRole;
  tenantId?: string;
}

export interface AddStaffInput {
  tenantId: string;
  userId: string;
}
