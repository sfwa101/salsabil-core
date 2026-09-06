// scripts/day31-responsive-verify.ts
// اليوم 31 — تخطيط Responsive لخلاصة بيان (BAYAN-HOME-FEED-001): تحقُّق حي على ثلاثة أحجام حقيقية
// (375×667 هاتف، 768×1024 تابلت/md، 1440×900 ديسكتوب/xl) ضد صفحة `/` الحقيقية. يزرع بيانات حقيقية
// صغيرة ذاتية التنظيف (نفس منهجية scripts/day27-feed-rendering-verify.ts)، ثم يتحقق لكل حجم من:
// لا انسكاب أفقي، عدد أعمدة شبكة الخلاصة يطابق المتوقَّع، ظهور/اختفاء HeaderSearchBar مقابل زر بحث
// FeedTopBar بحسب الحجم، سلوك BottomSheet (سفلي بعرض كامل على الموبايل مقابل Modal مُمركَز من md)،
// وWorldSwitcher يعمل بلا خطأ على الأحجام الثلاثة. دائم (لا يُحذف بعد التحقُّق) — يختبر صفحة حقيقية
// حيّة، نفس نمط الأيام 26-29.
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day31-responsive-verify.ts

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

const VIEWPORTS = [
  { name: 'هاتف (375×667)', width: 375, height: 667, expectedColumns: 1, expectSearchBarVisible: false, expectFeedTopBarSearchVisible: true },
  { name: 'تابلت/md (768×1024)', width: 768, height: 1024, expectedColumns: 2, expectSearchBarVisible: false, expectFeedTopBarSearchVisible: true },
  { name: 'ديسكتوب/xl (1440×900)', width: 1440, height: 900, expectedColumns: 3, expectSearchBarVisible: true, expectFeedTopBarSearchVisible: false },
];

async function main() {
  console.log(`\n=== اليوم 31 — Responsive Pass: تحقُّق حي كامل — ${BASE_URL} ===\n`);
  const runId = Date.now();
  const seededPostIds: string[] = [];

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: product, error: productErr } = await admin.from('products').select('id, category_id').eq('is_active', true).limit(1).single();
  if (productErr || !product) {
    console.error('✗ لا يوجد منتج نشط واحد في قاعدة البيانات — لا يمكن اختبار BottomSheet.');
    process.exit(1);
  }
  const categoryId = product.category_id as string;
  const productId = product.id as string;

  try {
    // ---------------------------------------------------------------------
    // 1) Seed — 6 منشورات (كافٍ لملء صفين كاملين عند 3 أعمدة) بأولويات مضخَّمة لتصدّر أي محتوى قائم
    // ---------------------------------------------------------------------
    const publishedCount = 6;
    const PRIORITY_BASE = 1_000_000;
    const rows = Array.from({ length: publishedCount }, (_, i) => ({
      world_scope: world.id,
      category_id: categoryId,
      post_type: 'post' as const,
      caption: `يوم31-${runId}-${publishedCount - i}`,
      is_published: true,
      priority: PRIORITY_BASE + (publishedCount - i),
    }));
    const { data: insertedPosts, error: insertErr } = await admin.from('posts').insert(rows).select('id, priority');
    if (insertErr) throw insertErr;
    seededPostIds.push(...insertedPosts.map((p) => p.id as string));

    // صورة مرتبطة بمنتج على أول منشور (priority الأعلى) — تفتح BottomSheet وضع "منتج" عند النقر
    const firstPostId = insertedPosts.find((p) => p.priority === PRIORITY_BASE + publishedCount)!.id as string;
    const { error: mediaErr } = await admin
      .from('post_media')
      .insert({ post_id: firstPostId, image_url: 'https://placehold.co/600x600.jpg', display_order: 0, link: { type: 'product', productId } });
    if (mediaErr) throw mediaErr;

    record('1) Seed — 6 منشورات منشورة + صورة مرتبطة بمنتج على الأول', true, `عدد: ${insertedPosts.length}`);

    const browser = await chromium.launch();

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

      try {
        const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
        record(`2) [${vp.name}] فتح الصفحة الرئيسية`, response?.status() === 200, `HTTP ${response?.status()}`);

        const captionLocator = page.locator(`article:has-text("يوم31-${runId}-")`);
        await captionLocator.first().waitFor({ state: 'visible', timeout: 10000 });

        // ---------------------------------------------------------------------
        // 3) لا انسكاب أفقي — عرض المستند لا يتجاوز عرض الـviewport (هامش 1px لتقريب المتصفح)
        // ---------------------------------------------------------------------
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        record(`3) [${vp.name}] لا انسكاب أفقي (scrollWidth ≈ عرض الـviewport)`, scrollWidth <= vp.width + 1, `scrollWidth: ${scrollWidth}, viewport: ${vp.width}`);

        // ---------------------------------------------------------------------
        // 4) عدد أعمدة شبكة الخلاصة يطابق المتوقَّع — مقارنة موضع Y لأول عنصرين: نفس الصف (Y متطابق
        // تقريباً) يعني عمودين على الأقل؛ العمود الثالث (لو وُجد) يُتحقَّق بنفس المنطق مع العنصر الثالث
        // ---------------------------------------------------------------------
        const boxes = await Promise.all([0, 1, 2].map((i) => captionLocator.nth(i).boundingBox()));
        const [box0, box1, box2] = boxes;
        const sameRow = (a: { y: number } | null, b: { y: number } | null) => !!a && !!b && Math.abs(a.y - b.y) < 5;
        let actualColumns = 1;
        if (sameRow(box0, box1)) actualColumns = 2;
        if (actualColumns === 2 && sameRow(box1, box2)) actualColumns = 3;
        record(
          `4) [${vp.name}] عدد أعمدة شبكة الخلاصة = ${vp.expectedColumns}`,
          actualColumns === vp.expectedColumns,
          `فعلي: ${actualColumns}, متوقَّع: ${vp.expectedColumns} — box0:${JSON.stringify(box0)} box1:${JSON.stringify(box1)} box2:${JSON.stringify(box2)}`
        );

        // ---------------------------------------------------------------------
        // 5) HeaderSearchBar مقابل زر بحث FeedTopBar — ظهور حصري بحسب الحجم (لا ازدواج، لا غياب كامل)
        // ---------------------------------------------------------------------
        const headerSearchVisible = await page.locator('input[type="search"]').isVisible().catch(() => false);
        record(
          `5أ) [${vp.name}] HeaderSearchBar ${vp.expectSearchBarVisible ? 'ظاهر' : 'مخفي'} كما متوقَّع`,
          headerSearchVisible === vp.expectSearchBarVisible,
          `فعلي: ${headerSearchVisible}`
        );
        const feedTopBarSearchVisible = await page.locator('button[aria-label="بحث"]').isVisible().catch(() => false);
        record(
          `5ب) [${vp.name}] زر بحث FeedTopBar ${vp.expectFeedTopBarSearchVisible ? 'ظاهر' : 'مخفي'} كما متوقَّع`,
          feedTopBarSearchVisible === vp.expectFeedTopBarSearchVisible,
          `فعلي: ${feedTopBarSearchVisible}`
        );

        // ---------------------------------------------------------------------
        // 6) BottomSheet — سفلي بعرض كامل على الموبايل (md غير مُفعَّل)، Modal مُمركَز من md فصاعداً
        // ---------------------------------------------------------------------
        await captionLocator.first().locator('img').first().click();
        const sheetPanel = page.locator('h2:has-text("تفاصيل المنتج")').locator('xpath=ancestor::div[contains(@class,"rounded-t-2xl")]');
        await sheetPanel.waitFor({ state: 'visible', timeout: 5000 });
        const sheetBox = await sheetPanel.boundingBox();
        const isMobileLayout = vp.width < 768;
        const sheetLooksCorrect = !!sheetBox && (isMobileLayout ? sheetBox.width >= vp.width - 2 : sheetBox.width < vp.width - 2);
        record(
          `6) [${vp.name}] BottomSheet — ${isMobileLayout ? 'سفلي بعرض كامل' : 'Modal مُمركَز أضيق من الشاشة'}`,
          sheetLooksCorrect,
          `sheetBox: ${JSON.stringify(sheetBox)}, viewport width: ${vp.width}`
        );
        await page.keyboard.press('Escape');
        await sheetPanel.waitFor({ state: 'detached', timeout: 3000 });

        // ---------------------------------------------------------------------
        // 7) WorldSwitcher يعمل بلا خطأ — فتح/إغلاق
        // ---------------------------------------------------------------------
        await page.locator('button[aria-label="تبديل العالم"]').click();
        const worldPanel = page.locator('h2:has-text("اختر عالمك")');
        await worldPanel.waitFor({ state: 'visible', timeout: 5000 });
        // Escape لا نقر الخلفية — الخلفية بعرض الشاشة الكاملة والصندوق المُمركَز يقع بالضبط فوق
        // مركزها، فنقر "منتصف" عنصر الخلفية يُصادف دائماً الصندوق المرسوم فوقها (فخّ اختبار، لا خلل
        // واجهة حقيقي). WorldSwitcher.tsx يستمع لـEscape فعلياً (نفس آلية BottomSheet أعلاه).
        await page.keyboard.press('Escape');
        await worldPanel.waitFor({ state: 'detached', timeout: 3000 });
        record(`7) [${vp.name}] WorldSwitcher يفتح ويُغلَق بلا خطأ`, true);

        record(`8) [${vp.name}] بلا أخطاء Console طوال الرحلة`, consoleErrors.length === 0, consoleErrors.join(' | '));
      } finally {
        await context.close();
      }
    }

    await browser.close();
  } finally {
    if (seededPostIds.length > 0) {
      await admin.from('posts').delete().in('id', seededPostIds);
    }
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
