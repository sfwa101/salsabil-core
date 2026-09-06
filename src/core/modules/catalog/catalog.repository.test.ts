// src/core/modules/catalog/catalog.repository.test.ts
// اختبار وحدة (mocked) لـ findProductsByIds فقط (اليوم 27، BAYAN-HOME-FEED-001) — أول اختبار لهذا
// الملف؛ بقية دوال catalog.repository.ts (findCategories، findProductById، إلخ) لم تُختبَر وحدياً من
// قبل في هذا المستودع (لا فجوة يفتحها هذا الملف تحديداً، خارج نطاق مهمة اليوم 27 إغلاقها الآن).
// نفس نمط bayan.repository.test.ts (تمويه عميل supabase مباشرة، builder يدعم .in()).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../kernel/database/supabase-client', () => ({
  supabase: { from: vi.fn() },
}));

const { catalogRepository } = await import('./catalog.repository');
const { supabase } = await import('../../kernel/database/supabase-client');

function makeQueryBuilder(terminal: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (onFulfilled: (value: typeof terminal) => unknown) => Promise.resolve(terminal).then(onFulfilled),
  };
  return builder;
}

const productRow = {
  id: 'prod-1',
  category_id: 'cat-1',
  tenant_id: null,
  name: 'منتج اختبار',
  description: null,
  base_price: 10,
  unit: 'قطعة',
  image_url: 'https://example.com/p.jpg',
  options: [],
  is_active: true,
  created_at: '2026-09-06T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CatalogRepository.findProductsByIds', () => {
  it('يعيد مصفوفة فارغة بلا نداء قاعدة بيانات عند مصفوفة معرّفات فارغة', async () => {
    const result = await catalogRepository.findProductsByIds([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('يجلب المنتجات النشطة فقط عبر .in(id) و.eq(is_active, true)', async () => {
    const builder = makeQueryBuilder({ data: [productRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findProductsByIds(['prod-1']);

    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(builder.in).toHaveBeenCalledWith('id', ['prod-1']);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'prod-1', name: 'منتج اختبار', basePrice: 10 });
  });

  it('يرمي الخطأ إن أعاده Supabase', async () => {
    const builder = makeQueryBuilder({ data: null, error: new Error('db error') });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await expect(catalogRepository.findProductsByIds(['prod-1'])).rejects.toThrow('db error');
  });
});
