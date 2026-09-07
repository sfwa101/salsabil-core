// src/core/modules/bayan/types.ts
// بيان — محرك المحتوى (الخلاصة الرئيسية لريف المدينة، BAYAN-HOME-FEED-001، اليوم 23)
//
// ⚠️ Post.worldScope هو فلتر بيانات (أي سياق/شخصية يخص هذا المحتوى — جدول worlds، خليل، اليوم 19)
// لا علاقة له إطلاقاً بسمة data-world البصرية (WorldSlug/WORLD_THEMES في src/config/theme-registry.ts،
// ADR-007). صفحة الخلاصة نفسها تبقى data-world="reef" دائماً — راجع docs/DATABASE.md §4 لنفس التمييز
// المُطبَّق على worlds/user_personas.

// نفس نمط ORDER_STATUSES/ORDER_STATUS_LABELS_AR في src/core/modules/orders/types.ts —
// مصدر واحد للقيم المسموحة (يطابق posts_post_type_check في قاعدة البيانات) وتسمياتها العربية
export const POST_TYPES = ['post', 'reel', 'product_highlight', 'offer'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS_AR: Record<PostType, string> = {
  post: 'منشور',
  reel: 'ريل',
  product_highlight: 'إبراز منتج',
  offer: 'عرض',
};

// خيار خيارات ربط الصورة — نفس نمط ProductOption (SizeOption | AddonOption) من اليوم 3
export interface ProductLink {
  type: 'product';
  productId: string;
}

export interface RecipeIngredient {
  productId: string;
  baseQuantity: number;
}

export interface RecipeLink {
  type: 'recipe';
  title: string;
  baseFamilySize: number; // أساس القياس عند تغيير عدد أفراد العائلة
  ingredients: RecipeIngredient[];
}

export interface NoLink {
  type: 'none';
}

export type PostMediaLink = ProductLink | RecipeLink | NoLink;

export interface Post {
  id: string;
  worldScope: string; // FK -> worlds.id
  categoryId: string; // "الحي المرتبط"
  postType: PostType;
  caption?: string;
  isPublished: boolean;
  priority: number; // ترتيب يدوي من الأدمن — نفس نمط categories.displayOrder
  createdAt: string;
  updatedAt: string;
}

export interface PostMedia {
  id: string;
  postId: string;
  imageUrl: string;
  displayOrder: number;
  link: PostMediaLink;
  createdAt: string;
}

export interface PostProductLink {
  id: string;
  postId: string;
  productId: string;
  displayOrder: number;
}

// تجميعة كاملة لعرض منشور واحد في الخلاصة
export interface PostWithDetails extends Post {
  media: PostMedia[];
  productIds: string[]; // بالترتيب، للرف الأفقي أسفل المنشور
}

export interface CreatePostInput {
  worldScope: string;
  categoryId: string;
  postType: PostType;
  caption?: string;
  priority?: number;
}

export interface UpdatePostInput {
  categoryId?: string;
  postType?: PostType;
  caption?: string;
  priority?: number;
  isPublished?: boolean;
}

export interface CreatePostMediaInput {
  postId: string;
  imageUrl: string;
  displayOrder: number;
  link: PostMediaLink;
}

// صف صورة بلا postId/displayOrder بعد — لوحة إدارة بيان (اليوم 24) تجمع مصفوفة منها ثم
// تُرسِلها دفعة واحدة لـ replacePostMedia (postId معروف، displayOrder = ترتيب المصفوفة)
export interface PostMediaDraft {
  imageUrl: string;
  link: PostMediaLink;
}

export interface ListFeedOptions {
  // مصفوفة لا قيمة مفردة (منذ CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01) — تبويب "منتجات" في
  // الخلاصة يجمع نوعين معاً (product_highlight + offer)، راجع src/config/content-type-registry.ts.
  postTypes?: PostType[];
  offset?: number;
  limit?: number;
}

export interface FeedPage {
  posts: PostWithDetails[];
  hasMore: boolean;
}
