// scripts/day27-feed-rendering-verify.ts
// اليوم 27 — الخلاصة الفعلية (BAYAN-HOME-FEED-001): يزرع 13 منشوراً منشوراً بأولويات مختلفة صراحة +
// منشوراً مسودة واحداً (يجب ألا يظهر إطلاقاً)، ثم يتحقق حياً عبر متصفح حقيقي من الثلاثة المطلوبة
// صراحة في موجّه اليوم: (أ) التمرير للأسفل يحمّل صفحة ثانية فعلية (IntersectionObserver + .range())،
// (ب) المسودة لا تظهر إطلاقاً مهما بلغ عدد المنشورات المُحمَّلة، (ج) ترتيب المنشورات المعروضة يطابق
// priority الذي حدَّده الأدمن بالضبط (تنازلياً). ذاتي التنظيف بالكامل. نفس منهجية
// scripts/day24-bayan-admin-posts-verify.ts (Playwright + service_role مباشر) وscripts/day23-bayan-seed-and-verify.ts
// (Seed حقيقي عبر service_role).
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day27-feed-rendering-verify.ts

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
const FEED_PAGE_SIZE = 10; // يطابق DEFAULT_FEED_PAGE_SIZE في bayan.service.ts

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
  console.log(`\n=== اليوم 27 — خلاصة بيان: تحقُّق حي كامل — ${BASE_URL} ===\n`);
  const runId = Date.now();
  const seededPostIds: string[] = [];

  // تجهيز: عالم individuals + تصنيف/منتج حقيقيين موجودين أصلاً (نفس بيانات الاختبار المشتركة)
  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: product, error: productErr } = await admin.from('products').select('id, category_id').eq('is_active', true).limit(1).single();
  if (productErr || !product) {
    console.error('✗ لا يوجد منتج نشط واحد في قاعدة البيانات — لا يمكن اختبار رف المنتجات المرتبط.');
    process.exit(1);
  }
  const categoryId = product.category_id as string;
  const productId = product.id as string;

  try {
    // ---------------------------------------------------------------------
    // 1) Seed — 13 منشوراً منشوراً بأولويات فريدة تنازلياً. priority الفعلي في القاعدة مُضخَّم عمداً
    // (1,000,000+) ليتصدَّر أي محتوى حقيقي موجود مسبقاً بأولويات عادية (0-99) — يضمن اختباراً
    // حتمياً للترتيب/التقسيم بصفحات بصرف النظر عن حالة القاعدة الحالية، بلا حاجة لفحصها أولاً. رقم
    // "الأولوية" الظاهر في caption للتحقق البصري هو الرتبة المقروءة (13..1) لا القيمة المضخَّمة نفسها.
    // منشور المسودة يحمل priority أعلى من الجميع (2,000,000) — لو ظهر لكان أول عنصر في الصفحة
    // بلا منازع، فهذا أوضح فحص ممكن لـ"لا تُعرَض إلا المنشورات المنشورة".
    const publishedCount = 13;
    const PRIORITY_BASE = 1_000_000;
    const rows = Array.from({ length: publishedCount }, (_, i) => ({
      world_scope: world.id,
      category_id: categoryId,
      post_type: 'post' as const,
      caption: `يوم27-${runId}-أولوية-${publishedCount - i}`,
      is_published: true,
      priority: PRIORITY_BASE + (publishedCount - i), // تنازلياً: أول عنصر أعلى قيمة وهكذا
    }));

    const { data: insertedPosts, error: insertErr } = await admin.from('posts').insert(rows).select('id, priority, caption');
    if (insertErr) throw insertErr;
    seededPostIds.push(...insertedPosts.map((p) => p.id as string));

    const { data: draftPost, error: draftErr } = await admin
      .from('posts')
      .insert({
        world_scope: world.id,
        category_id: categoryId,
        post_type: 'post',
        caption: `يوم27-${runId}-مسودة-لا-يجب-أن-تظهر`,
        is_published: false,
        priority: 2_000_000,
      })
      .select('id')
      .single();
    if (draftErr) throw draftErr;
    seededPostIds.push(draftPost.id as string);

    // صورة + رف منتج مرتبط بأول منشور فقط (كافٍ للتحقق من ظهور الرف)
    const firstPostId = insertedPosts.find((p) => p.priority === PRIORITY_BASE + publishedCount)!.id as string;
    const { error: mediaErr } = await admin
      .from('post_media')
      .insert({ post_id: firstPostId, image_url: 'https://placehold.co/600x600.jpg', display_order: 0, link: { type: 'none' } });
    if (mediaErr) throw mediaErr;
    const { error: shelfErr } = await admin.from('post_products').insert({ post_id: firstPostId, product_id: productId, display_order: 0 });
    if (shelfErr) throw shelfErr;

    record('1) Seed — 13 منشوراً منشوراً بأولويات فريدة + منشور مسودة واحد', true, `منشورة: ${insertedPosts.length}, مسودة: ${draftPost.id}`);

    // ---------------------------------------------------------------------
    // 2) فتح الصفحة الرئيسية والتحقق من الصفحة الأولى (10 منشورات بالضبط — DEFAULT_FEED_PAGE_SIZE)
    // ---------------------------------------------------------------------
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
      record('2) فتح الصفحة الرئيسية', response?.status() === 200, `HTTP ${response?.status()}`);

      const captionLocator = page.locator(`article:has-text("يوم27-${runId}-")`);
      await captionLocator.first().waitFor({ state: 'visible', timeout: 10000 });
      const firstPageCount = await captionLocator.count();
      record(`3) الصفحة الأولى تعرض ${FEED_PAGE_SIZE} منشوراً بالضبط (لا أكثر ولا أقل)`, firstPageCount === FEED_PAGE_SIZE, `العدد الفعلي: ${firstPageCount}`);

      // ---------------------------------------------------------------------
      // 4) المسودة (priority=999، كانت ستظهر أولاً لو ظهرت) غير موجودة إطلاقاً في DOM
      // ---------------------------------------------------------------------
      const draftVisible = await page.locator(`text=${runId}-مسودة-لا-يجب-أن-تظهر`).count();
      record('4) منشور المسودة لا يظهر إطلاقاً في الصفحة الأولى', draftVisible === 0, `عدد ظهور نص المسودة: ${draftVisible}`);

      // ---------------------------------------------------------------------
      // 5) ترتيب الصفحة الأولى يطابق priority تنازلياً (13 حتى 4 — أول 10 منشورات بيننا)
      // ---------------------------------------------------------------------
      const captionsBeforeScroll = await captionLocator.allTextContents();
      const prioritiesInOrder = captionsBeforeScroll.map((c) => {
        const match = c.match(/أولوية-(\d+)/);
        return match ? Number(match[1]) : NaN;
      });
      const expectedFirstPage = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => publishedCount - i); // [13..4]
      const orderMatches = JSON.stringify(prioritiesInOrder) === JSON.stringify(expectedFirstPage);
      record('5) ترتيب الصفحة الأولى يطابق priority تنازلياً كما حدَّده الأدمن', orderMatches, `الفعلي: [${prioritiesInOrder}], المتوقَّع: [${expectedFirstPage}]`);

      // ---------------------------------------------------------------------
      // 6) رف المنتجات المرتبط ظاهر تحت المنشور الأول (product_highlight/shelf فعلي، لا فارغ)
      // ---------------------------------------------------------------------
      const shelfVisible = await page.locator('text=منتجات هذا المنشور').first().isVisible();
      record('6) رف المنتجات المرتبط (post_products) ظاهر فعلياً تحت منشوره', shelfVisible);

      // ---------------------------------------------------------------------
      // 7) رف الريلز النائب ظاهر متداخلاً بين المنشورات
      // ---------------------------------------------------------------------
      const reelsShelfVisible = await page.locator('text=ريلز').first().isVisible();
      record('7) رف الريلز النائب (placeholder) ظاهر متداخلاً بين المنشورات', reelsShelfVisible);

      // ---------------------------------------------------------------------
      // 8) التمرير للأسفل يحمّل صفحة ثانية فعلية عبر IntersectionObserver — العدد يرتفع لـ13
      // ---------------------------------------------------------------------
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(
        (expected) => document.querySelectorAll('article').length >= expected,
        publishedCount,
        { timeout: 10000 }
      );
      const countAfterScroll = await captionLocator.count();
      record(`8) التمرير للأسفل يحمّل الصفحة الثانية فعلياً (العدد يرتفع إلى ${publishedCount})`, countAfterScroll === publishedCount, `العدد الفعلي: ${countAfterScroll}`);

      // ---------------------------------------------------------------------
      // 9) المسودة لا تزال غائبة تماماً حتى بعد تحميل كل الصفحات
      // ---------------------------------------------------------------------
      const draftVisibleAfterScroll = await page.locator(`text=${runId}-مسودة-لا-يجب-أن-تظهر`).count();
      record('9) منشور المسودة لا يظهر إطلاقاً حتى بعد تحميل كل الصفحات', draftVisibleAfterScroll === 0, `عدد ظهور نص المسودة: ${draftVisibleAfterScroll}`);

      // ---------------------------------------------------------------------
      // 10) الترتيب الكامل (13 منشوراً عبر صفحتين) يطابق priority تنازلياً من الأول للأخير
      // ---------------------------------------------------------------------
      const captionsAfterScroll = await captionLocator.allTextContents();
      const prioritiesFull = captionsAfterScroll.map((c) => {
        const match = c.match(/أولوية-(\d+)/);
        return match ? Number(match[1]) : NaN;
      });
      const expectedFull = Array.from({ length: publishedCount }, (_, i) => publishedCount - i); // [13..1]
      const fullOrderMatches = JSON.stringify(prioritiesFull) === JSON.stringify(expectedFull);
      record('10) الترتيب الكامل عبر الصفحتين يطابق priority تنازلياً من الأول للأخير', fullOrderMatches, `الفعلي: [${prioritiesFull}]`);

      record('11) بلا أخطاء Console/صفحة غير متوقَّعة طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));
    } finally {
      await browser.close();
    }
  } finally {
    // ---------------------------------------------------------------------
    // تنظيف كامل — حذف كل المنشورات المزروعة (on delete cascade يزيل post_media/post_products تلقائياً)
    // ---------------------------------------------------------------------
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
