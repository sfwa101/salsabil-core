'use server';
// خلاصة بيان الرئيسية (اليوم 27، BAYAN-HOME-FEED-001) — تركيب على مستوى الصفحة بين نطاقين
// (bayan/catalog)، نفس نمط orders.service.ts الذي يستدعي catalogService مباشرة (ADR-021). يبقى هنا
// لا داخل bayan.service.ts نفسه: bayan لا يحتاج معرفة تفاصيل Product الكاملة لمنطقه الخاص (يكتفي
// بـ productIds)، فحل المنتجات الكاملة مسؤولية طبقة العرض التي تحتاجها فعلاً.

import { bayanService } from '@/core/modules/bayan/bayan.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { khalilService } from '@/core/kernel/khalil/service';
import type { PostType, RecipeLink } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import type { World } from '@/core/kernel/khalil/types';

export interface FeedPageResult {
  posts: Awaited<ReturnType<typeof bayanService.listFeed>>['posts'];
  hasMore: boolean;
  products: Product[];
}

export async function loadFeedPageAction(options: { postType?: PostType; offset: number }): Promise<FeedPageResult> {
  const page = await bayanService.listFeed(options);

  const productIds = Array.from(new Set(page.posts.flatMap((p) => p.productIds)));
  const products = productIds.length > 0 ? await catalogService.getProductsByIds(productIds) : [];

  return { posts: page.posts, hasMore: page.hasMore, products };
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

// تمريرة رقيقة لـ bayanService.scaleRecipeQuantities (قياس خطي بسيط، اليوم 23) — تُستدعى من العميل
// عند كل تغيير لعدّاد عدد أفراد العائلة، نفس نمط ProductOptions.tsx الذي يستدعي calculatePriceAction
// عند كل تغيير اختيار (مصدر حقيقة واحد للحساب في طبقة الخدمة، لا تكرار للمنطق في العميل).
export async function scaleRecipeIngredientsAction(
  recipe: RecipeLink,
  familySize: number
): Promise<Array<{ productId: string; quantity: number }>> {
  return bayanService.scaleRecipeQuantities(recipe, familySize);
}

// اليوم 29 (BAYAN-HOME-FEED-001) — يغذّي مبدّل العوالم في FeedTopBar. تمريرة رقيقة لـ
// khalilService.listActiveWorlds() الموجودة أصلاً منذ اليوم 20 (أول مستهلك واجهة لها).
export async function listActiveWorldsAction(): Promise<World[]> {
  return khalilService.listActiveWorlds();
}
