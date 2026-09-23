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

const createDistrictSchema = z.object({ slug: slugSchema, nameAr: nameArSchema, tagline: z.string().trim().nullable().optional(), sortOrder: sortOrderSchema });

export async function createDistrictAction(input: { slug: string; nameAr: string; tagline?: string | null; sortOrder: number }): Promise<ActionResult> {
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

const updateDistrictSchema = z.object({
  id: uuidSchema,
  slug: slugSchema.optional(),
  nameAr: nameArSchema,
  tagline: z.string().trim().nullable().optional(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export async function updateDistrictAction(input: {
  id: string;
  slug?: string;
  nameAr: string;
  tagline?: string | null;
  sortOrder: number;
  isActive: boolean;
}): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateDistrictSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateDistrict(
      parsed.data.id,
      { slug: parsed.data.slug, nameAr: parsed.data.nameAr, tagline: parsed.data.tagline, sortOrder: parsed.data.sortOrder, isActive: parsed.data.isActive },
      { id: session.userId, role: session.role }
    );
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function deleteDistrictAction(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: 'معرّف غير صحيح' };

  try {
    const result = await catalogService.deleteDistrict(parsed.data, { id: session.userId, role: session.role });
    if (!result.deleted) return { error: result.reason };
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

const updateCategorySchema = z.object({ id: uuidSchema, slug: slugSchema.optional(), nameAr: nameArSchema, sortOrder: sortOrderSchema, isActive: z.boolean() });

export async function updateCategoryAction(input: { id: string; slug?: string; nameAr: string; sortOrder: number; isActive: boolean }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateCatalogCategory(
      parsed.data.id,
      { slug: parsed.data.slug, nameAr: parsed.data.nameAr, sortOrder: parsed.data.sortOrder, isActive: parsed.data.isActive },
      { id: session.userId, role: session.role }
    );
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function moveCategoryAction(input: { id: string; newDistrictId: string }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = z.object({ id: uuidSchema, newDistrictId: uuidSchema }).safeParse(input);
  if (!parsed.success) return { error: 'مدخلات غير صحيحة' };

  try {
    await catalogService.moveCatalogCategory(parsed.data.id, parsed.data.newDistrictId, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: 'معرّف غير صحيح' };

  try {
    const result = await catalogService.deleteCatalogCategory(parsed.data, { id: session.userId, role: session.role });
    if (!result.deleted) return { error: result.reason };
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

const updateSubcategorySchema = z.object({ id: uuidSchema, slug: slugSchema.optional(), nameAr: nameArSchema, sortOrder: sortOrderSchema, isActive: z.boolean() });

export async function updateSubcategoryAction(input: { id: string; slug?: string; nameAr: string; sortOrder: number; isActive: boolean }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = updateSubcategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateCatalogSubcategory(
      parsed.data.id,
      { slug: parsed.data.slug, nameAr: parsed.data.nameAr, sortOrder: parsed.data.sortOrder, isActive: parsed.data.isActive },
      { id: session.userId, role: session.role }
    );
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function moveSubcategoryAction(input: { id: string; newCategoryId: string }): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = z.object({ id: uuidSchema, newCategoryId: uuidSchema }).safeParse(input);
  if (!parsed.success) return { error: 'مدخلات غير صحيحة' };

  try {
    await catalogService.moveCatalogSubcategory(parsed.data.id, parsed.data.newCategoryId, { id: session.userId, role: session.role });
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function deleteSubcategoryAction(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: 'معرّف غير صحيح' };

  try {
    const result = await catalogService.deleteCatalogSubcategory(parsed.data, { id: session.userId, role: session.role });
    if (!result.deleted) return { error: result.reason };
    revalidatePath('/admin/taxonomy');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
