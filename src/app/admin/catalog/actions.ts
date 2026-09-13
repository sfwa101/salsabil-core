'use server';
// عمليات إدارة الكتالوج الأساسي (CATALOG-IMPORT-WORKFLOW، ADR-025) — كل دالة تتحقق أولاً من جلسة
// platform_admin فعلياً (getAdminSession)، نفس نمط src/app/admin/posts/actions.ts حرفياً.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult<T = undefined> = { success: true; data?: T } | { error: string };

const masterItemInputSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().trim().min(1, 'اسم المنتج مطلوب'),
  description: z.string().trim().optional(),
  basePrice: z.number().nonnegative('سعر البيع يجب ألا يكون سالباً'),
  unit: z.string().trim().min(1, 'الوحدة مطلوبة'),
  imageUrl: z.union([z.url('رابط صورة غير صحيح'), z.literal('')]).optional(),
});

export type MasterItemFormInput = z.infer<typeof masterItemInputSchema>;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('الجلسة غير صالحة — سجّل الدخول مجدداً');
  return session;
}

export async function createMasterItemAction(input: MasterItemFormInput): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = masterItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    const item = await catalogService.createMasterItem(
      { ...parsed.data, imageUrl: parsed.data.imageUrl || undefined },
      { id: session.userId, role: session.role }
    );
    revalidatePath('/admin/catalog');
    return { success: true, data: { id: item.id } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const updatePriceSchema = z.object({ id: uuidSchema, basePrice: z.number().nonnegative('سعر البيع يجب ألا يكون سالباً') });

export async function updateMasterItemPriceAction(id: string, basePrice: number): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }

  const parsed = updatePriceSchema.safeParse({ id, basePrice });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    await catalogService.updateMasterItemPrice(parsed.data.id, parsed.data.basePrice, { id: session.userId, role: session.role });
    revalidatePath('/admin/catalog');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
