// src/core/modules/catalog/catalog.service.test.ts
// اختبار وحدة لـ getProductsByIds فقط (اليوم 27، BAYAN-HOME-FEED-001) — تمريرة رقيقة لـ
// catalogRepository.findProductsByIds. بقية CatalogService (calculatePrice، validateSelection...)
// لم تُختبَر وحدياً من قبل في هذا الملف — خارج نطاق مهمة اليوم 27 إغلاقها الآن.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from './types';

vi.mock('./catalog.repository', () => ({
  catalogRepository: {
    findProductsByIds: vi.fn(),
  },
}));

const { catalogService } = await import('./catalog.service');
const { catalogRepository } = await import('./catalog.repository');

const product: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  tenantId: null,
  name: 'منتج اختبار',
  basePrice: 10,
  unit: 'قطعة',
  options: [],
  isActive: true,
  createdAt: '2026-09-06T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CatalogService.getProductsByIds', () => {
  it('يفوّض إلى catalogRepository.findProductsByIds بنفس المعرّفات', async () => {
    vi.mocked(catalogRepository.findProductsByIds).mockResolvedValue([product]);

    const result = await catalogService.getProductsByIds(['prod-1']);

    expect(catalogRepository.findProductsByIds).toHaveBeenCalledWith(['prod-1']);
    expect(result).toEqual([product]);
  });
});
