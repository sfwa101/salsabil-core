-- scripts/2026-09-22-dd024-bayan-post-shapes.sql
-- DD-024 — يوسِّع posts لدعم أشكال المنشور الستة (راجع docs/DECISIONS.md → DD-024 للتعريف الكامل):
-- (1) reel — فيديو مستورَد برابط خارجي (2) صورة مفردة (3) معرض صور (4) مقالة بلا منتج
-- (5) مقالة + منتج واحد (6) مقالة + مجموعة منتجات.
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس قيد الأيام 19/22/23) — يُلصَق هذا
-- الملف يدوياً في Supabase Dashboard → SQL Editor → Run.
--
-- سياسة تغيير Schema (docs/DATABASE.md §9) — الخمسة المطلوبة:
-- 1) السبب: post_type الحالي (post/reel/product_highlight/offer) لا يملك نوعاً لـ"مقالة"، ولا عمود
--    فيديو إطلاقاً — post_type='reel' يُعرَض اليوم كصورة عادية (لا معنى فيديو حقيقياً). الأشكال الست
--    المطلوبة في DD-024 لا يمكن تمثيلها بالمخطط الحالي بلا هذا التعديل.
-- 2) الجداول المتأثرة: posts فقط (ALTER عمودين + توسيع CHECK). post_media/post_products بلا تغيير —
--    القدرة على "معرض صور" (N صف post_media) و"مجموعة منتجات" (N صف post_products) موجودة فعلاً،
--    لا تحتاج جدولاً جديداً (راجع DD-024 → Risk لتبرير عدم إنشاء product_groups).
-- 3) التوافق العكسي: كلا العمودين الجديدين NULLABLE بلا DEFAULT يكسر صفوفاً — كل الكود الحالي (لا يقرأ
--    video_url/video_source) يستمر بالعمل بلا تعديل. توسيع CHECK يضيف قيمة واحدة (article) فقط، لا
--    يحذف أياً من القيم الأربع الحالية — أي صف/كود حالي يبقى صالحاً بلا استثناء.
-- 4) استراتيجية التراجع: عكس idempotent كامل في تعليق أسفل هذا الملف (DROP COLUMN + إعادة CHECK
--    الأصلي) — لا Migration رسمية تلقائية، تُنفَّذ يدوياً لو ظهر خطأ.
-- 5) تأثير الفهارس/RLS: لا فهرس جديد مطلوب — posts_post_type_idx القائم يغطي post_type بما فيها
--    'article' الجديدة، وvideo_url/video_source غير مُستخدَمين كفلتر WHERE في أي استعلام حالي أو
--    مخطَّط (يُقرآن فقط ضمن select('*') الحالي). RLS: بلا تغيير — نفس سياسة "Public read published
--    posts" (is_published = true) تغطي الأعمدة الجديدة تلقائياً (RLS يعمل على مستوى الصف لا العمود).

-- ============================================================================
-- 1) توسيع posts_post_type_check لإضافة 'article' (idempotent — لا يكرر ALTER لو 'article' موجودة
--    فعلاً ضمن تعريف القيد الحالي، نفس نمط 2026-09-20-add-driver-role-to-sessions-check.sql)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_post_type_check'
      and conrelid = 'posts'::regclass
      and pg_get_constraintdef(oid) ilike '%article%'
  ) then
    alter table posts drop constraint if exists posts_post_type_check;
    alter table posts add constraint posts_post_type_check
      check (post_type in ('post', 'reel', 'product_highlight', 'offer', 'article'));
  end if;
end $$;

-- ============================================================================
-- 2) عمودا الفيديو — يُستخدَمان فقط لـpost_type='reel'، NULL لكل الأنواع الأخرى.
--    video_source بلا CHECK قاعدة بيانات عمداً (نفس فلسفة post_media.link jsonb — Discriminated
--    Union/enum مفروض TypeScript فقط، راجع VIDEO_SOURCES في bayan/types.ts) — يسمح بإضافة منصة
--    جديدة مستقبلاً بلا Migration، القيمة 'other' تغطي أي منصة غير مُعرَّفة صراحة في الواجهة اليوم.
-- ============================================================================
alter table posts add column if not exists video_url text;
alter table posts add column if not exists video_source text;

-- ============================================================================
-- نهاية DD-024 DDL.
-- ============================================================================

-- ⚠️ للتراجع (نُفِّذ يدوياً فقط عند الحاجة، لا تشغيل تلقائي):
-- alter table posts drop column if exists video_url;
-- alter table posts drop column if exists video_source;
-- alter table posts drop constraint if exists posts_post_type_check;
-- alter table posts add constraint posts_post_type_check
--   check (post_type in ('post', 'reel', 'product_highlight', 'offer'));
