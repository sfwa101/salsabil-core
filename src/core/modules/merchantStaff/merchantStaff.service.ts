// src/core/modules/merchantStaff/merchantStaff.service.ts
// TASK-14 — إدارة موظفي التاجر (owner يضيف/يعطّل staff) + assertActiveStaff، دالة التحقق من
// عضوية نشطة التي يجب أن يستهلكها أي مستدعٍ يبني OrderActorContext لفاعل دوره 'employee' قبل
// تمريره لـ orders.service.ts.
//
// ⚠️ عمداً لا يُعدَّل orders.service.ts/orders.repository.ts/customerOrder.repository.ts هنا —
// نطاق TASK-13/TASK-08 محمي صراحة من هذه المهمة (الموجّه، §3 ممنوع). التحقق من merchant_staff طبقة
// منفصلة تسبق أي استدعاء لتلك الدوال، لا تعديلاً داخلها — orders.service.assertActorCanAccessOrder
// الحالية تكفي وحدها لعزل tenantId (TENANT_SCOPED_ACTOR_ROLES تشمل 'employee' بالفعل)؛ ما كان
// ناقصاً هو التحقق من أن الفاعل عضو نشط حقيقي في merchant_staff قبل الوثوق بـtenantId المُدَّعى —
// هذا بالضبط ما تضيفه هذه الدالة، تُستهلَك من طبقة بناء الجلسة/السياق (مستقبلاً)، لا من داخل
// orders.service.ts نفسها.
//
// نمط RLS/تفويض: نفس نمط المشروع القائم بالكامل حرفياً (orders/types.ts: "من يملك حق كل انتقال —
// طبقة تطبيق فقط، لا RLS، نفس فجوة عدم وجود Auth حقيقي") — merchant_staff نفسه RLS مقفول بالكامل
// (service_role فقط، بلا أي policy)، كل التخويل الفعلي هنا.

import { khalilService } from '../../kernel/khalil/service';
import { merchantService } from '../merchant/merchant.service';
import { merchantStaffRepository } from './merchantStaff.repository';
import type { AddStaffInput, MerchantStaff, StaffActorContext } from './types';

// أدوار لا يجوز تحويلها لموظف تاجر إطلاقاً — تعارض هوية حقيقي (مالك تاجر/مسؤول منصة له صلاحيات
// أوسع بكثير من "دوران" staff المحدود، §6.1 من التصميم المعتمَد).
const ROLES_CONFLICTING_WITH_STAFF = ['merchant_owner', 'platform_admin'] as const;

export class MerchantStaffService {
  /**
   * owner فقط يضيف موظفاً لمتجره — actor.tenantId يجب أن يطابق المتجر المستهدَف بالضبط (نفس نمط
   * TENANT_SCOPED_ACTOR_ROLES في orders.service.ts). يرفض حسابات owner/admin كموظفين (تعارض دور).
   * يُعيد تفعيل صف مُعطَّل مسبقاً بدل الفشل (owner يفصل موظفاً ثم يعيد تعيينه لاحقاً — حالة واقعية
   * متوقَّعة، لا خطأً يستحق رفضاً) بدل الاعتماد على قيد UNIQUE(tenant_id, user_id) وحده.
   */
  async addStaff(actor: StaffActorContext, input: AddStaffInput): Promise<MerchantStaff> {
    if (actor.role !== 'merchant_owner' || actor.tenantId !== input.tenantId) {
      throw new Error('فقط مالك هذا التاجر يملك صلاحية إضافة موظفين له');
    }

    const targetUser = await khalilService.findUserById(input.userId);
    if (!targetUser) {
      throw new Error('المستخدم المطلوب إضافته غير موجود');
    }
    if (ROLES_CONFLICTING_WITH_STAFF.includes(targetUser.role as (typeof ROLES_CONFLICTING_WITH_STAFF)[number])) {
      throw new Error('لا يمكن إضافة مالك تاجر أو مسؤول منصة كموظف');
    }

    const existing = await merchantStaffRepository.findByTenantAndUser(input.tenantId, input.userId);
    if (existing) {
      if (existing.isActive) {
        throw new Error('هذا المستخدم موظف بالفعل في هذا التاجر');
      }
      return merchantStaffRepository.setActiveStatus(existing.id, true);
    }

    // §6.2 من التصميم المعتمَد: عضو merchant_staff بدور 'staff' يحمل users.role = 'employee' —
    // إعادة استخدام قيمة موجودة فعلياً وغير مُستهلَكة، لا اختراع قيمة جديدة.
    if (targetUser.role !== 'employee') {
      await khalilService.setUserRole(input.userId, 'employee');
    }

    return merchantStaffRepository.create(input.tenantId, input.userId);
  }

  /**
   * owner فقط يعطّل/يفعّل موظف تاجره — التعطيل يُفقِد الوصول فوراً: assertActiveStaff أدناه يقرأ
   * is_active حياً من DB في كل استدعاء، بلا أي كاش.
   */
  async setStaffActiveStatus(actor: StaffActorContext, staffId: string, isActive: boolean): Promise<MerchantStaff> {
    const staff = await merchantStaffRepository.findById(staffId);
    if (!staff) {
      throw new Error('الموظف غير موجود');
    }
    if (actor.role !== 'merchant_owner' || actor.tenantId !== staff.tenantId) {
      throw new Error('فقط مالك هذا التاجر يملك صلاحية تعديل حالة هذا الموظف');
    }
    return merchantStaffRepository.setActiveStatus(staffId, isActive);
  }

  /** owner فقط يرى قائمة موظفي تاجره (نشطين ومعطَّلين معاً). */
  async listStaffForTenant(actor: StaffActorContext, tenantId: string): Promise<MerchantStaff[]> {
    if (actor.role !== 'merchant_owner' || actor.tenantId !== tenantId) {
      throw new Error('فقط مالك هذا التاجر يملك صلاحية رؤية قائمة موظفيه');
    }
    return merchantStaffRepository.listByTenant(tenantId);
  }

  /**
   * يتحقق حياً أن (tenantId, userId) يطابقان صف merchant_staff نشطاً فعلياً — يُستهلَك من أي
   * مستدعٍ يبني OrderActorContext لفاعل 'employee' قبل تمريره لـ orders.service.ts (نفس مسؤولية
   * "tenantId يجب أن يأتي من الجلسة" الموثَّقة أصلاً في orders.service.ts.getOrdersForTenant،
   * مطبَّقة هنا كخطوة تحقق سابقة لها: الجلسة نفسها يجب أن تُبنى من عضوية نشطة حقيقية، لا افتراضاً).
   */
  async assertActiveStaff(tenantId: string, userId: string): Promise<MerchantStaff> {
    const staff = await merchantStaffRepository.findByTenantAndUser(tenantId, userId);
    if (!staff || !staff.isActive) {
      throw new Error('لا عضوية نشطة لهذا المستخدم في هذا التاجر');
    }
    return staff;
  }

  /**
   * يحسم دور الفاعل الفعلي (متوافق مع OrderActorContext: {role, tenantId}) ضمن سياق تاجر واحد
   * محدَّد مسبقاً — owner عبر merchants.owner_id أولاً، وإلا staff نشط عبر assertActiveStaff. يرمي
   * خطأً صريحاً بلا أي وصول ضمني لو لم يطابق أياً منهما. لا حل تلقائي عبر كل التجار التي قد ينتمي
   * لها المستخدم — الاستدعاء دائماً ضمن سياق تاجر واحد معروف مسبقاً (رابط لوحة تاجر محدَّد).
   */
  async resolveActorContextForTenant(
    userId: string,
    tenantId: string
  ): Promise<{ role: 'merchant_owner' | 'employee'; tenantId: string }> {
    const merchant = await merchantService.findById(tenantId);
    if (merchant && merchant.ownerId === userId) {
      return { role: 'merchant_owner', tenantId };
    }
    await this.assertActiveStaff(tenantId, userId);
    return { role: 'employee', tenantId };
  }
}

export const merchantStaffService = new MerchantStaffService();
