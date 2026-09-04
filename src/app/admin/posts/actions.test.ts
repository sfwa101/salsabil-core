// src/app/admin/posts/actions.test.ts
// اختبارات وحدة (mocked) لأول Server Actions للوحة إدارة بيان (اليوم 24) — تموّه getAdminSession
// وbayanService بالكامل (نفس نمط src/core/modules/bayan/service.test.ts الذي يموّه bayanRepository).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '@/core/kernel/khalil/types';
import type { PostFormInput } from './actions';

vi.mock('@/core/modules/admin/admin-session', () => ({
  getAdminSession: vi.fn(),
}));
vi.mock('@/core/modules/bayan/bayan.service', () => ({
  bayanService: {
    getIndividualsWorldId: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    replacePostMedia: vi.fn(),
    setPostProducts: vi.fn(),
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { createPostAction, updatePostAction, togglePublishAction, deletePostAction } = await import('./actions');
const { getAdminSession } = await import('@/core/modules/admin/admin-session');
const { bayanService } = await import('@/core/modules/bayan/bayan.service');

// نمط UUID صحيح فعلياً (نسخة 4، بت المتغيّر a/8/9/b) — z.uuid() في zod v4 يتحقق من هذا صرامة،
// عكس سلسلة "1111...1111" المسطَّحة التي رفضها فعلياً أثناء أول تشغيل لهذا الملف
const CATEGORY_ID = '11111111-1111-4111-a111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-a222-222222222222';
const POST_ID = '33333333-3333-4333-a333-333333333333';
const WORLD_ID = '44444444-4444-4444-a444-444444444444';

const adminSession: Session = {
  userId: 'admin-user',
  tenantId: null,
  role: 'platform_admin',
  expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
};

function baseInput(overrides: Partial<PostFormInput> = {}): PostFormInput {
  return {
    categoryId: CATEGORY_ID,
    postType: 'post',
    caption: 'وصف تجريبي',
    priority: 5,
    isPublished: false,
    media: [],
    productIds: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createPostAction', () => {
  it('يرفض بلا جلسة إدارة صالحة', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const result = await createPostAction(baseInput());

    expect('error' in result).toBe(true);
    expect(bayanService.createPost).not.toHaveBeenCalled();
  });

  it('يرفض مدخلات غير صحيحة (categoryId ليس UUID)', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);

    const result = await createPostAction(baseInput({ categoryId: 'not-a-uuid' }));

    expect('error' in result).toBe(true);
    expect(bayanService.createPost).not.toHaveBeenCalled();
  });

  it('ينشئ المنشور بعالم individuals، ولا يستدعي replacePostMedia/setPostProducts/updatePost عند عدم الحاجة', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.mocked(bayanService.getIndividualsWorldId).mockResolvedValue(WORLD_ID);
    vi.mocked(bayanService.createPost).mockResolvedValue({
      id: POST_ID,
      worldScope: WORLD_ID,
      categoryId: CATEGORY_ID,
      postType: 'post',
      caption: 'وصف تجريبي',
      isPublished: false,
      priority: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await createPostAction(baseInput());

    expect(result).toEqual({ success: true, data: { postId: POST_ID } });
    expect(bayanService.createPost).toHaveBeenCalledWith({
      worldScope: WORLD_ID,
      categoryId: CATEGORY_ID,
      postType: 'post',
      caption: 'وصف تجريبي',
      priority: 5,
    });
    expect(bayanService.replacePostMedia).not.toHaveBeenCalled();
    expect(bayanService.setPostProducts).not.toHaveBeenCalled();
    expect(bayanService.updatePost).not.toHaveBeenCalled();
  });

  it('ينشئ الصور المرفقة، يضبط الرف الأفقي (post_products)، وينشر فوراً عند طلب isPublished=true', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.mocked(bayanService.getIndividualsWorldId).mockResolvedValue(WORLD_ID);
    vi.mocked(bayanService.createPost).mockResolvedValue({
      id: POST_ID,
      worldScope: WORLD_ID,
      categoryId: CATEGORY_ID,
      postType: 'offer',
      isPublished: false,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await createPostAction(
      baseInput({
        postType: 'offer',
        priority: 0,
        isPublished: true,
        media: [{ imageUrl: 'https://example.com/a.jpg', link: { type: 'product', productId: PRODUCT_ID } }],
        productIds: [PRODUCT_ID],
      })
    );

    expect('success' in result).toBe(true);
    expect(bayanService.replacePostMedia).toHaveBeenCalledWith(POST_ID, [
      { imageUrl: 'https://example.com/a.jpg', link: { type: 'product', productId: PRODUCT_ID } },
    ]);
    expect(bayanService.setPostProducts).toHaveBeenCalledWith(POST_ID, [PRODUCT_ID]);
    expect(bayanService.updatePost).toHaveBeenCalledWith(POST_ID, { isPublished: true });
  });

  it('يرفض رابط وصفة بلا مكوّنات (min 1)', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);

    const result = await createPostAction(
      baseInput({
        media: [
          {
            imageUrl: 'https://example.com/a.jpg',
            link: { type: 'recipe', title: 'وصفة فارغة', baseFamilySize: 4, ingredients: [] },
          },
        ],
      })
    );

    expect('error' in result).toBe(true);
    expect(bayanService.createPost).not.toHaveBeenCalled();
  });
});

describe('updatePostAction', () => {
  it('يحدّث الحقول، يستبدل كل الصور دفعة واحدة، ويستبدل الرف الأفقي دائماً (حتى لو فارغاً — لمسح تحديد سابق)', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.mocked(bayanService.updatePost).mockResolvedValue({
      id: POST_ID,
      worldScope: WORLD_ID,
      categoryId: CATEGORY_ID,
      postType: 'post',
      isPublished: true,
      priority: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await updatePostAction(POST_ID, baseInput({ priority: 9, isPublished: true }));

    expect('success' in result).toBe(true);
    expect(bayanService.updatePost).toHaveBeenCalledWith(POST_ID, {
      categoryId: CATEGORY_ID,
      postType: 'post',
      caption: 'وصف تجريبي',
      priority: 9,
      isPublished: true,
    });
    expect(bayanService.replacePostMedia).toHaveBeenCalledWith(POST_ID, []);
    expect(bayanService.setPostProducts).toHaveBeenCalledWith(POST_ID, []);
  });

  it('يرفض معرّف منشور غير صحيح', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);

    const result = await updatePostAction('not-a-uuid', baseInput());

    expect('error' in result).toBe(true);
    expect(bayanService.updatePost).not.toHaveBeenCalled();
  });
});

describe('togglePublishAction', () => {
  it('يبدّل حالة النشر بلا جلسة صالحة → خطأ', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const result = await togglePublishAction(POST_ID, true);

    expect('error' in result).toBe(true);
    expect(bayanService.updatePost).not.toHaveBeenCalled();
  });

  it('يبدّل حالة النشر بجلسة صالحة', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.mocked(bayanService.updatePost).mockResolvedValue({
      id: POST_ID,
      worldScope: WORLD_ID,
      categoryId: CATEGORY_ID,
      postType: 'post',
      isPublished: true,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await togglePublishAction(POST_ID, true);

    expect(result).toEqual({ success: true });
    expect(bayanService.updatePost).toHaveBeenCalledWith(POST_ID, { isPublished: true });
  });
});

describe('deletePostAction', () => {
  it('يحذف المنشور بجلسة صالحة', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);
    vi.mocked(bayanService.deletePost).mockResolvedValue(undefined);

    const result = await deletePostAction(POST_ID);

    expect(result).toEqual({ success: true });
    expect(bayanService.deletePost).toHaveBeenCalledWith(POST_ID);
  });

  it('يرفض معرّف غير صحيح بلا استدعاء الخدمة', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(adminSession);

    const result = await deletePostAction('not-a-uuid');

    expect('error' in result).toBe(true);
    expect(bayanService.deletePost).not.toHaveBeenCalled();
  });
});
