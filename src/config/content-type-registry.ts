// src/config/content-type-registry.ts
// سجل مركزي لأنواع محتوى بيان (CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01، الجزء 5) — نفس
// نمط src/config/theme-registry.ts / src/config/neighborhood-identity-registry.ts حرفياً (سجل بيانات
// ثابت في الكود، لا هاردكود متناثر داخل المكوّنات). كود ثابت لا DB الآن — قرار موثَّق في
// docs/design/CONTENT_MODEL.md (DB جدول منفصل خيار Phase 2 مستقبلي، غير مبني هنا).
//
// `key` هنا هو نفسه PostType من bayan/types.ts (مصدر الحقيقة الوحيد لقيم post_type — يطابق قيد
// posts_post_type_check في قاعدة البيانات). هذا السجل لا يعيد تعريف القيم المسموحة، فقط يُضيف طبقة
// عرض (تسمية + تبويب + تفعيل/تعطيل) فوقها.
//
// `enabled: false` يُخفي النوع من تبويبات الخلاصة (FeedTabBar) ومن نتائج الفلترة تلقائياً، بلا أي
// تعديل على FeedTabBar.tsx أو bayan.service.ts أو قاعدة البيانات — نقطة تحكم واحدة.

import type { PostType } from '@/core/modules/bayan/types';

export type FeedTabKey = 'all' | 'reel' | 'products' | 'posts';

// ترتيب العرض الفعلي في FeedTabBar — يطابق حرفياً "الكل | ريلز | منتجات | منشورات" من موجّه المهمة.
export const FEED_TAB_KEYS: FeedTabKey[] = ['all', 'reel', 'products', 'posts'];

export const FEED_TAB_LABELS_AR: Record<FeedTabKey, string> = {
  all: 'الكل',
  reel: 'ريلز',
  products: 'منتجات',
  posts: 'منشورات',
};

export interface ContentTypeConfig {
  key: PostType;
  enabled: boolean;
  labelAr: string;
  feedTab: Exclude<FeedTabKey, 'all'>;
}

// تجميع "منتجات" = product_highlight + offer معاً (قرار مؤسس صريح، لا تبويب "عروض" منفصل) —
// راجع docs/design/CONTENT_MODEL.md للتبرير الكامل.
//
// DD-024 — 'article' مُضافة تحت تبويب "منشورات" (posts) نفسه: مفهومياً أقرب لـ'post' العادي (نص +
// صور، قد يرتبط بمنتج/مجموعة عبر post_products الموجود أصلاً) من 'product_highlight'/'offer' — لا
// تبويب جديد مطلوب، نفس مبدأ عدم إضافة بنية تحتية بلا حاجة فعلية (§4 أعلاه).
export const CONTENT_TYPE_REGISTRY: ContentTypeConfig[] = [
  { key: 'post', enabled: true, labelAr: 'منشور', feedTab: 'posts' },
  { key: 'reel', enabled: true, labelAr: 'ريل', feedTab: 'reel' },
  { key: 'product_highlight', enabled: true, labelAr: 'إبراز منتج', feedTab: 'products' },
  { key: 'offer', enabled: true, labelAr: 'عرض', feedTab: 'products' },
  { key: 'article', enabled: true, labelAr: 'مقالة', feedTab: 'posts' },
];

export function getEnabledContentTypes(): ContentTypeConfig[] {
  return CONTENT_TYPE_REGISTRY.filter((c) => c.enabled);
}

// undefined = بلا فلتر (تبويب "الكل")؛ مصفوفة (قد تكون فارغة إن عُطِّلت كل الأنواع تحت هذا التبويب) =
// فلتر صريح يُمرَّر لـ.in() في bayan.repository.ts.
export function getPostTypesForTab(tab: FeedTabKey): PostType[] | undefined {
  if (tab === 'all') return undefined;
  return getEnabledContentTypes()
    .filter((c) => c.feedTab === tab)
    .map((c) => c.key);
}

// تبويبات يُعرَض لها زر فعلي في FeedTabBar — "الكل" دائماً ظاهر، أي تبويب آخر يختفي تلقائياً لو
// عُطِّلت كل أنواع المحتوى الواقعة تحته (بلا حاجة لتعديل FeedTabBar.tsx نفسه).
export function getVisibleFeedTabs(): FeedTabKey[] {
  return FEED_TAB_KEYS.filter((tab) => tab === 'all' || (getPostTypesForTab(tab)?.length ?? 0) > 0);
}
