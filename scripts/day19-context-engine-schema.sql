-- scripts/day19-context-engine-schema.sql
-- اليوم 19 — Context Engine: جدولا worlds و user_personas + عمود sessions.active_persona_id
-- راجع docs/DECISIONS.md → CONFLICT-006 لبوابة القرار، docs/DATABASE.md §4 للتوثيق الكامل والتفريق
-- الصريح عن WorldSlug/WORLD_THEMES (src/config/theme-registry.ts) — لا علاقة بنيوية بين الاثنين.
--
-- ⚠️ لا نظام Migrations رسمي بعد (نفس قيد docs/DATABASE.md §8) — يُلصَق هذا الملف يدوياً في
-- Supabase Dashboard → SQL Editor → Run، على بيئة dev المحلية الحالية (لا staging، لم يُطلَب).
-- idempotent جزئياً: create table بلا IF NOT EXISTS عمداً (فشل صريح أفضل من تجاوز صامت لمخطط
-- مختلف موجود مسبقاً — نفس فلسفة scripts/schema-setup.sql)، لكن ALTER TABLE ADD COLUMN يُفشِل
-- بوضوح أيضاً إن أُعيد تشغيله على عمود موجود بالفعل (متعمَّد، لا IF NOT EXISTS هناك أيضاً).

-- ============================================================================
-- worlds — اليوم 19 (Context Engine، أول تنفيذ فعلي لِـ ideas/CONTEXTUAL_WORLDS_RFC.md)
-- صف واحد فقط اليوم ('individuals') — راجع CONFLICT-006 لسبب حصر النطاق
-- ============================================================================
create table worlds (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table worlds enable row level security;
-- بلا أي policy — قفل كامل، نفس النمط 2 المطبَّق على merchants/orders/carts/audit_log (تأكيد
-- المؤسس الصريح: worlds تحدد الصلاحيات، بيانات حساسة، لا قراءة عامة إطلاقاً).


-- ============================================================================
-- user_personas — اليوم 19، يربط مستخدماً بعالم كشخصية محتملة (persona)
-- ============================================================================
create table user_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  world_id uuid not null references worlds(id),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table user_personas enable row level security;
-- بلا أي policy — قفل كامل، نفس النمط 2 (شخصية = هوية، بيانات حساسة).

-- الفهرس الجزئي الأول: على الأكثر شخصية افتراضية واحدة لكل (مستخدم، عالم) — يبقى صحيحاً حتى لو
-- تغيّرت القاعدة مستقبلاً للسماح بأكثر من شخصية افتراضية لكل مستخدم عبر عوالم مختلفة (مثال:
-- افتراضية في عالم الأفراد + افتراضية أخرى في عالم أعمال مستقبلي).
create unique index user_personas_default_per_world_uidx
  on user_personas (user_id, world_id)
  where is_default = true;

-- الفهرس الجزئي الثاني: على الأكثر شخصية افتراضية واحدة لكل مستخدم عبر كل العوالم مجتمعة —
-- القيد الفعلي الساري اليوم (عالم واحد فقط)، يضمن أن sessions.active_persona_id له افتراضي
-- واحد لا لبس فيه يقع عليه الاختيار تلقائياً. لا يُلغي الفهرس الأول عند تخفيف هذه القاعدة لاحقاً
-- (يكفي حذف هذا الفهرس وحده، الأول يبقى كما هو).
create unique index user_personas_one_default_uidx
  on user_personas (user_id)
  where is_default = true;


-- ============================================================================
-- sessions.active_persona_id — اليوم 19، عمود جديد على جدول sessions القائم (اليوم 10، ADR-012)
-- ============================================================================
alter table sessions
  add column active_persona_id uuid references user_personas(id);
-- nullable عمداً — جلسات لا تُدير سياق شخصية بعد (تسجيل دخول تاجر/إدارة الحاليان) تبقى null.

-- ============================================================================
-- نهاية DDL اليوم 19 — بعد تشغيله، أبلغ Claude Code للمتابعة ببرنامج seed/backfill/تحقق حي
-- (scripts/day19-context-engine-seed-and-verify.ts) — لا يتطلب لصقاً يدوياً إضافياً.
-- ============================================================================
