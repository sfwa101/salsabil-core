// src/core/modules/bayan/bayan.repository.test.ts
// اختبارات وحدة (mocked) — تموّه عميلي supabase/supabaseAdmin مباشرة، نفس نمط
// src/core/kernel/khalil/khalil.repository.test.ts (اليوم 20) لنفس السبب: لا طبقة service أعلى
// بعد يستحق تمويهها بنمط service.test.ts القائم في هذه اللحظة من اليوم 23.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../kernel/database/supabase-client', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('../../kernel/database/supabase-admin-client', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

const { bayanRepository } = await import('./bayan.repository');
const { supabase } = await import('../../kernel/database/supabase-client');
const { supabaseAdmin } = await import('../../kernel/database/supabase-admin-client');

/**
 * بناء سلسلة استعلام Supabase مُموَّهة — تدعم .select/.eq/.in/.order/.insert/.update/.delete
 * (تُعيد نفسها للتسلسل)، وتنتهي إما بـ .single()/.maybeSingle() الصريحتين أو بـ await مباشر
 * (نمط listPublishedPosts بعد .range()) عبر then(). نفس نمط khalil.repository.test.ts.
 */
function makeQueryBuilder(terminal: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn(async () => terminal),
    maybeSingle: vi.fn(async () => terminal),
    then: (onFulfilled: (value: typeof terminal) => unknown) => Promise.resolve(terminal).then(onFulfilled),
  };
  return builder;
}

const postRow = {
  id: 'post-1',
  world_scope: 'world-1',
  category_id: 'cat-1',
  post_type: 'post',
  caption: 'منشور اختبار',
  is_published: true,
  priority: 5,
  created_at: '2026-09-05T00:00:00.000Z',
  updated_at: '2026-09-05T00:00:00.000Z',
};

const mediaRow = {
  id: 'media-1',
  post_id: 'post-1',
  image_url: 'https://example.com/a.jpg',
  display_order: 0,
  link: { type: 'none' },
  created_at: '2026-09-05T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BayanRepository.listPublishedPosts', () => {
  it('يعيد hasMore=false إذا كانت النتائج أقل من الحد', async () => {
    const builder = makeQueryBuilder({ data: [postRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await bayanRepository.listPublishedPosts({ offset: 0, limit: 10 });

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(result.hasMore).toBe(false);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({ id: 'post-1', worldScope: 'world-1', postType: 'post', priority: 5 });
  });

  it('يعيد hasMore=true ويقصّ الصف الإضافي عندما تتجاوز النتائج الحد', async () => {
    const extraRow = { ...postRow, id: 'post-2' };
    const builder = makeQueryBuilder({ data: [postRow, extraRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await bayanRepository.listPublishedPosts({ offset: 0, limit: 1 });

    expect(result.hasMore).toBe(true);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe('post-1');
  });

  it('يمرّر فلتر post_type (مصفوفة) عند تحديده', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await bayanRepository.listPublishedPosts({ postTypes: ['reel'], offset: 0, limit: 10 });

    expect(builder.in).toHaveBeenCalledWith('post_type', ['reel']);
  });

  it('يدعم فلتر بأكثر من نوع معاً (تبويب مُجمَّع مثل "منتجات")', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await bayanRepository.listPublishedPosts({ postTypes: ['product_highlight', 'offer'], offset: 0, limit: 10 });

    expect(builder.in).toHaveBeenCalledWith('post_type', ['product_highlight', 'offer']);
  });

  it('لا يستدعي .in() إطلاقاً عند عدم تمرير postTypes (بلا فلتر، تبويب "الكل")', async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await bayanRepository.listPublishedPosts({ offset: 0, limit: 10 });

    expect(builder.in).not.toHaveBeenCalled();
  });
});

describe('BayanRepository.findPostMediaByPostIds', () => {
  it('يعيد مصفوفة فارغة بلا استعلام إذا كانت قائمة postIds فارغة', async () => {
    const result = await bayanRepository.findPostMediaByPostIds([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('يحوّل صفوف الصور لشكل PostMedia (camelCase)', async () => {
    const builder = makeQueryBuilder({ data: [mediaRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await bayanRepository.findPostMediaByPostIds(['post-1']);

    expect(result[0]).toEqual({
      id: 'media-1',
      postId: 'post-1',
      imageUrl: 'https://example.com/a.jpg',
      displayOrder: 0,
      link: { type: 'none' },
      createdAt: '2026-09-05T00:00:00.000Z',
    });
  });
});

// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3) — نفس نمط
// cart.repository.test.ts.findItemsWithProducts: تحقُّق أن الاستعلام يطلب JOIN حقيقياً
// (select('*, products(*)')) ويحوّل الصف المُضمَّن لكائن Product كامل بلا رحلة إضافية.
describe('BayanRepository.findPostProductsWithProductsByPostIds', () => {
  it('يعيد مصفوفة فارغة بلا استعلام إذا كانت قائمة postIds فارغة', async () => {
    const result = await bayanRepository.findPostProductsWithProductsByPostIds([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('يطلب المنتج المُضمَّن عبر select واحد، ويحوّله لكائن Product كامل', async () => {
    const embeddedProductRow = {
      id: 'prod-1',
      post_id: 'post-1',
      product_id: 'prod-1',
      display_order: 0,
      products: {
        id: 'prod-1',
        category_id: 'cat-1',
        tenant_id: null,
        name: 'منتج اختبار',
        description: null,
        base_price: 50,
        unit: 'قطعة',
        image_url: null,
        options: [],
        is_active: true,
        created_at: '2026-09-05T00:00:00.000Z',
      },
    };
    const builder = makeQueryBuilder({ data: [embeddedProductRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await bayanRepository.findPostProductsWithProductsByPostIds(['post-1']);

    expect(builder.select).toHaveBeenCalledWith('*, products(*)');
    expect(result[0]).toEqual({
      postId: 'post-1',
      productId: 'prod-1',
      displayOrder: 0,
      product: {
        id: 'prod-1',
        categoryId: 'cat-1',
        tenantId: null,
        name: 'منتج اختبار',
        description: undefined,
        basePrice: 50,
        unit: 'قطعة',
        imageUrl: undefined,
        options: [],
        isActive: true,
        createdAt: '2026-09-05T00:00:00.000Z',
      },
    });
  });
});

describe('BayanRepository.createPost', () => {
  it('يستخدم supabaseAdmin (service_role) لا supabase العام', async () => {
    const builder = makeQueryBuilder({ data: postRow, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await bayanRepository.createPost({ worldScope: 'world-1', categoryId: 'cat-1', postType: 'post' });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('posts');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(builder.insert).toHaveBeenCalledWith({
      world_scope: 'world-1',
      category_id: 'cat-1',
      post_type: 'post',
      caption: null,
      priority: 0,
      video_url: null,
      video_source: null,
    });
  });
});

describe('BayanRepository.replacePostProducts', () => {
  it('يحذف الروابط القديمة أولاً، ولا يُدرج شيئاً إن كانت القائمة الجديدة فارغة', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await bayanRepository.replacePostProducts('post-1', []);

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it('يدرج الروابط الجديدة بترتيبها بعد الحذف', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValue(builder as never);

    await bayanRepository.replacePostProducts('post-1', ['prod-a', 'prod-b']);

    expect(builder.insert).toHaveBeenCalledWith([
      { post_id: 'post-1', product_id: 'prod-a', display_order: 0 },
      { post_id: 'post-1', product_id: 'prod-b', display_order: 1 },
    ]);
  });
});
