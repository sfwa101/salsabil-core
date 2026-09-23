import type { Product } from '@/core/modules/catalog/types';
import type { ProductCardPresentationModel } from '@/types/ui-contracts';

export function productRequiresConfiguration(product: Product): boolean {
  return product.options.some((option) => option.type === 'size' || option.type === 'addon');
}

export function toProductCardPresentation(
  product: Product,
  quantity?: number
): ProductCardPresentationModel {
  const requiresConfiguration = productRequiresConfiguration(product);

  return {
    id: product.id,
    title: product.name,
    price: product.basePrice,
    imageUrl: product.imageUrl,
    description: product.description,
    unit: product.unit,
    quantity: requiresConfiguration ? undefined : quantity,
    requiresConfiguration,
  };
}
