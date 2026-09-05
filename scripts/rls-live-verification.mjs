// scripts/rls-live-verification.mjs
// أداة تحقق حي دائمة لِـRLS الفعلي على Supabase — تقارن سلوك عميل anon الحقيقي بما هو موثَّق في
// docs/DATABASE.md §6 لكل جدول من الـ17 القائمة، عبر عميلين حقيقيين (anon و service_role) لا
// افتراضاً من قراءة DDL وحده.
//
// ⚠️ ملاحظة نزاهة (GUARDIAN-FINDINGS-REMEDIATION-001، 2026-09-05): هذا الملف **ليس** استرجاعاً
// لسكربت "scratch_rls_verify.mjs" سابق — لا أثر لذلك الملف في هذا المستودع ولا في تاريخ Git، ولا
// دليل محفوظ (نص سكربت، سجل تشغيل) على الرقم "17/17" الذي استند إليه ADR-022 عند كتابته. لا يُدَّعى
// هنا استعادة نفس الفحوصات الأصلية بالضبط — هذا تصميم جديد كامل، بنفس الروح (17 فحصاً، واحد لكل
// جدول)، مبني من الصفر على الأنماط الموثَّقة فعلياً في docs/DATABASE.md §6، ونتائجه أدناه هي أول
// دليل محفوظ فعلياً على حالة RLS الحية — لا تكراراً لادعاء سابق غير موثَّق.
//
// شرط تشغيل: `node scripts/rls-live-verification.mjs` (لا حاجة لخادم Next.js — اتصال مباشر بـ
// Supabase عبر service_role/anon فقط، نفس نمط scripts/day23-bayan-seed-and-verify.ts). قراءة فقط
// بالكامل — لا كتابة ولا حذف، آمن للتشغيل على أي بيئة (dev/staging) بلا أثر جانبي.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('✗ متغيرات بيئة Supabase ناقصة في .env.local (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const anon = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const results = [];
function record(table, ok, detail) {
  results.push({ table, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${table} — ${detail}`);
}

// النمط 1 (docs/DATABASE.md §6): قراءة عامة بلا فلترة صفوف — anon يجب أن يرى بالضبط ما يراه
// service_role (لا فرق عدد).
const PUBLIC_UNFILTERED = ['categories', 'products', 'inventory', 'post_media', 'post_products'];

// posts نمط 1 أيضاً لكن مفلترة (is_published = true فقط) — يُختبَر منفصلاً أدناه.
const PUBLIC_FILTERED = ['posts'];

// النمط 2 + سياسة users الميتة (auth.uid() بلا مصادقة حقيقية) — anon يجب أن يرى 0 صف دائماً،
// بصرف النظر عن عدد الصفوف الفعلي (المُتحقَّق عبر service_role لتفادي فحص زائف عند جدول فارغ).
const FULLY_LOCKED = [
  'users', 'merchants', 'carts', 'cart_items', 'orders', 'order_items',
  'order_status_history', 'sessions', 'audit_log', 'worlds', 'user_personas',
];

async function checkPublicUnfiltered(table) {
  const [anonRes, adminRes] = await Promise.all([
    anon.from(table).select('*', { count: 'exact', head: true }),
    admin.from(table).select('*', { count: 'exact', head: true }),
  ]);
  if (anonRes.error) return record(table, false, `anon رفض بخطأ غير متوقَّع: ${anonRes.error.message}`);
  if (adminRes.error) return record(table, false, `service_role رفض بخطأ غير متوقَّع: ${adminRes.error.message}`);
  const ok = anonRes.count === adminRes.count;
  record(table, ok, ok
    ? `anon يرى نفس عدد service_role بالضبط (${anonRes.count} صف) — قراءة عامة غير مفلترة كما هو موثَّق`
    : `تعارض: anon رأى ${anonRes.count} مقابل ${adminRes.count} فعلياً — RLS أضيق أو أوسع من الموثَّق`);
}

async function checkPublicFiltered(table, filterColumn) {
  const [anonRes, adminPublishedRes] = await Promise.all([
    anon.from(table).select('*', { count: 'exact', head: true }),
    admin.from(table).select('*', { count: 'exact', head: true }).eq(filterColumn, true),
  ]);
  if (anonRes.error) return record(table, false, `anon رفض بخطأ غير متوقَّع: ${anonRes.error.message}`);
  if (adminPublishedRes.error) return record(table, false, `service_role رفض بخطأ غير متوقَّع: ${adminPublishedRes.error.message}`);
  const ok = anonRes.count === adminPublishedRes.count;
  record(table, ok, ok
    ? `anon يرى بالضبط الصفوف المنشورة (${anonRes.count}) — لا مسودات مسرَّبة`
    : `تعارض: anon رأى ${anonRes.count} بينما المنشور فعلياً ${adminPublishedRes.count} — احتمال تسرّب مسودة أو حجب زائد`);
}

async function checkFullyLocked(table) {
  const [anonRes, adminRes] = await Promise.all([
    anon.from(table).select('*', { count: 'exact', head: true }),
    admin.from(table).select('*', { count: 'exact', head: true }),
  ]);
  if (anonRes.error) return record(table, false, `anon رفض بخطأ غير متوقَّع (يُفترَض فلترة صامتة لا خطأ): ${anonRes.error.message}`);
  if (adminRes.error) return record(table, false, `service_role رفض بخطأ غير متوقَّع: ${adminRes.error.message}`);
  const ok = anonRes.count === 0;
  const meaningfulness = adminRes.count > 0 ? `فحص فعلي غير زائف — ${adminRes.count} صف حقيقي محجوب عن anon` : 'الجدول فارغ فعلياً الآن — فحص غير حاسم (لا صفوف لإخفائها)، لكن غياب أي خطأ يؤكد RLS مفعَّل';
  record(table, ok, ok ? `anon لا يرى شيئاً كما هو مطلوب — ${meaningfulness}` : `⚠️ خطر: anon رأى ${anonRes.count} صف من أصل ${adminRes.count} — RLS لا يحجب فعلياً`);
}

async function main() {
  console.log('\n=== تحقق RLS الحي — 17 جدولاً (GUARDIAN-FINDINGS-REMEDIATION-001) ===\n');

  for (const table of PUBLIC_UNFILTERED) await checkPublicUnfiltered(table);
  await checkPublicFiltered('posts', 'is_published');
  for (const table of FULLY_LOCKED) await checkFullyLocked(table);

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n=== النتيجة: ${passed}/${total} ===\n`);
  if (passed !== total) {
    console.error('فشل واحد أو أكثر — راجع التفاصيل أعلاه قبل اعتماد أي ادعاء "RLS مطابق للموثَّق".');
    process.exit(1);
  }
}

main();
