// src/core/modules/bayan/bayan.service.ts
// منطق الأعمال الخاص ببيان — لا استدعاء قاعدة بيانات مباشر هنا، فقط عبر bayanRepository
// (واستدعاء khalilService لخدمة عالم individuals — استيراد service-to-service بين نطاقين، نفس نمط
// orders.service.ts الذي يستدعي khalilService/cartService/catalogService مباشرة)

import { bayanRepository } from './bayan.repository';
import { khalilService } from '../../kernel/khalil/service';
import type {
  Post,
  PostMedia,
  PostType,
  CreatePostInput,
  UpdatePostInput,
  CreatePostMediaInput,
  PostMediaDraft,
  ListFeedOptions,
  FeedPage,
  RecipeLink,
} from './types';

const DEFAULT_FEED_PAGE_SIZE = 10;
const INDIVIDUALS_WORLD_SLUG = 'individuals';

export class BayanService {
  /**
   * معرّف عالم "الأفراد" الحقيقي من جدول worlds (خليل، اليوم 19) — لا يوجد بديل آخر منشور اليوم.
   * ترمي خطأً صريحاً إن لم يوجد (نفس نمط ensureIndividualPersona، ADR-019) بدل افتراض صامت.
   */
  async getIndividualsWorldId(): Promise<string> {
    const worlds = await khalilService.listActiveWorlds();
    const individuals = worlds.find((w) => w.slug === INDIVIDUALS_WORLD_SLUG);
    if (!individuals) {
      throw new Error(`عالم "${INDIVIDUALS_WORLD_SLUG}" غير موجود في worlds — راجع scripts/day19-context-engine-schema.sql`);
    }
    return individuals.id;
  }

  /**
   * الخلاصة العامة — منشورات منشورة فقط، مع كل صورها ومنتجاتها المرتبطة، صفحة واحدة في كل نداء.
   *
   * FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3) — findPostProductsByPostIds
   * استُبدلت بـfindPostProductsWithProductsByPostIds (JOIN واحد يجلب المنتج كاملاً مع الرابط، نفس
   * نمط cart.service.ts.buildSummary) — يُلغي رحلة catalogService.getProductsByIds المنفصلة التي
   * كانت تُنفَّذ لاحقاً في feed-actions.ts، فيقلّص 3 رحلات متتالية إلى 2.
   */
  async listFeed(options: ListFeedOptions = {}): Promise<FeedPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_FEED_PAGE_SIZE;

    const { posts, hasMore } = await bayanRepository.listPublishedPosts({ postTypes: options.postTypes, offset, limit });
    if (posts.length === 0) return { posts: [], hasMore, products: [] };

    const postIds = posts.map((p) => p.id);
    const [media, productLinks] = await Promise.all([
      bayanRepository.findPostMediaByPostIds(postIds),
      bayanRepository.findPostProductsWithProductsByPostIds(postIds),
    ]);

    const detailed = posts.map((post) => ({
      ...post,
      media: media.filter((m) => m.postId === post.id),
      productIds: productLinks.filter((pl) => pl.postId === post.id).map((pl) => pl.productId),
    }));

    const productsById = new Map(productLinks.map((pl) => [pl.productId, pl.product]));

    return { posts: detailed, hasMore, products: Array.from(productsById.values()) };
  }

  /**
   * يحسب الكميات المقترحة لمكوّنات وصفة عند تغيير عدد أفراد العائلة — قياس خطي بسيط حسب
   * baseFamilySize/baseQuantity، مقرَّب لأقرب عدد صحيح، بحد أدنى 1 (لا كمية صفرية لمكوّن أساسي).
   */
  scaleRecipeQuantities(recipe: RecipeLink, familySize: number): Array<{ productId: string; quantity: number }> {
    if (familySize <= 0) {
      throw new Error('عدد أفراد العائلة يجب أن يكون أكبر من صفر');
    }
    return recipe.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      quantity: Math.max(1, Math.round((ingredient.baseQuantity * familySize) / recipe.baseFamilySize)),
    }));
  }

  // -- إدارة (platform_admin) --

  async listAllPosts(): Promise<Post[]> {
    return bayanRepository.findAllPosts();
  }

  async getPostById(id: string): Promise<Post | null> {
    return bayanRepository.findPostById(id);
  }

  async getPostMedia(postId: string): Promise<PostMedia[]> {
    return bayanRepository.findPostMediaByPostId(postId);
  }

  /**
   * منتجات الرف الأفقي المرتبط بمنشور واحد، بترتيبها — يعيد استخدام findPostProductsByPostIds
   * الجماعية الموجودة أصلاً لـlistFeed (اليوم 23)، لا دالة repository جديدة. آمن للاستدعاء على
   * مسودة (post_products بلا عمود is_published خاص به، RLS النمط 1 العام أصلاً — ADR-021).
   */
  async getPostProducts(postId: string): Promise<string[]> {
    const links = await bayanRepository.findPostProductsByPostIds([postId]);
    return links.map((l) => l.productId);
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    return bayanRepository.createPost(input);
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post> {
    return bayanRepository.updatePost(id, input);
  }

  async deletePost(id: string): Promise<void> {
    return bayanRepository.deletePost(id);
  }

  async addPostMedia(input: CreatePostMediaInput): Promise<PostMedia> {
    return bayanRepository.createPostMedia(input);
  }

  async removePostMedia(id: string): Promise<void> {
    return bayanRepository.deletePostMedia(id);
  }

  async replacePostMedia(postId: string, media: PostMediaDraft[]): Promise<void> {
    return bayanRepository.replacePostMedia(postId, media);
  }

  async setPostProducts(postId: string, productIds: string[]): Promise<void> {
    return bayanRepository.replacePostProducts(postId, productIds);
  }
}

export const bayanService = new BayanService();
