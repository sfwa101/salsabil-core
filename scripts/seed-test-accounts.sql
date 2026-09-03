-- scripts/seed-test-accounts.sql
-- حسابات وبيانات اختبار أولية — يُشغَّل بعد scripts/schema-setup.sql على مشروع Supabase فارغ.
-- منفصل عمداً عن ملف المخطط (بيانات وهمية قابلة لإعادة التوليد، لا بنية جداول).
--
-- كل إدراج مبني على مفاتيح طبيعية (phone/slug/name) عبر subqueries — لا UUID مُدرَج يدوياً — حتى
-- يعمل الملف بلا تعديل على أي مشروع Supabase جديد (تولّد gen_random_uuid() المعرّفات تلقائياً).
-- كل إدراج idempotent (آمن لإعادة التشغيل) عبر ON CONFLICT/NOT EXISTS.
--
-- ⚠️ أرقام الهاتف (قرار نهائي، PRODUCTION-PREP-002): 01099999990/01099999991 — مختلفة عمداً عن
-- أرقام التطوير المحلي (01000000000/01000000001) لمنع الخلط البصري بين البيئتين (مثال: مراقبة
-- مشروعَي Supabase لـdev وstaging في تبويبين متجاورين). النمط: بادئة 0109 مميّزة + تسلسل 9
-- متكرر لا يظهر في أي بيانات إنتاج حقيقية مستقبلاً.
--
-- ⚠️ هذه الحسابات لا تُستخدَم إطلاقاً من ملفات integration tests في هذا المستودع
-- (orders.integration.test.ts، merchant.integration.test.ts، admin.integration.test.ts،
-- reef-city-journey.integration.test.ts) — تلك تفترض بالاسم أرقام التطوير المحلي
-- (01000000000/01000000001) وتعمل حصرياً ضد قاعدة بيانات التطوير المحلية عبر .env.local، لا ضد
-- staging إطلاقاً. لا تعارض بين القرارين طالما هذا الفصل قائم — إن شُغِّلت هذه الاختبارات مستقبلاً
-- ضد staging (مثال: CI)، يلزم حينها تحديثها لاستخدام 01099999990/01099999991 بدلاً من ذلك.

begin;

-- 1) القسم التجريبي (حي الطعام اليومي) — نفس بيانات التطوير المحلي حرفياً
insert into categories (name, slug, display_order, is_active)
values ('حي الطعام اليومي', 'daily-food', 1, true)
on conflict (slug) do nothing;

-- 2) مالك التاجر التجريبي — دور merchant_owner، هاتف بلا كلمة مرور (ADR-012)
insert into users (full_name, phone, role)
values ('تاجر تجريبي — Staging', '01099999990', 'merchant_owner')
on conflict (phone) do nothing;

-- 3) التاجر التجريبي نفسه (owner_id عبر الهاتف أعلاه) — نشط منذ الإنشاء
insert into merchants (owner_id, business_name, phone, slug, commission_rate, is_active)
select u.id, 'محل الدواجن التجريبي — Staging', '01099999990', 'poultry-test', 12, true
from users u
where u.phone = '01099999990'
on conflict (slug) do nothing;

-- 4) المنتج التجريبي (دجاجة كاملة طازجة) — نفس الأسعار/الخيارات المستخدَمة في كل اختبارات
--    التكامل الحية بالضبط (base_price 120، small -20 = 100، large +30 = 150)
insert into products (category_id, tenant_id, name, base_price, unit, options, is_active)
select c.id, m.id, 'دجاجة كاملة طازجة', 120, 'piece',
  '[
    {"id": "small", "type": "size", "label": "صغير (800-1000جم)", "priceModifier": -20},
    {"id": "medium", "type": "size", "label": "متوسط (1000-1500جم)", "priceModifier": 0},
    {"id": "large", "type": "size", "label": "كبير (1500-2000جم)", "priceModifier": 30}
  ]'::jsonb,
  true
from categories c
join merchants m on m.slug = 'poultry-test'
where c.slug = 'daily-food'
  and not exists (
    select 1 from products p where p.name = 'دجاجة كاملة طازجة' and p.tenant_id = m.id
  );

-- 5) مخزون المنتج التجريبي — 10 وحدات (نفس القيمة التي تُعيد كل اختبارات التكامل ضبطها إليها)
insert into inventory (product_id, quantity_available)
select p.id, 10
from products p
where p.name = 'دجاجة كاملة طازجة'
on conflict (product_id) do update set quantity_available = 10, updated_at = now();

-- 6) حساب مدير المنصة التجريبي — دور platform_admin، نفس نمط اليوم 11 (ADR-013)
insert into users (full_name, phone, role)
values ('مدير المنصة (تجريبي) — Staging', '01099999991', 'platform_admin')
on conflict (phone) do nothing;

commit;
