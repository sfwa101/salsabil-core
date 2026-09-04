// scripts/day19-context-engine-seed-and-verify.ts
// اليوم 19 — يشغَّل بعد scripts/day19-context-engine-schema.sql (DDL يدوي عبر SQL Editor).
// يقوم فعلياً وحياً (لا افتراضياً) بثلاث مراحل ضد Supabase الحقيقي عبر service_role:
//   1) Seed صف 'individuals' في worlds (idempotent — upsert على slug)
//   2) Backfill: شخصية افتراضية في عالم 'individuals' لكل users.role='customer' الحاليين فقط
//   3) تحقق حي من كل قيد عبر محاولات إدراج فاشلة متعمَّدة (نفس منهجية ADR-010/ADR-012) —
//      UNIQUE(slug)، FK(world_id)، FK(user_id)، الفهرس الجزئي الأول، الفهرس الجزئي الثاني،
//      وقفل RLS الكامل (قراءة anon فارغة، لا استثناء).
// كل بيانات الاختبار المؤقتة (المحاولات الفاشلة لا تُنشئ صفوفاً أصلاً؛ عالم مؤقت للفهرس الثاني
// يُحذَف في النهاية) — ذاتي التنظيف بالكامل، نفس عُرف orders.integration.test.ts.
//
// التشغيل: npx tsx scripts/day19-context-engine-seed-and-verify.ts

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('✗ متغيرات بيئة Supabase ناقصة في .env.local — راجع .env.example');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

type StepResult = { step: string; ok: boolean; detail?: string };
const results: StepResult[] = [];
function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('\n=== اليوم 19 — Context Engine: Seed + Backfill + تحقق حي ===\n');

  // ---------------------------------------------------------------------
  // 0) Preflight — تحقّق أن DDL طُبِّق فعلاً قبل أي محاولة أخرى
  // ---------------------------------------------------------------------
  const preflightWorlds = await admin.from('worlds').select('id').limit(1);
  const preflightPersonas = await admin.from('user_personas').select('id').limit(1);
  const preflightSessionsCol = await admin.from('sessions').select('active_persona_id').limit(1);

  if (preflightWorlds.error || preflightPersonas.error || preflightSessionsCol.error) {
    record('0) Preflight — الجداول/العمود موجودة فعلياً', false,
      preflightWorlds.error?.message ?? preflightPersonas.error?.message ?? preflightSessionsCol.error?.message);
    console.error('\n⚠️ يبدو أن scripts/day19-context-engine-schema.sql لم يُطبَّق بعد على Supabase.');
    console.error('   الصقه في Supabase Dashboard → SQL Editor → Run، ثم أعد تشغيل هذا السكربت.\n');
    process.exit(1);
  }
  record('0) Preflight — worlds/user_personas/sessions.active_persona_id موجودة حياً', true);

  // ---------------------------------------------------------------------
  // 1) Seed — صف individuals (idempotent عبر upsert على slug)
  // ---------------------------------------------------------------------
  const { data: worldRow, error: seedError } = await admin
    .from('worlds')
    .upsert(
      { slug: 'individuals', name: 'الأفراد', description: 'العالم الافتراضي للمستخدمين الأفراد — التصفح والشراء الشخصي اليومي' },
      { onConflict: 'slug' },
    )
    .select('id, slug')
    .single();

  if (seedError || !worldRow) {
    record('1) Seed — صف individuals في worlds', false, seedError?.message);
    process.exit(1);
  }
  record('1) Seed — صف individuals في worlds', true, `id=${worldRow.id}`);
  const individualsWorldId = worldRow.id as string;

  // ---------------------------------------------------------------------
  // 2) Backfill — شخصية افتراضية لكل users.role = 'customer' الحاليين فقط
  // ---------------------------------------------------------------------
  const { data: customers, error: customersError } = await admin
    .from('users')
    .select('id')
    .eq('role', 'customer');

  if (customersError) {
    record('2) Backfill — قراءة users.role=customer', false, customersError.message);
    process.exit(1);
  }

  const { data: existingPersonas } = await admin
    .from('user_personas')
    .select('user_id')
    .eq('world_id', individualsWorldId);
  const alreadyHave = new Set((existingPersonas ?? []).map((p) => p.user_id as string));

  const toInsert = (customers ?? [])
    .filter((u) => !alreadyHave.has(u.id as string))
    .map((u) => ({ user_id: u.id as string, world_id: individualsWorldId, is_default: true }));

  if (toInsert.length > 0) {
    const { error: insertError } = await admin.from('user_personas').insert(toInsert);
    if (insertError) {
      record('2) Backfill — إدراج شخصيات جديدة', false, insertError.message);
      process.exit(1);
    }
  }
  record(
    '2) Backfill — شخصية افتراضية في individuals لكل customer',
    true,
    `عملاء إجمالاً: ${customers?.length ?? 0}، شخصيات جديدة أُنشئت: ${toInsert.length}، كانت موجودة مسبقاً: ${alreadyHave.size}`,
  );

  // ---------------------------------------------------------------------
  // 3) تحقق حي — محاولات إدراج فاشلة متعمَّدة
  // ---------------------------------------------------------------------

  // 3.a — UNIQUE(worlds.slug)
  const dupSlug = await admin.from('worlds').insert({ slug: 'individuals', name: 'تكرار متعمَّد' });
  record('3.a) رفض تكرار worlds.slug (UNIQUE)', dupSlug.error?.code === '23505', dupSlug.error?.code ?? 'نجح خطأً!');

  // 3.b — FK(user_personas.world_id)
  const fakeWorldId = '00000000-0000-0000-0000-000000000000';
  const someCustomerId = customers?.[0]?.id as string | undefined;
  if (someCustomerId) {
    const badWorldFk = await admin
      .from('user_personas')
      .insert({ user_id: someCustomerId, world_id: fakeWorldId, is_default: false });
    record('3.b) رفض user_personas.world_id غير موجود (FK)', badWorldFk.error?.code === '23503', badWorldFk.error?.code ?? 'نجح خطأً!');
  } else {
    record('3.b) رفض user_personas.world_id غير موجود (FK)', false, 'لا يوجد عميل حالي لاختباره — تخطّي');
  }

  // 3.c — FK(user_personas.user_id)
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const badUserFk = await admin
    .from('user_personas')
    .insert({ user_id: fakeUserId, world_id: individualsWorldId, is_default: false });
  record('3.c) رفض user_personas.user_id غير موجود (FK)', badUserFk.error?.code === '23503', badUserFk.error?.code ?? 'نجح خطأً!');

  // 3.d — الفهرس الجزئي الأول: شخصية افتراضية ثانية لنفس (user_id, world_id)
  if (someCustomerId) {
    const dupDefaultSameWorld = await admin
      .from('user_personas')
      .insert({ user_id: someCustomerId, world_id: individualsWorldId, is_default: true });
    record(
      '3.d) رفض شخصية افتراضية ثانية لنفس (user_id, world_id) — الفهرس الجزئي الأول',
      dupDefaultSameWorld.error?.code === '23505',
      dupDefaultSameWorld.error?.code ?? 'نجح خطأً!',
    );
  } else {
    record('3.d) الفهرس الجزئي الأول', false, 'لا يوجد عميل حالي لاختباره — تخطّي');
  }

  // 3.e — الفهرس الجزئي الثاني: شخصية افتراضية ثانية لنفس user_id في عالم آخر تماماً
  //       (يتطلب عالماً ثانياً مؤقتاً — يُحذَف في النهاية، لا يبقى أثر)
  let tempWorldId: string | undefined;
  if (someCustomerId) {
    const { data: tempWorld, error: tempWorldError } = await admin
      .from('worlds')
      .insert({ slug: `__day19_verify_temp_${Date.now()}`, name: 'عالم مؤقت للتحقق فقط' })
      .select('id')
      .single();

    if (tempWorldError || !tempWorld) {
      record('3.e) الفهرس الجزئي الثاني', false, `تعذّر إنشاء عالم مؤقت: ${tempWorldError?.message}`);
    } else {
      tempWorldId = tempWorld.id as string;
      const dupDefaultOtherWorld = await admin
        .from('user_personas')
        .insert({ user_id: someCustomerId, world_id: tempWorldId, is_default: true });
      record(
        '3.e) رفض شخصية افتراضية ثانية لنفس user_id عبر عالم آخر — الفهرس الجزئي الثاني',
        dupDefaultOtherWorld.error?.code === '23505',
        dupDefaultOtherWorld.error?.code ?? 'نجح خطأً!',
      );
    }
  } else {
    record('3.e) الفهرس الجزئي الثاني', false, 'لا يوجد عميل حالي لاختباره — تخطّي');
  }

  // 3.f — قفل RLS الكامل: قراءة anon يجب أن تعود فارغة، لا بيانات حقيقية
  const anonWorlds = await anon.from('worlds').select('id');
  const anonPersonas = await anon.from('user_personas').select('id');
  record(
    '3.f) قفل RLS — anon لا يقرأ أي صف من worlds/user_personas',
    !anonWorlds.error && !anonPersonas.error && (anonWorlds.data?.length ?? 0) === 0 && (anonPersonas.data?.length ?? 0) === 0,
    `worlds: ${anonWorlds.data?.length ?? 'error'}, user_personas: ${anonPersonas.data?.length ?? 'error'}`,
  );

  // ---------------------------------------------------------------------
  // تنظيف — حذف العالم المؤقت فقط (كل المحاولات الفاشلة أعلاه لم تُنشئ صفوفاً أصلاً)
  // ---------------------------------------------------------------------
  if (tempWorldId) {
    await admin.from('worlds').delete().eq('id', tempWorldId);
  }

  // ---------------------------------------------------------------------
  // التقرير النهائي
  // ---------------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== النتيجة: ${results.length - failed.length}/${results.length} نجحت ===\n`);
  if (failed.length > 0) {
    console.error('خطوات فشلت:', failed.map((f) => f.step).join(', '));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ خطأ غير متوقَّع:', err);
  process.exit(1);
});
