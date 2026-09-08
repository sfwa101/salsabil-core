// src/core/modules/bayan/service.test.ts
// اختبارات وحدة — تُموّه bayanRepository وkhalilService فقط؛ منطق bayan.service.ts نفسه حقيقي
// (نفس نمط src/core/kernel/khalil/service.test.ts)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Post, PostMedia, RecipeLink } from './types';
import type { World } from '../../kernel/khalil/types';
import type { Product } from '../catalog/types';

const individualsWorld: World = { id: 'world-1', slug: 'individuals', name: 'الأفراد', isActive: true, createdAt: new Date().toISOString() };

const post: Post = {
  id: 'post-1',
  worldScope: 'world-1',
  categoryId: 'cat-1',
  postType: 'post',
  isPublished: true,
  priority: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const media: PostMedia = {
  id: 'media-1',
  postId: 'post-1',
  imageUrl: 'https://example.com/a.jpg',
  displayOrder: 0,
  link: { type: 'none' },
  createdAt: new Date().toISOString(),
};

const product: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  tenantId: null,
  name: 'منتج اختبار',
  basePrice: 50,
  unit: 'قطعة',
  options: [],
  isActive: true,
  createdAt: new Date().toISOString(),
};

// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3): findPostProductsByPostIds
// استُبدلت بـfindPostProductsWithProductsByPostIds (JOIN واحد يُعيد المنتج كاملاً) في listFeed —
// راجع bayan.repository.ts/bayan.service.ts.
const productLinkWithProduct = { postId: 'post-1', productId: 'prod-1', displayOrder: 0, product };

vi.mock('./bayan.repository', () => ({
  bayanRepository: {
    listPublishedPosts: vi.fn(),
    findPostMediaByPostIds: vi.fn(),
    findPostProductsByPostIds: vi.fn(),
    findPostProductsWithProductsByPostIds: vi.fn(),
    findAllPosts: vi.fn(),
    findPostById: vi.fn(),
    findPostMediaByPostId: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    createPostMedia: vi.fn(),
    deletePostMedia: vi.fn(),
    replacePostProducts: vi.fn(),
  },
}));

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    listActiveWorlds: vi.fn(),
  },
}));

const { bayanService } = await import('./bayan.service');
const { bayanRepository } = await import('./bayan.repository');
const { khalilService } = await import('../../kernel/khalil/service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BayanService.getIndividualsWorldId', () => {
  it('يعيد id عالم individuals عند وجوده', async () => {
    vi.mocked(khalilService.listActiveWorlds).mockResolvedValue([individualsWorld]);

    const result = await bayanService.getIndividualsWorldId();

    expect(result).toBe('world-1');
  });

  it('يرمي خطأً واضحاً إن لم يوجد عالم individuals في القائمة', async () => {
    vi.mocked(khalilService.listActiveWorlds).mockResolvedValue([]);

    await expect(bayanService.getIndividualsWorldId()).rejects.toThrow('individuals');
  });
});

describe('BayanService.listFeed', () => {
  it('يعيد صفحة فارغة بلا استدعاء الصور/المنتجات إن لم توجد منشورات', async () => {
    vi.mocked(bayanRepository.listPublishedPosts).mockResolvedValue({ posts: [], hasMore: false });

    const result = await bayanService.listFeed();

    expect(result).toEqual({ posts: [], hasMore: false, products: [] });
    expect(bayanRepository.findPostMediaByPostIds).not.toHaveBeenCalled();
    expect(bayanRepository.findPostProductsWithProductsByPostIds).not.toHaveBeenCalled();
  });

  it('يجمّع كل منشور مع صوره ومنتجاته المرتبطة بالترتيب، ويعيد المنتجات الكاملة (JOIN) بلا استعلام إضافي', async () => {
    vi.mocked(bayanRepository.listPublishedPosts).mockResolvedValue({ posts: [post], hasMore: true });
    vi.mocked(bayanRepository.findPostMediaByPostIds).mockResolvedValue([media]);
    vi.mocked(bayanRepository.findPostProductsWithProductsByPostIds).mockResolvedValue([productLinkWithProduct]);

    const result = await bayanService.listFeed({ offset: 10, limit: 5 });

    expect(bayanRepository.listPublishedPosts).toHaveBeenCalledWith({ postTypes: undefined, offset: 10, limit: 5 });
    expect(result.hasMore).toBe(true);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].media).toEqual([media]);
    expect(result.posts[0].productIds).toEqual(['prod-1']);
    expect(result.products).toEqual([product]);
  });

  it('يستخدم القيم الافتراضية (offset=0, limit=10) عند عدم تمرير خيارات', async () => {
    vi.mocked(bayanRepository.listPublishedPosts).mockResolvedValue({ posts: [], hasMore: false });

    await bayanService.listFeed();

    expect(bayanRepository.listPublishedPosts).toHaveBeenCalledWith({ postTypes: undefined, offset: 0, limit: 10 });
  });
});

describe('BayanService.scaleRecipeQuantities', () => {
  const recipe: RecipeLink = {
    type: 'recipe',
    title: 'وصفة اختبار',
    baseFamilySize: 4,
    ingredients: [
      { productId: 'prod-rice', baseQuantity: 2 },
      { productId: 'prod-chicken', baseQuantity: 1 },
    ],
  };

  it('يُبقي الكميات كما هي عند تطابق حجم العائلة مع الأساس', () => {
    const result = bayanService.scaleRecipeQuantities(recipe, 4);
    expect(result).toEqual([
      { productId: 'prod-rice', quantity: 2 },
      { productId: 'prod-chicken', quantity: 1 },
    ]);
  });

  it('يُضاعف الكميات تناسبياً عند مضاعفة حجم العائلة', () => {
    const result = bayanService.scaleRecipeQuantities(recipe, 8);
    expect(result).toEqual([
      { productId: 'prod-rice', quantity: 4 },
      { productId: 'prod-chicken', quantity: 2 },
    ]);
  });

  it('لا يعيد كمية أقل من 1 حتى لعائلة صغيرة جداً', () => {
    const result = bayanService.scaleRecipeQuantities(recipe, 1);
    // prod-chicken: round(1 * 1 / 4) = round(0.25) = 0 → يُرفَع لـ1
    expect(result.find((r) => r.productId === 'prod-chicken')!.quantity).toBe(1);
  });

  it('يرمي خطأً لعدد أفراد عائلة صفري أو سالب', () => {
    expect(() => bayanService.scaleRecipeQuantities(recipe, 0)).toThrow();
    expect(() => bayanService.scaleRecipeQuantities(recipe, -2)).toThrow();
  });
});

describe('BayanService — تفويض دوال الإدارة مباشرة لـ bayanRepository', () => {
  it('createPost', async () => {
    vi.mocked(bayanRepository.createPost).mockResolvedValue(post);
    const input = { worldScope: 'world-1', categoryId: 'cat-1', postType: 'post' as const };
    const result = await bayanService.createPost(input);
    expect(bayanRepository.createPost).toHaveBeenCalledWith(input);
    expect(result).toEqual(post);
  });

  it('setPostProducts', async () => {
    await bayanService.setPostProducts('post-1', ['prod-a']);
    expect(bayanRepository.replacePostProducts).toHaveBeenCalledWith('post-1', ['prod-a']);
  });
});
