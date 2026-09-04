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
  CreatePostInput,
  UpdatePostInput,
  CreatePostMediaInput,
} from './types';

interface PostRow {
  id: string;
  world_scope: string;
  category_id: string;
  post_type: PostType;
  caption: string | null;
  is_published: boolean;
  priority: number;
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

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    worldScope: row.world_scope,
    categoryId: row.category_id,
    postType: row.post_type,
    caption: row.caption ?? undefined,
    isPublished: row.is_published,
    priority: row.priority,
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

export class BayanRepository {
  // -- قراءة عامة (الخلاصة، anon، تعتمد على RLS is_published = true) --

  async listPublishedPosts(options: { postType?: PostType; offset: number; limit: number }): Promise<{ posts: Post[]; hasMore: boolean }> {
    let query = supabase
      .from('posts')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(options.offset, options.offset + options.limit); // نطلب صفاً إضافياً واحداً لمعرفة hasMore

    if (options.postType) {
      query = query.eq('post_type', options.postType);
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
