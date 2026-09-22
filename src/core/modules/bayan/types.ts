// src/core/modules/bayan/types.ts
// بيان — محرك المحتوى (الخلاصة الرئيسية لريف المدينة، BAYAN-HOME-FEED-001، اليوم 23)

import type { Product } from '../catalog/types';
//
// ⚠️ Post.worldScope هو فلتر بيانات (أي سياق/شخصية يخص هذا المحتوى — جدول worlds، خليل، اليوم 19)
// لا علاقة له إطلاقاً بسمة data-world البصرية (WorldSlug/WORLD_THEMES في src/config/theme-registry.ts،
// ADR-007). صفحة الخلاصة نفسها تبقى data-world="reef" دائماً — راجع docs/DATABASE.md §4 لنفس التمييز
// المُطبَّق على worlds/user_personas.

// نفس نمط ORDER_STATUSES/ORDER_STATUS_LABELS_AR في src/core/modules/orders/types.ts —
// مصدر واحد للقيم المسموحة (يطابق posts_post_type_check في قاعدة البيانات) وتسمياتها العربية
//
// DD-024 (2026-09-22/23) — أضافت 'article' + عرَّفت 'reel' رسمياً كفيديو مستورَد برابط خارجي (كان
// يُعرَض كصورة عادية قبل هذا). راجع scripts/2026-09-22-dd024-bayan-post-shapes.sql للـMigration.
export const POST_TYPES = ['post', 'reel', 'product_highlight', 'offer', 'article'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS_AR: Record<PostType, string> = {
  post: 'منشور',
  reel: 'ريل',
  product_highlight: 'إبراز منتج',
  offer: 'عرض',
  article: 'مقالة',
};

// DD-024 — منصات الفيديو المدعومة لتضمين حقيقي (embed) — راجع reel-embed.ts. بلا قيد قاعدة بيانات
// عمداً (نفس فلسفة PostMediaLink أدناه) — 'other' تغطي أي منصة غير مُعرَّفة هنا صراحة (بلا تضمين
// حقيقي ممكن لها اليوم، تُستبعَد من الخلاصة بدل عرض iframe مكسور — راجع ReelsDataSource).
export const VIDEO_SOURCES = ['youtube', 'tiktok', 'instagram', 'facebook', 'other'] as const;
export type VideoSource = (typeof VIDEO_SOURCES)[number];

export const VIDEO_SOURCE_LABELS_AR: Record<VideoSource, string> = {
  youtube: 'يوتيوب',
  tiktok: 'تيك توك',
  instagram: 'إنستجرام',
  facebook: 'فيسبوك',
  other: 'أخرى',
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
  // DD-024 — تُستخدَم فقط لـpostType==='reel'، undefined لكل الأنواع الأخرى دائماً.
  videoUrl?: string;
  videoSource?: VideoSource;
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
  videoUrl?: string;
  videoSource?: VideoSource;
}

export interface UpdatePostInput {
  categoryId?: string;
  postType?: PostType;
  caption?: string;
  priority?: number;
  isPublished?: boolean;
  videoUrl?: string;
  videoSource?: VideoSource;
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
  // FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 3) — منتجات "منتجات هذا المنشور"
  // (post_products) لكل المنشورات في هذه الصفحة، مُجمَّعة ومُزالة التكرار — تصل الآن عبر JOIN واحد
  // (bayan.repository.ts.findPostProductsWithProductsByPostIds) بدل استعلام catalogService منفصل
  // لاحق في feed-actions.ts. لا يخالف مبدأ "بيان لا يعرف تفاصيل Product الكاملة" — الحقل هنا نتيجة
  // مُجمَّعة تمر عبره لطبقة العرض، لا استخدام داخلي لمنطق بيان نفسه.
  products: Product[];
}
