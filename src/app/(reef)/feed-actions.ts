'use server';
// خلاصة بيان الرئيسية (اليوم 27، BAYAN-HOME-FEED-001) — تركيب على مستوى الصفحة بين نطاقين
// (bayan/catalog)، نفس نمط orders.service.ts الذي يستدعي catalogService مباشرة (ADR-021).
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3) — bayanService.listFeed() أصبح
// يُعيد `products` جاهزة الآن (JOIN واحد داخل bayan.repository.ts، راجع تعليقه) — رحلة
// catalogService.getProductsByIds المنفصلة هنا حُذفت (كانت رحلة شبكة ثالثة متتالية). الاستيرادان
// الآخران لـcatalogService (getProductByIdAction/getProductsByIdsAction أدناه) يبقيان بلا تغيير —
// يخدمان Product/Recipe Bottom Sheet عند النقر (طلب عند الحاجة، لا علاقة له بتحميل الخلاصة نفسه).

import { bayanService } from '@/core/modules/bayan/bayan.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { khalilService } from '@/core/kernel/khalil/service';
import type { PostType, RecipeLink } from '@/core/modules/bayan/types';
import type { District, Product } from '@/core/modules/catalog/types';
import type { World } from '@/core/kernel/khalil/types';

export interface FeedPageResult {
  posts: Awaited<ReturnType<typeof bayanService.listFeed>>['posts'];
  hasMore: boolean;
  products: Product[];
}

export async function loadFeedPageAction(options: { postTypes?: PostType[]; offset: number }): Promise<FeedPageResult> {
  const page = await bayanService.listFeed(options);
  return { posts: page.posts, hasMore: page.hasMore, products: page.products };
}

// اليوم 28 (BAYAN-HOME-FEED-001) — يغذّي Product/Recipe Bottom Sheet عند النقر على صورة منشور
// مرتبطة (post_media.link). نفس مبرر الأعلى: الخلاصة (طبقة العرض) تحتاج بيانات Product الكاملة،
// بيان نفسه لا يحتاجها لمنطقه الخاص.

export async function getProductByIdAction(id: string): Promise<Product | null> {
  return catalogService.getProductById(id);
}

export async function getProductsByIdsAction(ids: string[]): Promise<Product[]> {
  return catalogService.getProductsByIds(ids);
}

// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 4) — يغذّي ProductSheetContent.tsx
// (Product Bottom Sheet داخل الخلاصة) لحل هوية الحي البصرية (neighborhood-identity-registry.ts)
// لنفس المنتج — كانت مطبَّقة فقط على صفحة المنتج الكاملة (product/[id]/page.tsx)، لا الشيت. تمريرة
// رقيقة لـcatalogService.getDistricts() (TASK-18 — كانت listCategories()/جدول categories القديم،
// product.categoryId فارغ لكل المنتجات المستورَدة TASK-17؛ الحي الحقيقي عبر product.districtId).
export async function getDistrictsAction(): Promise<District[]> {
  return catalogService.getDistricts();
}

// تمريرة رقيقة لـ bayanService.scaleRecipeQuantities (قياس خطي بسيط، اليوم 23) — تُستدعى من العميل
// عند كل تغيير لعدّاد عدد أفراد العائلة، نفس نمط ProductOptions.tsx الذي يستدعي calculatePriceAction
// عند كل تغيير اختيار (مصدر حقيقة واحد للحساب في طبقة الخدمة، لا تكرار للمنطق في العميل).
export async function scaleRecipeIngredientsAction(
  recipe: RecipeLink,
  familySize: number
): Promise<Array<{ productId: string; quantity: number }>> {
  return bayanService.scaleRecipeQuantities(recipe, familySize);
}

// اليوم 29 (BAYAN-HOME-FEED-001) — يغذّي مبدّل العوالم (WorldSwitcher.tsx، مركَّب الآن داخل
// Header.tsx منذ CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01). تمريرة رقيقة لـ
// khalilService.listActiveWorlds() الموجودة أصلاً منذ اليوم 20 (أول مستهلك واجهة لها).
export async function listActiveWorldsAction(): Promise<World[]> {
  return khalilService.listActiveWorlds();
}
