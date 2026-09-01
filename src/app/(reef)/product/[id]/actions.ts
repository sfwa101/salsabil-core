'use server';
// السعر يُعاد حسابه هنا دائماً على الخادم — لا يُصدَّق أي سعر يرسله العميل (docs/SECURITY.md قاعدة 2)

import { catalogService } from '@/core/modules/catalog/catalog.service';
import type { ProductSelection } from '@/core/modules/catalog/types';

export async function calculatePriceAction(productId: string, selection: ProductSelection): Promise<{ price: number } | { error: string }> {
  const product = await catalogService.getProductById(productId);
  if (!product) return { error: 'المنتج غير موجود' };

  try {
    const price = catalogService.calculatePrice(product, selection);
    return { price };
  } catch {
    return { error: 'اختيار غير صالح' };
  }
}
