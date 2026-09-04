-- scripts/day23-bayan-schema.sql
-- اليوم 23 — بيان (Bayan): أول تنفيذ فعلي لمحرك المحتوى (CONCEPTUAL منذ الدستور v1.0).
-- BAYAN-HOME-FEED-001. راجع docs/DECISIONS.md → ADR-021 للتفصيل الكامل ومنطق كل قرار تصميم.
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس قيد الأيام 19/22) — يُلصَق هذا الملف
-- يدوياً في Supabase Dashboard → SQL Editor → Run، على بيئة dev المحلية الحالية.
--
-- ⚠️ posts/post_media/post_products.world_scope/world_id يشير لجدول worlds (خليل، اليوم 19) —
-- فلتر بيانات (أي سياق يخص هذا المحتوى)، لا علاقة له بسمة data-world البصرية
-- (WorldSlug/WORLD_THEMES، ADR-007). صفحة الخلاصة نفسها تبقى data-world="reef" دائماً.
--
-- ترتيب صارم حسب Foreign Keys: worlds (موجود، اليوم 19) → categories (موجود) → products (موجود)
--   → posts → post_media → post_products.

-- ============================================================================
-- posts — منشور واحد في الخلاصة، بإدارة platform_admin حصراً
-- ============================================================================
create table posts (
  id uuid primary key default gen_random_uuid(),
  world_scope uuid not null references worlds(id),
  category_id uuid not null references categories(id),
  post_type text not null check (post_type in ('post', 'reel', 'product_highlight', 'offer')),
  caption text,
  is_published boolean not null default false,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table posts enable row level security;

-- النمط 1 (قراءة عامة، نفس categories/products) — بيان محتوى عام، عكس worlds/user_personas
-- (النمط 2 المقفول بالكامل، بيانات هوية/صلاحيات — ADR-018). لا سياسة كتابة لـanon: كل الكتابة
-- عبر service_role من لوحة إدارة المنشورات (اليوم 24).
create policy "Public read published posts" on posts for select using (is_published = true);

create index posts_priority_created_idx on posts (priority desc, created_at desc);
create index posts_post_type_idx on posts (post_type);


-- ============================================================================
-- post_media — صور المنشور المرتَّبة (نمط إنستجرام)، كل صورة قد ترتبط بمنتج/وصفة/بلا شيء
-- ============================================================================
create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  link jsonb not null default '{"type":"none"}'::jsonb,
  created_at timestamptz not null default now()
);

alter table post_media enable row level security;

-- قراءة عامة عبر join ضمني (لا تُقرأ صور منشور غير منشور فعلياً من التطبيق، لكن السياسة نفسها
-- تسمح بقراءة أي صف — القيد الفعلي "لا تُعرَض صور منشور مسودة" مُطبَّق في bayan.service.ts، نفس
-- فلسفة orders.service.ts في التحقق من عزل المستأجرين على مستوى التطبيق لا RLS فقط، لأن post_media
-- بلا عمود is_published خاص بها). لا سياسة كتابة لـanon.
create policy "Public read post media" on post_media for select using (true);

create index post_media_post_id_idx on post_media (post_id, display_order);


-- ============================================================================
-- post_products — الرف الأفقي أسفل كل منشور (مستقل عن روابط الصور الفردية)
-- ============================================================================
create table post_products (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  product_id uuid not null references products(id),
  display_order int not null default 0
);

alter table post_products enable row level security;
create policy "Public read post products" on post_products for select using (true);

create index post_products_post_id_idx on post_products (post_id, display_order);

-- ============================================================================
-- نهاية DDL اليوم 23 — بعد تشغيله، أبلغ Claude Code للمتابعة بالبذرة والتحقق الحي.
-- ============================================================================
