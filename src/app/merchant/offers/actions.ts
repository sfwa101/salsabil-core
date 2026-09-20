'use server';
// §31 بند 5 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — Merchant Offer كواجهة تفاعلية: بحث في
// Product Library، إضافة منتج موجود للعروض، تعديل كمية/سعر توريد فردي. يفرض عزل المستأجرين عبر
// tenantId من الجلسة، لا من نموذج العميل (نفس نمط src/app/merchant/orders/actions.ts المجاور).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import type { MasterCatalogItem } from '@/core/modules/catalog/types';

type ActionResult = { success: true } | { error: string };

const MERCHANT_ACTOR_ROLES = ['merchant_owner', 'merchant_manager', 'employee'] as const;

async function requireMerchantActor() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId || !MERCHANT_ACTOR_ROLES.includes(session.role as (typeof MERCHANT_ACTOR_ROLES)[number])) {
    return null;
  }
  return session;
}

export async function searchMasterItemsAction(query: string): Promise<MasterCatalogItem[]> {
  const session = await requireMerchantActor();
  if (!session) return [];
  return catalogService.searchMasterItems(query);
}

const addOfferInputSchema = z.object({
  masterItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0),
  costPrice: z.coerce.number().min(0),
});

export async function addMerchantOfferAction(input: { masterItemId: string; quantity: number; costPrice: number }): Promise<ActionResult> {
  const session = await requireMerchantActor();
  if (!session) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = addOfferInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.addMerchantOfferFromMasterItem(
      session.tenantId!,
      parsed.data.masterItemId,
      parsed.data.quantity,
      parsed.data.costPrice,
      { id: session.userId, role: session.role }
    );
    revalidatePath('/merchant/offers');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const updateOfferInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0),
  costPrice: z.coerce.number().min(0),
});

export async function updateMerchantOfferAction(input: { productId: string; quantity: number; costPrice: number }): Promise<ActionResult> {
  const session = await requireMerchantActor();
  if (!session) return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };

  const parsed = updateOfferInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };

  try {
    await catalogService.updateMerchantOfferStock(
      session.tenantId!,
      parsed.data.productId,
      parsed.data.quantity,
      parsed.data.costPrice,
      { id: session.userId, role: session.role }
    );
    revalidatePath('/merchant/offers');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
