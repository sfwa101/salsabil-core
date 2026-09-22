// src/core/modules/bayan/bayan.repository.ts
// الاتصال بقاعدة البيانات الخاص ببيان — لا منطق أعمال هنا، فقط قراءة/كتابة
//
// posts/post_media/post_products: RLS النمط 1 (قراءة عامة للمنشورات المنشورة، كتابة عبر service_role
// فقط) — نفس نمط categories/products، عكس worlds/user_personas (النمط 2 المقفول بالكامل، ADR-018).
// لذلك: دوال القراءة العامة (الخلاصة) عبر عميل anon، ودوال الإدارة (تشمل قراءة المسودات) عبر service_role.

import { supabase } from '../../kernel/database/supabase-client';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type {
  Post,
  PostMedia,
  PostProductLink,
  PostMediaLink,
  PostType,
  VideoSource,
  CreatePostInput,
  UpdatePostInput,
  CreatePostMediaInput,
  PostMediaDraft,
} from './types';
import type { Product, ProductOption } from '../catalog/types';

interface PostRow {
  id: string;
  world_scope: string;
  category_id: string;
  post_type: PostType;
  caption: string | null;
  is_published: boolean;
  priority: number;
  // DD-024 — scripts/2026-09-22-dd024-bayan-post-shapes.sql
  video_url: string | null;
  video_source: string | null;
  created_at: string;
  updated_at: string;
}

interface PostMediaRow {
  id: string;
  post_id: string;
  image_url: string;
  display_order: number;
  link: PostMediaLink;
  created_at: string;
}

interface PostProductRow {
  id: string;
  post_id: string;
  product_id: string;
  display_order: number;
}

// نفس أعمدة ProductRow في catalog.repository.ts حرفياً — مُكرَّرة عمداً هنا لا مستوردة منها
// (dependency-cruiser يمنع أي repository.ts من استيراد repository.ts نطاق آخر،
// no-repository-cross-import، docs/ARCHITECTURE.md §3.1). نفس نمط EmbeddedProductRow في
// cart.repository.ts حرفياً — راجع تعليقه هناك لنفس المبرر الكامل.
interface EmbeddedProductRow {
  id: string;
  category_id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  unit: string;
  image_url: string | null;
  options: ProductOption[];
  is_active: boolean;
  created_at: string;
}

interface PostProductWithProductRow extends PostProductRow {
  products: EmbeddedProductRow;
}

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    worldScope: row.world_scope,
    categoryId: row.category_id,
    postType: row.post_type,
    caption: row.caption ?? undefined,
    isPublished: row.is_published,
    priority: row.priority,
    // video_source بلا CHECK قاعدة بيانات (راجع تعليق Migration) — يُوثَق بالقيمة الخام دون تحقق هنا،
    // نفس فلسفة PostMediaLink (jsonb) أدناه. مستهلكوه (ReelsDataSource) يتعاملون مع قيمة غير متوقَّعة
    // بالاستبعاد الآمن، لا بافتراض صحتها.
    videoUrl: row.video_url ?? undefined,
    videoSource: (row.video_source as VideoSource | null) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPostMedia(row: PostMediaRow): PostMedia {
  return {
    id: row.id,
    postId: row.post_id,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
    link: row.link,
    createdAt: row.created_at,
  };
}

function toPostProductLink(row: PostProductRow): PostProductLink {
  return {
    id: row.id,
    postId: row.post_id,
    productId: row.product_id,
    displayOrder: row.display_order,
  };
}

function toEmbeddedProduct(row: EmbeddedProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    basePrice: row.base_price,
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    options: row.options ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class BayanRepository {
  // -- قراءة عامة (الخلاصة، anon، تعتمد على RLS is_published = true) --

  async listPublishedPosts(options: { postTypes?: PostType[]; offset: number; limit: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    let query = supabase
      .from('posts')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(options.offset, options.offset + options.limit); // نطلب صفاً إضافياً واحداً لمعرفة hasMore

    // مصفوفة (حتى الفارغة) = فلتر صريح؛ undefined فقط = بلا فلتر. مصفوفة فارغة تُعيد .in() نتيجة
    // فارغة بشكل صحيح (تبويب فُعِّل UI له لكن كل أنواعه مُعطَّلة في content-type-registry.ts).
    if (options.postTypes) {
      query = query.in('post_type', options.postTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data as PostRow[];
    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    return { posts: page.map(toPost), hasMore };
  }

  async findPostMediaByPostIds(postIds: string[]): Promise<PostMedia[]> {
    if (postIds.length === 0) return [];
    const { data, error } = await supabase.from('post_media').select('*').in('post_id', postIds).order('display_order');
    if (error) throw error;
    return (data as PostMediaRow[]).map(toPostMedia);
  }

  async findPostProductsByPostIds(postIds: string[]): Promise<PostProductLink[]> {
    if (postIds.length === 0) return [];
    const { data, error } = await supabase.from('post_products').select('*').in('post_id', postIds).order('display_order');
    if (error) throw error;
    return (data as PostProductRow[]).map(toPostProductLink);
  }

  // FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3) — نفس نمط
  // cart.repository.ts.findItemsWithProducts حرفياً: استعلام واحد مُجمَّع (JOIN حقيقي عبر FK قائم
  // post_products.product_id → products.id) بدل findPostProductsByPostIds ثم استعلام منفصل لاحق
  // (catalogService.getProductsByIds في feed-actions.ts) — يدمج رحلتي شبكة متتاليتين في واحدة.
  // مُستخدَمة حصراً في bayanService.listFeed() (الخلاصة العامة)؛ findPostProductsByPostIds أعلاه
  // تبقى كما هي لمستهلكها الوحيد الآخر (bayanService.getPostProducts، لوحة إدارة بيان — تحتاج
  // معرّفات فقط، لا كائن Product كاملاً).
  async findPostProductsWithProductsByPostIds(
    postIds: string[]
  ): Promise<Array<{ postId: string; productId: string; displayOrder: number; product: Product }>> {
    if (postIds.length === 0) return [];
    const { data, error } = await supabase
      .from('post_products')
      .select('*, products(*)')
      .in('post_id', postIds)
      .order('display_order');
    if (error) throw error;
    return (data as PostProductWithProductRow[]).map((row) => ({
      postId: row.post_id,
      productId: row.product_id,
      displayOrder: row.display_order,
      product: toEmbeddedProduct(row.products),
    }));
  }

  // -- إدارة (platform_admin، service_role، تشمل المسودات) --

  async findAllPosts(): Promise<Post[]> {
    const { data, error } = await supabaseAdmin.from('posts').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PostRow[]).map(toPost);
  }

  async findPostById(id: string): Promise<Post | null> {
    const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPost(data as PostRow) : null;
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        world_scope: input.worldScope,
        category_id: input.categoryId,
        post_type: input.postType,
        caption: input.caption ?? null,
        priority: input.priority ?? 0,
        video_url: input.videoUrl ?? null,
        video_source: input.videoSource ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPost(data as PostRow);
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post> {
    const patch: Record<string, unknown> = {};
    if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    if (input.postType !== undefined) patch.post_type = input.postType;
    if (input.caption !== undefined) patch.caption = input.caption;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.isPublished !== undefined) patch.is_published = input.isPublished;
    if (input.videoUrl !== undefined) patch.video_url = input.videoUrl;
    if (input.videoSource !== undefined) patch.video_source = input.videoSource;

    const { data, error } = await supabaseAdmin.from('posts').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return toPost(data as PostRow);
  }

  async deletePost(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
    if (error) throw error;
  }

  async findPostMediaByPostId(postId: string): Promise<PostMedia[]> {
    const { data, error } = await supabaseAdmin.from('post_media').select('*').eq('post_id', postId).order('display_order');
    if (error) throw error;
    return (data as PostMediaRow[]).map(toPostMedia);
  }

  async createPostMedia(input: CreatePostMediaInput): Promise<PostMedia> {
    const { data, error } = await supabaseAdmin
      .from('post_media')
      .insert({
        post_id: input.postId,
        image_url: input.imageUrl,
        display_order: input.displayOrder,
        link: input.link,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPostMedia(data as PostMediaRow);
  }

  async deletePostMedia(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('post_media').delete().eq('id', id);
    if (error) throw error;
  }

  // نفس نمط replacePostProducts (حذف كامل ثم إدراج) — لوحة إدارة بيان (اليوم 24) ترسل دائماً
  // القائمة الكاملة الحالية للصور عند التعديل، لا فروقاً جزئية
  async replacePostMedia(postId: string, media: PostMediaDraft[]): Promise<void> {
    const { error: deleteError } = await supabaseAdmin.from('post_media').delete().eq('post_id', postId);
    if (deleteError) throw deleteError;

    if (media.length === 0) return;
    const rows = media.map((m, index) => ({ post_id: postId, image_url: m.imageUrl, display_order: index, link: m.link }));
    const { error: insertError } = await supabaseAdmin.from('post_media').insert(rows);
    if (insertError) throw insertError;
  }

  async replacePostProducts(postId: string, productIds: string[]): Promise<void> {
    const { error: deleteError } = await supabaseAdmin.from('post_products').delete().eq('post_id', postId);
    if (deleteError) throw deleteError;

    if (productIds.length === 0) return;
    const rows = productIds.map((productId, index) => ({ post_id: postId, product_id: productId, display_order: index }));
    const { error: insertError } = await supabaseAdmin.from('post_products').insert(rows);
    if (insertError) throw insertError;
  }
}

export const bayanRepository = new BayanRepository();
