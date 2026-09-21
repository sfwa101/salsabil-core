export interface QuickViewProductSnapshot {
  id: string;
  title: string;
  price?: number;
  imageUrl?: string;
  description?: string;
  unit?: string;
  publisher?: {
    name: string;
  };
}

export interface ReelSnapshot {
  id: string;
  title: string;
  chefOrSource: string;
  platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | string;
  thumbnailUrl: string;
  embedUrl: string;
}

export type UIAction =
  // REAL-BACKEND-SDUI-INTEGRATION-POC (2026-09-21) — لا يحمل سعراً من العميل إطلاقاً (مبدأ
  // "الخادم مصدر الحقيقة للسعر"، راجع docs/audits/2026-09-21-real-backend-sdui-integration-poc.md
  // §D). هوية المنتج + دلتا/قيمة الكمية المطلوبة فقط — السعر الفعلي يُحسَب دائماً من الخادم عبر
  // AddItemInput (لا حقل سعر فيه أصلاً، core/modules/cart/types.ts).
  | { type: 'ADD_TO_CART'; payload: { id: string; amount?: number; action?: 'increment' | 'decrement' | 'set' } }
  | { type: 'OPEN_QUICK_VIEW'; payload: { product: QuickViewProductSnapshot } }
  | { type: 'OPEN_REEL'; payload: ReelSnapshot }
  | { type: 'NAVIGATE'; payload: { destination: string } }
  | { type: 'SELECT_CATEGORY'; payload: { categoryId: string } }
  | { type: 'CHANGE_FEED_TAB'; payload: { tab: 'all' | 'products' | 'reels' | 'posts' } }
  | { type: 'EXECUTE_SEARCH'; payload: { query: string } }
  | { type: 'CLEAR_CART' };
