'use server';
// §31 بند 9 — أفعال لوحة السائق: تحديث حالة رحلة مُسنَدة له.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { DELIVERY_JOB_STATUSES } from '@/core/modules/delivery/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult = { success: true } | { error: string };

async function requireDriver() {
  const session = await getDeliverySession();
  if (!session) return null;
  const driver = await deliveryService.getDriverByUserId(session.userId);
  if (!driver) return null;
  return { session, driver };
}

const transitionSchema = z.object({ jobId: uuidSchema, toStatus: z.enum(DELIVERY_JOB_STATUSES) });

export async function transitionDeliveryJobAction(jobId: string, toStatus: string): Promise<ActionResult> {
  const ctx = await requireDriver();
  if (!ctx) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = transitionSchema.safeParse({ jobId, toStatus });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await deliveryService.transitionJobStatus(ctx.driver.id, parsed.data.jobId, parsed.data.toStatus, { id: ctx.session.userId, role: ctx.session.role });
    revalidatePath('/delivery/driver/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
