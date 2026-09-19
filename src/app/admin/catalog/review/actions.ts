'use server';
// حسم صفوف قائمة مراجعة الاستيراد (CATALOG-IMPORT-WORKFLOW، ADR-031) — platform_admin حصراً.
// كل دالة تتحقق أولاً من جلسة الإدارة، نفس نمط src/app/admin/catalog/actions.ts.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult = { success: true } | { error: string };

const resolveAsNewSchema = z.object({
  queueId: uuidSchema,
  categoryId: uuidSchema,
  name: z.string().trim().min(1, 'اسم المنتج مطلوب'),
  description: z.string().trim().optional(),
  basePrice: z.number().nonnegative('سعر البيع يجب ألا يكون سالباً'),
  unit: z.string().trim().min(1, 'الوحدة مطلوبة'),
  imageUrl: z.union([z.url('رابط صورة غير صحيح'), z.literal('')]).optional(),
});

export type ResolveAsNewInput = z.infer<typeof resolveAsNewSchema>;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('الجلسة غير صالحة — سجّل الدخول مجدداً');
  return session;
}

export async function resolveReviewQueueAsNewAction(input: ResolveAsNewInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = resolveAsNewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    const { queueId, ...masterInput } = parsed.data;
    await catalogService.resolveReviewQueueAsNew(
      queueId,
      { ...masterInput, imageUrl: masterInput.imageUrl || undefined },
      { id: session.userId, role: session.role }
    );
    revalidatePath('/admin/catalog/review');
    revalidatePath('/admin/catalog');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const resolveAsMergeSchema = z.object({ queueId: uuidSchema, masterItemId: uuidSchema });

export async function resolveReviewQueueAsMergeAction(queueId: string, masterItemId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = resolveAsMergeSchema.safeParse({ queueId, masterItemId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    await catalogService.resolveReviewQueueAsMerge(parsed.data.queueId, parsed.data.masterItemId, {
      id: session.userId,
      role: session.role,
    });
    revalidatePath('/admin/catalog/review');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
