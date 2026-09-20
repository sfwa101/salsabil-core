'use server';
// §31 بند 8 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §12/§29 بند 15) — إدارة حي → قسم → قسم فرعي
// من لوحة الإدارة، بدل سكريبتات SQL يدوية لمرة واحدة. نفس نمط admin/catalog/actions.ts حرفياً
// (requireAdmin + zod + revalidatePath).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult = { success: true } | { error: string };

// نفس نمط التحقق من الـslug المستخدَم أصلاً في merchant.service.ts (SLUG_PATTERN) — اتساق عبر
// النطاقات لهذا المفهوم بالذات (معرّف نصي قابل للاستخدام في رابط URL).
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugSchema = z.string().trim().min(1, 'المعرّف (slug) مطلوب').regex(SLUG_PATTERN, 'المعرّف يجب أن يكون حروفاً/أرقاماً إنجليزية صغيرة وشرطات فقط');
const nameArSchema = z.string().trim().min(1, 'الاسم مطلوب');
const sortOrderSchema = z.coerce.number().int().min(0);

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error('الجلسة غير صالحة — سجّل الدخول مجدداً');
  return session;
}

const createDistrictSchema = z.object({ slug: slugSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema });

export async function createDistrictAction(input: { slug: string; nameAr: string; sortOrder: number }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = createDistrictSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.createDistrict(parsed.data, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const updateDistrictSchema = z.object({ id: uuidSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema, isActive: z.boolean() });

export async function updateDistrictAction(input: { id: string; nameAr: string; sortOrder: number; isActive: boolean }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateDistrictSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateDistrict(parsed.data.id, { nameAr: parsed.data.nameAr, sortOrder: parsed.data.sortOrder, isActive: parsed.data.isActive }, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const createCategorySchema = z.object({ districtId: uuidSchema, slug: slugSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema });

export async function createCategoryAction(input: { districtId: string; slug: string; nameAr: string; sortOrder: number }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.createCatalogCategory(parsed.data, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const updateCategorySchema = z.object({ id: uuidSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema });

export async function updateCategoryAction(input: { id: string; nameAr: string; sortOrder: number }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateCatalogCategory(parsed.data.id, { nameAr: parsed.data.nameAr, sortOrder: parsed.data.sortOrder }, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const createSubcategorySchema = z.object({ categoryId: uuidSchema, slug: slugSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema });

export async function createSubcategoryAction(input: { categoryId: string; slug: string; nameAr: string; sortOrder: number }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = createSubcategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.createCatalogSubcategory(parsed.data, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const updateSubcategorySchema = z.object({ id: uuidSchema, nameAr: nameArSchema, sortOrder: sortOrderSchema });

export async function updateSubcategoryAction(input: { id: string; nameAr: string; sortOrder: number }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateSubcategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateCatalogSubcategory(parsed.data.id, { nameAr: parsed.data.nameAr, sortOrder: parsed.data.sortOrder }, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
