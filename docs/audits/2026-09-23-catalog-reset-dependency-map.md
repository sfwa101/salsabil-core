---
title: خارطة تبعية إعادة ضبط الكتالوج — للمهمة القادمة (توثيق فقط، صفر تنفيذ)
date: 2026-09-23
type: audit
author: Claude
related: STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION، docs/DATABASE.md، docs/DECISIONS.md → DD-026
---

# خارطة تبعية إعادة ضبط الكتالوج

هذا التوثيق **لا يُنفَّذ في هذه المهمة** — تحضير فقط لمهمة "إعادة ضبط الكتالوج الكامل" المنفصلة
القادمة (حذف الكتالوج الحالي المؤقت + استيراد كتالوج بديل). لا حذف/تعديل بيانات هنا.

## 1. `products` — الجدول المحوري

الأعمدة ذات الصلة: `id` (PK)، `is_active` (هو حقل الحالة الوحيد — **لا** `deleted_at`)، `category_id`
(قديم، nullable)، `district_id`/`catalog_category_id`/`catalog_subcategory_id` (جديد، nullable)،
`master_item_id` (→ `catalog_master_items`، nullable)، `tenant_id` (→ `merchants`، nullable)،
`image_url` (نص URL مباشر — **لا** عمود مفتاح/معرّف Cloudflare منفصل).

## 2. الجداول المرجعية لـ`products.id` — بالترتيب الأكثر أماناً للحذف أولاً

| الجدول | العلاقة | نوع البيانات | ملاحظة الحذف |
|---|---|---|---|
| `inventory` | `product_id` (PK، 1:1) | حية فقط | **يجب حذفها أولاً** — لا `ON DELETE` صريح مسجَّل، فالحذف الافتراضي `NO ACTION`/`RESTRICT` — حذف `products` سيفشل لو بقيت صفوف `inventory` مرتبطة. |
| `cart_items` | `product_id` | حية فقط (السعر يُحسَب لحظياً عبر `CatalogService.calculatePrice`، لا نسخة مجمَّدة) | يجب حذفها/تفريغها قبل حذف `products` — عربات نشطة تشير لمنتج مُراد حذفه ستُكسر. |
| `post_products` | `product_id` | حية فقط (رابط بيان↔منتج، بلا نسخ اسم/سعر) | حذف الرابط لا يمس المنشور نفسه — أمِن نسبياً، لكن يجب تنظيفه قبل حذف `products`. |
| `catalog_review_queue.resolved_product_id` | FK اختياري (nullable) | سجل تاريخي لاستيراد تاجر | لا يمنع حذف `products` بالضرورة (nullable) — لكن يترك مرجعاً معلَّقاً منطقياً إن لم يُنظَّف أيضاً. |
| `catalog_node_product_links` (جديد، هذه المهمة) | `product_id` (`ON DELETE CASCADE` على كلا العمودين) | فاضٍ اليوم | يُحذَف تلقائياً مع حذف المنتج (Cascade) — لا فعل يدوي مطلوب هنا تحديداً. |

## 3. بيانات **يجب أن تبقى** — لا تُحذَف مع الكتالوج

| الجدول | السبب |
|---|---|
| `order_items` | تاريخ مالي — `unit_price_snapshot` مجمَّد وقت الشراء الفعلي، لكنه **لا يزال يحمل FK حياً** لـ`products.id` (لا نسخة اسم/صورة). حذف `products` المرتبطة سيكسر هذا الجدول لو نُفِّذ بلا حذر — أي إعادة ضبط كتالوج **يجب أن تستثني/تؤرشف** طلبات قديمة قبل حذف منتجاتها، لا تحذف المنتج مباشرة. |
| `merchant_suborder_items` | نفس شكل `order_items` تماماً (`unit_price_snapshot` مجمَّد + FK حي) — لكنه `APPROVED_PENDING_MANUAL_EXECUTION` (لم يُطبَّق على أي بيئة بعد وقت هذا التوثيق) — صفر صفوف حالياً، لكن يجب تذكُّره عند التطبيق. |
| `catalog_master_items` | الكتالوج الأساسي (يديره `platform_admin`، منفصل عن صفوف `products` الفعلية للتجار) — بيانات تهيكل/تسعير، لا كتالوج مؤقت. |
| `catalog_districts`/`catalog_categories`/`catalog_subcategories` | تصنيف/تهيكل (Config Data)، ليست بيانات كتالوج مؤقتة — تبقى بصرف النظر عن حذف المنتجات (المهمة الحالية أصلاً تثبِّت هذا التصنيف كأساس دائم). |
| `merchants`, `users`, `sessions` | بيانات حساب/تاجر — غير متأثرة بحذف الكتالوج إطلاقاً. |

## 4. جهوزية تنظيف Cloudflare

- `products.image_url` (و`catalog_master_items.image_url`) **نص URL كامل مباشر فقط** — لا عمود
  Object ID/Key منفصل لـCloudflare/R2. معرفة "أي ملف على Cloudflare يخص أي منتج" ممكنة فقط بتحليل
  الـURL نفسه (اسم الملف/المسار)، لا استعلام مباشر.
- **لا أداة حذف Cloudflare API في هذا المستودع** — بحث شامل (`grep -i cloudflare` عبر `src/`/`scripts/`)
  لم يجد أي تكامل فعلي، فقط تعليق تخطيطي واحد في `next.config.ts` يذكر "Cloudflare Images/R2" كخيار
  مستقبلي محتمل.
- **حذف صف `products` لا يحذف أي ملف على Cloudflare تلقائياً** — الملفان منفصلان تماماً (لا Trigger،
  لا Webhook، لا كود تطبيقي يربطهما).
- **اكتشاف الملفات اليتيمة (Orphan)**: يتطلَّب مستقبلاً (1) قائمة كل الروابط الفعلية المستخدَمة حالياً
  في `products.image_url`/`catalog_master_items.image_url` (قبل أي حذف)، (2) قائمة كل الملفات
  الموجودة فعلياً على `assets.reefam.com`/`images.kheirzaman.com` (يتطلَّب وصول API/لوحة تحكم
  Cloudflare، غير متاح من الكود)، (3) الفرق بينهما. لا أداة تلقائية لهذا اليوم.
- **الحسمان الآمنان الوحيدان المعروفان اليوم**: `assets.reefam.com` و`images.kheirzaman.com` (مصدرا
  الصور الحقيقيان المُتحقَّق منهما حياً، راجع `docs/audits/2026-09-20-cart-rounding-images-cleanup-districts-report.md`
  §3أ) — **لا يجوز حذف أي شيء منهما جماعياً** بلا التحقق أولاً أن الملف غير مُستخدَم في صف `products`
  نشط (أو `catalog_master_items`)، لأن كلا المصدرين قد يحمل أصولاً مشتركة غير مرتبطة بمنتج واحد فقط.

## 5. ترتيب الحذف الآمن الموصى به (توثيقي — **لا تنفيذ الآن**)

1. أرشفة/استبعاد الطلبات القديمة (`orders`/`order_items`) المرتبطة بالمنتجات المُراد حذفها من أي
   استعلام حذف مباشر — **لا تُحذَف هي نفسها أبداً**.
2. حذف/تفريغ `cart_items` المرتبطة (عربات نشطة على منتجات ستُحذَف).
3. حذف `post_products` المرتبطة (الرابط فقط، لا يمس `posts`).
4. حذف `inventory` المرتبطة (1:1، `product_id` PK).
5. تنظيف/تصفير `catalog_review_queue.resolved_product_id` إن أشار لمنتجات ستُحذَف.
6. حذف صفوف `products` نفسها (`catalog_node_product_links` يُحذَف تلقائياً عبر `ON DELETE CASCADE`).
7. عندها فقط — تنظيف Cloudflare للملفات اليتيمة الفعلية (يتطلَّب أداة/سكربت جديد غير موجود اليوم).

**لا خطوة من هذه السبع نُفِّذت في هذه المهمة.**
