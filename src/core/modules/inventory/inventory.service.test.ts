// src/core/modules/inventory/inventory.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./inventory.repository', () => ({
  inventoryRepository: { findByProductId: vi.fn() },
}));

const { inventoryService } = await import('./inventory.service');
const { inventoryRepository } = await import('./inventory.repository');

beforeEach(() => vi.clearAllMocks());

describe('InventoryService.isAvailable', () => {
  it('يُعيد false عند عدم وجود سجل مخزون إطلاقاً (لا استثناء صامت للبيع بلا رقابة)', async () => {
    vi.mocked(inventoryRepository.findByProductId).mockResolvedValue(null);
    await expect(inventoryService.isAvailable('prod-x', 1)).resolves.toBe(false);
  });

  it('يُعيد true عندما الكمية المتاحة >= المطلوبة', async () => {
    vi.mocked(inventoryRepository.findByProductId).mockResolvedValue({
      productId: 'prod-x',
      quantityAvailable: 5,
      updatedAt: new Date().toISOString(),
    });
    await expect(inventoryService.isAvailable('prod-x', 5)).resolves.toBe(true);
    await expect(inventoryService.isAvailable('prod-x', 6)).resolves.toBe(false);
  });
});
