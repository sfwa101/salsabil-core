'use server';
// §31 بند 9 — أفعال لوحة مكتب التوصيل: إنشاء رحلة من طلب جاهز، إضافة سائق، إسناد سائق لرحلة.
// إسناد يدوي بسيط بلا خوارزمية ترشيح (كما طلب §31 بند 9 صراحة).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { khalilService } from '@/core/kernel/khalil/service';
import { generateTempPassword } from '@/core/kernel/security/password';
import { egyptianPhoneSchema, uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult = { success: true } | { error: string };
type AddDriverResult = { success: true; tempPassword: string } | { error: string };

async function requireOffice() {
  const session = await getDeliverySession();
  if (!session) return null;
  const office = await deliveryService.getOfficeByOwnerId(session.userId);
  if (!office || !office.isActive) return null;
  return { session, office };
}

export async function createDeliveryJobAction(merchantSuborderId: string): Promise<ActionResult> {
  const ctx = await requireOffice();
  if (!ctx) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = uuidSchema.safeParse(merchantSuborderId);
  if (!parsed.success) return { error: 'معرّف طلب غير صحيح' };

  try {
    await deliveryService.createDeliveryJobFromSuborder(ctx.office.id, parsed.data, { id: ctx.session.userId, role: ctx.session.role });
    revalidatePath('/delivery/office/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const addDriverInputSchema = z.object({ fullName: z.string().trim().min(2, 'الاسم قصير جداً'), phone: egyptianPhoneSchema });

export async function addDriverAction(input: { fullName: string; phone: string }): Promise<AddDriverResult> {
  const ctx = await requireOffice();
  if (!ctx) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = addDriverInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    // نفس نمط merchant/staff/actions.ts.addStaffAction حرفياً — findOrCreateCustomerByPhone ثم
    // كلمة مرور مؤقتة جديدة تُعرَض مرة واحدة فقط.
    const user = await khalilService.findOrCreateCustomerByPhone(parsed.data.fullName, parsed.data.phone);
    const tempPassword = generateTempPassword();
    await khalilService.setTemporaryPassword(user.id, tempPassword);
    await deliveryService.addDriver(ctx.office.id, user.id, { id: ctx.session.userId, role: ctx.session.role });
    revalidatePath('/delivery/office/dashboard');
    return { success: true, tempPassword };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const assignDriverInputSchema = z.object({ jobId: uuidSchema, driverId: uuidSchema });

export async function assignDriverAction(input: { jobId: string; driverId: string }): Promise<ActionResult> {
  const ctx = await requireOffice();
  if (!ctx) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = assignDriverInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await deliveryService.assignDriverToJob(ctx.office.id, parsed.data.jobId, parsed.data.driverId, { id: ctx.session.userId, role: ctx.session.role });
    revalidatePath('/delivery/office/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
