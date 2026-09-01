// src/core/modules/cart/types.ts
// السلة — لا سعر مخزَّن هنا إطلاقاً؛ السعر يُحسَب دائماً حياً عبر CatalogService

import type { Product, ProductSelection } from '../catalog/types';

// هوية صاحب السلة: مستخدم مسجَّل، أو زائر عبر session_token (ADR-008)
export type CartIdentity = { userId: string } | { sessionToken: string };

export interface Cart {
  id: string;
  userId: string | null;
  sessionToken: string | null;
  createdAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  selection: ProductSelection;
  createdAt: string;
}

export interface AddItemInput {
  productId: string;
  quantity: number;
  selection?: ProductSelection;
}

// عرض محسوب حياً — غير مخزَّن أبداً
export interface CartLineSummary {
  item: CartItem;
  product: Product;
  unitPrice: number;
  lineTotal: number;
}

export interface CartSummary {
  cart: Cart;
  lines: CartLineSummary[];
  total: number;
}
