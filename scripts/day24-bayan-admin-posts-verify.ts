// scripts/day24-bayan-admin-posts-verify.ts
// اليوم 24 — تحقُّق حي كامل للوحة إدارة بيان (BAYAN-HOME-FEED-001): تسجيل دخول platform_admin
// حقيقي → إنشاء منشور حقيقي (صف صورة برابط منتج) → نشره → تحقُّق مباشر من Supabase (service_role)
// أن الصفوف صحيحة فعلياً → إلغاء نشر عبر الواجهة → تحقُّق حي → حذف عبر الواجهة → تحقُّق أن الحذف
// المتسلسل (on delete cascade، ADR-021) أزال post_media تلقائياً. ذاتي التنظيف بالكامل — لا يترك
// أثراً في القاعدة عند النجاح. نفس منهجية scripts/test-first-real-purchase.e2e.ts (Playwright بلا
// @playwright/test) + scripts/day23-bayan-seed-and-verify.ts (تحقُّق مباشر عبر service_role).
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day24-bayan-admin-posts-verify.ts

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
const ADMIN_PHONE = process.env.TEST_ADMIN_PHONE ?? '01000000001'; // docs/DATABASE.md §3 — حساب platform_admin الحي

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
  console.log(`\n=== اليوم 24 — لوحة إدارة بيان: تحقُّق حي كامل — ${BASE_URL} ===\n`);

  // Preflight: منتج نشط واحد على الأقل موجود فعلياً (منتقي المنتج يحتاجه)
  const { data: activeProducts, error: productsError } = await admin.from('products').select('id, name').eq('is_active', true).limit(1);
  if (productsError || !activeProducts || activeProducts.length === 0) {
    console.error('✗ لا يوجد منتج نشط واحد في قاعدة البيانات — لا يمكن اختبار منتقي المنتج. أضِف منتجاً تجريبياً أولاً.');
    process.exit(1);
  }
  const testProduct = activeProducts[0];

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('dialog', (dialog) => dialog.accept());

  const testCaption = `اختبار حي اليوم 24 — ${Date.now()}`;
  const testImageUrl = 'https://example.com/day24-test-image.jpg';
  let createdPostId: string | null = null;

  try {
    // 1) تسجيل دخول الإدارة
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="tel"]', ADMIN_PHONE);
    await page.locator('button', { hasText: 'دخول' }).click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    record('1) تسجيل دخول platform_admin', page.url().includes('/admin/dashboard'));

    // 2) الانتقال لصفحة إنشاء منشور جديد
    await page.goto(`${BASE_URL}/admin/posts/new`, { waitUntil: 'networkidle' });
    record('2) فتح نموذج إنشاء منشور', page.url().includes('/admin/posts/new'));

    // 3) تعبئة الحقول الأساسية
    await page.locator('select').nth(1).selectOption({ label: 'عرض' }); // postType
    await page.locator('textarea').fill(testCaption);
    await page.locator('input[type="number"]').nth(0).fill('7'); // priority
    await page.locator('input[type="checkbox"]').check(); // isPublished

    // 4) إضافة صف صورة واحد برابط منتج
    await page.locator('button', { hasText: '+ إضافة صورة' }).click();
    await page.locator('input[type="url"]').nth(0).fill(testImageUrl);
    await page.locator('select').nth(2).selectOption({ label: 'منتج' }); // linkType الصف الأول
    await page.locator('select').nth(3).selectOption({ index: 1 }); // أول منتج فعلي في القائمة
    record('4) تعبئة النموذج (حقول أساسية + صف صورة برابط منتج)', true, `منتج: ${testProduct.name}`);

    // 5) الإرسال
    await page.locator('button', { hasText: 'إنشاء المنشور' }).click();
    await page.waitForURL('**/admin/posts', { timeout: 10000 });
    const listHasCaption = await page.locator('li', { hasText: testCaption }).count();
    record('5) الإرسال والعودة لقائمة المنشورات مع ظهور المنشور الجديد', listHasCaption > 0);

    // 6) تحقُّق مباشر من Supabase (service_role) — لا ثقة بالواجهة وحدها
    const { data: postRow, error: postError } = await admin.from('posts').select('*').eq('caption', testCaption).maybeSingle();
    if (postError || !postRow) throw new Error(`فشل العثور على المنشور في Supabase: ${postError?.message}`);
    createdPostId = postRow.id;
    record(
      '6) المنشور في Supabase مطابق تماماً (post_type=offer, priority=7, is_published=true)',
      postRow.post_type === 'offer' && postRow.priority === 7 && postRow.is_published === true
    );

    const { data: mediaRows, error: mediaError } = await admin.from('post_media').select('*').eq('post_id', createdPostId);
    if (mediaError) throw mediaError;
    const media = mediaRows?.[0];
    record(
      '7) صف الصورة في post_media مطابق (image_url + link.type=product + productId صحيح)',
      mediaRows?.length === 1 &&
        media?.image_url === testImageUrl &&
        media?.link?.type === 'product' &&
        media?.link?.productId === testProduct.id
    );

    // 8) إلغاء النشر عبر الواجهة
    const row = page.locator('li', { hasText: testCaption });
    await row.locator('button', { hasText: 'إلغاء النشر' }).click();
    await page.locator('li', { hasText: testCaption }).locator('text=مسودة').waitFor({ timeout: 10000 }); // router.refresh() بعد Server Action — لا انتقال URL لانتظاره
    const { data: afterUnpublish } = await admin.from('posts').select('is_published').eq('id', createdPostId).maybeSingle();
    record('8) إلغاء النشر عبر الواجهة ينعكس فعلياً في Supabase', afterUnpublish?.is_published === false);

    // 8.5) صفحة التعديل: القيم محمَّلة مسبقاً بشكل صحيح، وتعديل الأولوية ينعكس فعلياً
    await page.goto(`${BASE_URL}/admin/posts/${createdPostId}`, { waitUntil: 'networkidle' });
    const prefilledPriority = await page.locator('input[type="number"]').nth(0).inputValue();
    const prefilledImageUrl = await page.locator('input[type="url"]').nth(0).inputValue();
    record(
      '8.5أ) صفحة التعديل تحمّل القيم الحالية مسبقاً (priority + صورة الوسائط)',
      prefilledPriority === '7' && prefilledImageUrl === testImageUrl
    );

    await page.locator('input[type="number"]').nth(0).fill('42');
    await page.locator('button', { hasText: 'حفظ التعديلات' }).click();
    await page.waitForURL('**/admin/posts', { timeout: 10000 });
    const { data: afterEdit } = await admin.from('posts').select('priority').eq('id', createdPostId).maybeSingle();
    record('8.5ب) التعديل عبر الواجهة (تغيير الأولوية) ينعكس فعلياً في Supabase', afterEdit?.priority === 42);

    // 9) الحذف عبر الواجهة (dialog.accept() مُسجَّل أعلاه) — row لا يزال يصف نفس <li> رغم التنقّل
    await row.locator('button', { hasText: 'حذف' }).click();
    await page.locator('li', { hasText: testCaption }).waitFor({ state: 'detached', timeout: 10000 });
    const listAfterDelete = await page.locator('li', { hasText: testCaption }).count();
    record('9) الحذف عبر الواجهة يزيل الصف من القائمة فوراً', listAfterDelete === 0);

    // 10) تحقُّق مباشر: المنشور والصورة كلاهما محذوفان فعلياً (حذف متسلسل on delete cascade)
    const { data: postAfterDelete } = await admin.from('posts').select('id').eq('id', createdPostId).maybeSingle();
    const { data: mediaAfterDelete } = await admin.from('post_media').select('id').eq('post_id', createdPostId);
    record(
      '10) الحذف من Supabase فعلي ومتسلسل (لا صف يتيم في post_media)',
      !postAfterDelete && (mediaAfterDelete?.length ?? 0) === 0
    );
    createdPostId = null; // تنظيف ذاتي ناجح، لا حاجة لتنظيف تعويضي في finally

    record('11) بلا أخطاء Console/صفحة غير متوقَّعة طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));
  } catch (e) {
    record('استثناء غير متوقَّع', false, e instanceof Error ? e.message : String(e));
  } finally {
    // تنظيف تعويضي إن فشل أي خطوة قبل الحذف عبر الواجهة — لا نترك بيانات اختبار في القاعدة
    if (createdPostId) {
      await admin.from('posts').delete().eq('id', createdPostId);
      console.log(`(تنظيف تعويضي: حُذف المنشور ${createdPostId} مباشرة عبر service_role)`);
    }
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== النتيجة: ${results.length - failed.length}/${results.length} نجحت ===\n`);
  if (failed.length > 0) {
    console.error('خطوات فاشلة:', failed.map((f) => f.step).join(', '));
    process.exit(1);
  }
}

main();
