---
title: نموذج المحتوى — أنواع المنشورات وسجل التخصيص
status: ACTIVE
version: 1.0
last_updated: 2026-09-08
owner: المؤسس (أبوحتاب)
source_of_truth: src/core/modules/bayan/types.ts (القيم المسموحة، يطابق قيد قاعدة البيانات)، src/config/content-type-registry.ts (طبقة العرض/التفعيل)
---

# نموذج المحتوى — أنواع المنشورات وسجل التخصيص

## 1. مصدر الحقيقة لأنواع المحتوى

القيم المسموحة لـ`posts.post_type` مُعرَّفة في مكانين يجب أن يبقيا متطابقين دائماً:

- **قاعدة البيانات:** قيد `posts_post_type_check` (SQL، غير قابل للتعديل من هذا المستند)
- **الكود:** `POST_TYPES` في `src/core/modules/bayan/types.ts` — خمس قيم: `post`, `reel`,
  `product_highlight`, `offer`, `article`

هذا الملف **لا يعيد تعريف** هذه القيم — أي تغيير عليها (إضافة/حذف نوع) خارج نطاق هذه الدفعة، يتطلب
Migration جديدة على قاعدة البيانات (`docs/DATABASE.md`) وإعلاناً صريحاً حسب `AGENTS.md §13`.

**تحديث `DD-024` (2026-09-22/23):** أضافت `article` (Migration:
`scripts/2026-09-22-dd024-bayan-post-shapes.sql`، `docs/DATABASE.md` §3) وعرَّفت `reel` رسمياً كفيديو
مستورَد برابط خارجي (`video_url`/`video_source` على `posts`) — كان يُعرَض قبلها كصورة عادية بلا فرق عن
`post`. أشكال المحتوى الستة المُعرَّفة في `DD-024` (`docs/DECISIONS.md`): (1) reel، (2) صورة مفردة
(`post`/`product_highlight`/`offer` بصورة `post_media` واحدة)، (3) معرض صور (نفس الأنواع بعدة صفوف
`post_media`)، (4) مقالة بلا منتج (`article` بلا `post_products`)، (5) مقالة + منتج واحد (`article` +
صف `post_products` واحد)، (6) مقالة + مجموعة منتجات (`article` + صفَّا `post_products` فأكثر — لا جدول
`product_groups` منفصل، راجع `docs/DATABASE.md` للمبرر الكامل).

## 2. سجل التخصيص — `src/config/content-type-registry.ts`

طبقة عرض فوق `POST_TYPES` — **كود ثابت لا جدول DB** (القرار موضَّح في §4 أدناه). لكل نوع محتوى:

| الحقل | الوصف |
|---|---|
| `key` | قيمة `PostType` — يجب أن تطابق واحدة من `POST_TYPES` |
| `enabled` | تفعيل/تعطيل — النوع المعطَّل يختفي من تبويبات الخلاصة تلقائياً |
| `labelAr` | تسمية عرض مفردة (لوحة الإدارة) |
| `feedTab` | أي تبويب في `FeedTabBar` يظهر تحته هذا النوع |

## 3. Content Tabs — التبويبات الأربعة

```
الكل | ريلز | منتجات | منشورات
```

**قرار مؤسس صريح (2026-09-07):** تبويب "منتجات" يجمع نوعين معاً — `product_highlight` (إبراز منتج)
و`offer` (عرض) — بلا تبويب "عروض" منفصل. هذا تجميع في **طبقة العرض فقط** (`feedTab` في السجل)، لا
تغيير على `POST_TYPES` أو قاعدة البيانات:

```
all      → بلا فلتر (كل الأنواع الخمسة)
reel     → reel
products → product_highlight + offer
posts    → post + article  (DD-024 — راجع §1 أعلاه)
```

تبويب يختفي تلقائياً من `FeedTabBar` إن عُطِّلت كل الأنواع الواقعة تحته (`getVisibleFeedTabs()`) —
بلا أي تعديل كود إضافي.

## 4. لماذا كود ثابت لا DB (قرار هذه الدفعة)

نفس نمط `src/config/theme-registry.ts` (`ADR-007`) و`src/config/neighborhood-identity-registry.ts`
(`ADR-024`) القائمَين فعلاً — إعادة استخدام نمط معتمد، لا اختراع جديد (`AGENTS.md §2`). جدول DB
مخصَّص (`content_types`) يعني Schema جديد + RLS + واجهة CRUD إدارة كاملة — نطاق أكبر بكثير من هذه
الدفعة، ويخالف قيد `AGENTS.md §4` (Complexity Budget). أربعة أنواع ثابتة اليوم لا تبرر هذا الحجم من
البنية التحتية.

**`PROPOSED` لمستقبل غير مبني بعد:** تحويل هذا السجل لجدول DB + لوحة إدارة (تفعيل/تعطيل/إعادة تسمية
بلا نشر كود) — يُبنى فقط عند حاجة فعلية (مثال: تاجر/شريك يحتاج تخصيص أنواع محتوى مستقلة عن الكود). لا
التزام حالياً، بنفس تحفظ `docs/ROADMAP.md → Phase 2 Backlog` على أنماط مشابهة.

## إحالات

- بنية Post/PostMedia/PostProductLink الكاملة → `src/core/modules/bayan/types.ts` (لا تكرار هنا)
- نطاق بيان الكامل → `docs/DOMAIN_MAP.md → بيان`
- `OPEN_QUESTION-002` (تعميم محرك بيان عبر عوالم أخرى) → `docs/DOMAIN_MAP.md` — غير محسوم، هذه الدفعة
  لا تغيّر شيئاً في نطاقه
