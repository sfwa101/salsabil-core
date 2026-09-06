// scripts/day29-world-switcher-verify.ts
// اليوم 29 — مبدّل العوالم (BAYAN-HOME-FEED-001): تحقُّق حي على viewport هاتف حقيقي (390×844) ضد
// حالة القاعدة الفعلية الحالية (صف واحد فقط، individuals نشط) — بلا زرع بيانات إضافية عمداً، نفس
// نطاق التحقُّق المطلوب صراحة في موجّه اليوم ("مع صف واحد فقط مزروع"). سلوك "عالم مستقبلي معطَّل +
// توست قريباً" منطق شرطي بسيط (`FUNCTIONAL_WORLD_SLUGS.includes`) يُراجَع كوداً لا حياً — لا صف
// آخر موجود فعلياً في القاعدة، وزرع صف تجريبي هنا يخالف نص الموجّه صراحة.
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day29-world-switcher-verify.ts

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');
const { chromium } = await import('playwright');

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('✗ متغيرات بيئة Supabase ناقصة في .env.local');
  process.exit(1);
}
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

type StepResult = { step: string; ok: boolean; detail?: string };
const results: StepResult[] = [];
function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\n=== اليوم 29 — مبدّل العوالم: تحقُّق حي كامل — ${BASE_URL} ===\n`);

  // Preflight — تأكيد صريح أن حالة القاعدة تطابق افتراض الموجّه (صف واحد فقط نشط)
  const { data: activeWorlds, error: worldsErr } = await admin.from('worlds').select('id, slug, name').eq('is_active', true);
  if (worldsErr) throw worldsErr;
  if (!activeWorlds || activeWorlds.length !== 1 || activeWorlds[0].slug !== 'individuals') {
    console.error(`✗ حالة القاعدة لا تطابق افتراض هذا التحقُّق (صف واحد فقط، individuals). الحالي: ${JSON.stringify(activeWorlds)}`);
    process.exit(1);
  }
  record('0) Preflight — صف واحد فقط نشط في worlds (individuals)، يطابق افتراض الموجّه', true);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  try {
    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    record('1) فتح الصفحة الرئيسية', response?.status() === 200, `HTTP ${response?.status()}`);

    // ---------------------------------------------------------------------
    // 2) فتح المبدّل — الأنيميشن يعمل بسلاسة (لا يظهر مفتوحاً بالكامل فوراً، ينتقل تدريجياً)
    // ---------------------------------------------------------------------
    const switcherButton = page.locator('button[aria-label="تبديل العالم"]');
    await switcherButton.waitFor({ state: 'visible', timeout: 5000 });
    await switcherButton.click();

    const panel = page.locator('h2', { hasText: 'اختر عالمك' }).locator('xpath=..');
    await panel.waitFor({ state: 'attached', timeout: 3000 });

    // قراءة الشفافية فوراً بعد الفتح، ثم بعد استقرار الانتقال — يجب أن تختلفا (إثبات انتقال فعلي
    // لا ظهور فوري كامل بلا حركة)
    const opacityImmediate = await panel.evaluate((el) => getComputedStyle(el).opacity);
    await page.waitForTimeout(400); // مدة الانتقال (300ms) + هامش استقرار
    const opacityAfterTransition = await panel.evaluate((el) => getComputedStyle(el).opacity);
    record(
      '2) فتح المبدّل يعمل بانتقال متدرّج فعلي (الشفافية تتغيّر بمرور الوقت لا قفزة فورية لـ1)',
      opacityAfterTransition === '1' && opacityImmediate !== opacityAfterTransition,
      `فوري: ${opacityImmediate}, بعد الاستقرار: ${opacityAfterTransition}`
    );

    // ---------------------------------------------------------------------
    // 2.ب) الخلفية المعتمة تغطي كامل الشاشة فعلياً — لا انحصار داخل حدود سلف يحمل CSS transform
    // (اكتُشف حياً أثناء البناء: ScrollHideBar، اليوم 28، ينشئ "containing block" جديداً لـ
    // position:fixed لأي عنصر لم يُصيَّر عبر Portal — أُصلِح عبر createPortal إلى document.body)
    // ---------------------------------------------------------------------
    const backdropBox = await page.locator('button[aria-label="إغلاق"]').first().boundingBox();
    const viewportSize = page.viewportSize();
    const backdropCoversViewport =
      !!backdropBox && !!viewportSize && backdropBox.height >= viewportSize.height - 2 && backdropBox.width >= viewportSize.width - 2;
    record(
      '2.ب) الخلفية المعتمة تغطي كامل الشاشة (لا انحصار داخل containing block لسلف مُحوَّل)',
      backdropCoversViewport,
      `الخلفية: ${JSON.stringify(backdropBox)}, الشاشة: ${JSON.stringify(viewportSize)}`
    );

    // ---------------------------------------------------------------------
    // 3) عدد الدوائر المعروضة يطابق عدد الصفوف النشطة فعلياً في القاعدة (1) — لا Hardcode
    // ---------------------------------------------------------------------
    const worldCircles = page.locator('h2', { hasText: 'اختر عالمك' }).locator('xpath=..').locator('button');
    await page.waitForFunction(
      () => {
        const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent === 'اختر عالمك');
        return h2 ? h2.parentElement!.querySelectorAll('button').length > 0 : false;
      },
      { timeout: 5000 }
    );
    const circleCount = await worldCircles.count();
    record('3) عدد الدوائر المعروضة يطابق عدد الصفوف النشطة في القاعدة (1)', circleCount === activeWorlds.length, `المعروض: ${circleCount}, القاعدة: ${activeWorlds.length}`);

    // ---------------------------------------------------------------------
    // 4) عالم "الأفراد" النشط يظهر بلا شارة "قريباً" (مفعَّل وظيفياً)
    // ---------------------------------------------------------------------
    const individualsCircle = page.locator('button', { hasText: 'الأفراد' });
    const individualsComingSoonBadge = await individualsCircle.locator('text=قريباً').count();
    record('4) عالم "الأفراد" النشط بلا شارة "قريباً" (مفعَّل فعلياً للنقر)', individualsComingSoonBadge === 0);

    // ---------------------------------------------------------------------
    // 5) النقر على العالم الوحيد النشط يُغلِق الواجهة بلا خطأ ولا تنقل (نفس الصفحة، لأنه العالم الحالي)
    // ---------------------------------------------------------------------
    const urlBeforeClick = page.url();
    await individualsCircle.click();
    await page.locator('h2', { hasText: 'اختر عالمك' }).waitFor({ state: 'detached', timeout: 3000 });
    const urlAfterClick = page.url();
    record('5) النقر على "الأفراد" يُغلِق الواجهة بلا خطأ وبلا تنقل فعلي (نفس الرابط)', urlAfterClick === urlBeforeClick, `قبل: ${urlBeforeClick}, بعد: ${urlAfterClick}`);

    record('6) بلا أخطاء Console/صفحة غير متوقَّعة طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));
  } finally {
    await browser.close();
  }

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
