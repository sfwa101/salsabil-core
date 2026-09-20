'use server';
// §31 بند 7 — owner يضيف/يعطّل موظفي متجره. Backend جاهز بالكامل (merchantStaffService، TASK-14) —
// هذا أول مستهلك واجهة له. عزل صريح: فقط merchant_owner يصل هذه الأفعال (نفس تحقق
// merchantStaffService.addStaff/setStaffActiveStatus الداخلي، مُكرَّر هنا كطبقة أولى قبل استدعاء
// الخدمة — دفاع مزدوج، لا اعتماد على طبقة واحدة فقط).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { khalilService } from '@/core/kernel/khalil/service';
import { merchantStaffService } from '@/core/modules/merchantStaff/merchantStaff.service';
import { generateTempPassword } from '@/core/kernel/security/password';
import { egyptianPhoneSchema } from '@/core/kernel/validation/schemas';

type AddStaffResult = { success: true; tempPassword: string } | { error: string };
type ToggleResult = { success: true } | { error: string };

async function requireOwnerSession() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId || session.role !== 'merchant_owner') return null;
  return session;
}

const addStaffInputSchema = z.object({
  fullName: z.string().trim().min(2, 'الاسم قصير جداً'),
  phone: egyptianPhoneSchema,
});

// يُنشئ حساباً للموظف إن لم يكن موجوداً (findOrCreateCustomerByPhone — نفس الدالة المستخدَمة أصلاً
// لعملاء Checkout، تنشئ بدور 'customer'؛ merchantStaffService.addStaff يرفعه لاحقاً إلى 'employee')،
// يضبط له كلمة مرور مؤقتة جديدة دائماً (نفس نمط scripts/create-merchant-account.ts — تُعرَض هنا
// مرة واحدة فقط للمالك ليُبلِّغها للموظف خارج النظام، لا تُخزَّن نصاً صريحاً في أي مكان بعد هذا الرد).
export async function addStaffAction(input: { fullName: string; phone: string }): Promise<AddStaffResult> {
  const session = await requireOwnerSession();
  if (!session) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = addStaffInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    const user = await khalilService.findOrCreateCustomerByPhone(parsed.data.fullName, parsed.data.phone);
    const tempPassword = generateTempPassword();
    await khalilService.setTemporaryPassword(user.id, tempPassword);
    await merchantStaffService.addStaff({ role: session.role, tenantId: session.tenantId! }, { tenantId: session.tenantId!, userId: user.id });
    revalidatePath('/merchant/staff');
    return { success: true, tempPassword };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function toggleStaffStatusAction(staffId: string, isActive: boolean): Promise<ToggleResult> {
  const session = await requireOwnerSession();
  if (!session) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  try {
    await merchantStaffService.setStaffActiveStatus({ role: session.role, tenantId: session.tenantId! }, staffId, isActive);
    revalidatePath('/merchant/staff');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

// غلاف بلا قيمة إرجاع — لاستخدام مباشر كـ<form action={...}> (Next.js يتطلب Promise<void>)، بلا
// حاجة لمكوّن عميل منفصل لمجرد زر تبديل بسيط. الأخطاء هنا صامتة عمداً (نفس تبسيط V1 لهذا الزر
// تحديداً) — toggleStaffStatusAction نفسها تبقى مُصدَّرة لأي مستدعٍ يحتاج رسالة الخطأ الفعلية لاحقاً.
export async function toggleStaffStatusFormAction(staffId: string, isActive: boolean): Promise<void> {
  await toggleStaffStatusAction(staffId, isActive);
}
