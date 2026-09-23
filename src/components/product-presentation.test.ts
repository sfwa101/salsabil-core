import { describe, expect, it } from 'vitest';
import type { Product } from '@/core/modules/catalog/types';
import { productRequiresConfiguration, toProductCardPresentation } from './product-presentation';

function product(options: Product['options'] = []): Product {
  return {
    id: 'product-1',
    categoryId: 'category-1',
    tenantId: 'tenant-1',
    name: 'Real product',
    description: 'Real description',
    basePrice: 25,
    unit: 'kg',
    imageUrl: '/product.jpg',
    options,
    isActive: true,
    createdAt: '2026-09-23T00:00:00.000Z',
  };
}

describe('ProductCardPresentationModel', () => {
  it('maps only real presentation data and preserves simple-product quantity', () => {
    expect(toProductCardPresentation(product(), 3)).toEqual({
      id: 'product-1',
      title: 'Real product',
      price: 25,
      imageUrl: '/product.jpg',
      description: 'Real description',
      unit: 'kg',
      quantity: 3,
      requiresConfiguration: false,
    });
  });

  it.each([
    { id: 'size-1', type: 'size' as const, label: 'Large', priceModifier: 5 },
    { id: 'addon-1', type: 'addon' as const, label: 'Extra', priceModifier: 2 },
  ])('marks size/addon products configured without collapsing quantity', (option) => {
    const configured = product([option]);
    expect(productRequiresConfiguration(configured)).toBe(true);
    expect(toProductCardPresentation(configured, 7)).toMatchObject({
      price: configured.basePrice,
      quantity: undefined,
      requiresConfiguration: true,
    });
  });
});
