// scripts/bayan-closeout-ui-gaps-verify.ts
// BAYAN-CLOSEOUT-UI-GAPS — تحقُّق حي كامل لبندي الإغلاق الأخيرين من مراجعة اليوم 32:
// (1) BottomNav.tsx (تنقّل سفلي حقيقي)، (2) PersonalThemeSheet.tsx (UI اختيار الثيم الشخصي).
// Playwright على viewport هاتف حقيقي (390×844). نمط StepResult/record المتّبع في كل سكربتات هذه
// الدفعة، تنظيف ذاتي كامل عبر service_role لأي بيانات حقيقية تُنشأ (طلب/سلة، لا تعديل على منتج
// حقيقي قائم بخلاف استرجاع مخزونه).
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/bayan-closeout-ui-gaps-verify.ts

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSONAL_THEMES } from '../src/config/personal-theme-registry';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');
const { chromium } = await import('playwright');

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const CART_COOKIE = 'sb_cart_session';
const LAST_ORDER_KEY = 'sb_last_order_id'; // يطابق src/lib/last-order.ts
const TEST_PERSONAL_THEME = 'feminine' as const;
const TEST_PERSONAL_MODE = 'dark' as const;

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

function expandShortHex(value: string): string {
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : value;
}

async function main() {
  console.log(`\n=== BAYAN-CLOSEOUT-UI-GAPS — تحقُّق حي كامل — ${BASE_URL} ===\n`);
  const consoleErrors: string[] = [];
  let testCartId: string | null = null;
  let testOrderId: string | null = null;
  let orderedProductId: string | null = null;

  const { data: activeProducts, error: productsErr } = await admin
    .from('products')
    .select('id, category_id')
    .eq('is_active', true)
    .limit(1);
  if (productsErr || !activeProducts || activeProducts.length === 0) {
    console.error('✗ يلزم منتج نشط واحد على الأقل في القاعدة لهذا التحقق.');
    process.exit(1);
  }
  const product = activeProducts[0];

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  // منشورات حشو مؤقتة — الصفحة الرئيسية فارغة اليوم (كل سكربتات هذه الدفعة تُنظِّف بياناتها ذاتياً)،
  // ويلزم ارتفاع صفحة كافٍ لاختبار سلوك إخفاء/إظهار BottomNav عند التمرير فعلياً
  const runId = Date.now();
  const fillerRows = Array.from({ length: 8 }, (_, i) => ({
    world_scope: world.id,
    category_id: product.category_id,
    post_type: 'post' as const,
    caption: `إغلاق-الفجوات-${runId}-${i}`,
    is_published: true,
    priority: 1_000_000 - i,
  }));
  const { data: fillerPosts, error: fillerErr } = await admin.from('posts').insert(fillerRows).select('id');
  if (fillerErr) throw fillerErr;
  const seededPostIds = fillerPosts.map((p) => p.id as string);

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    // ---------------------------------------------------------------------
    // 1) BottomNav ظاهر بعناصره الأربعة على الصفحة الرئيسية
    // ---------------------------------------------------------------------
    const homeResponse = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    record('1) فتح الصفحة الرئيسية', homeResponse?.status() === 200, `HTTP ${homeResponse?.status()}`);

    const nav = page.locator('nav');
    await nav.waitFor({ state: 'visible', timeout: 5000 });
    const labels = await nav.locator('span').allTextContents();
    const expectedLabels = ['الرئيسية', 'الأقسام', 'طلباتي', 'حسابي'];
    const hasAllLabels = expectedLabels.every((l) => labels.includes(l));
    record('2) BottomNav ظاهر بعناصره الأربعة (الرئيسية/الأقسام/طلباتي/حسابي)', hasAllLabels, JSON.stringify(labels));

    // ---------------------------------------------------------------------
    // 3) سلوك الإخفاء/الإظهار عند التمرير (ScrollHideBar edge="bottom")
    // ---------------------------------------------------------------------
    const navBar = nav.locator('xpath=..');
    const readTranslate = (el: Element) => getComputedStyle(el).translate;
    const translateAtTop = await navBar.evaluate(readTranslate);

    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(500);
    const translateAfterScrollDown = await navBar.evaluate(readTranslate);
    record(
      '3) التمرير للأسفل يُخفي BottomNav فعلياً (translate محسوب يتغيّر)',
      translateAfterScrollDown !== 'none' && translateAfterScrollDown !== translateAtTop,
      `at-top: ${translateAtTop}, after-scroll-down: ${translateAfterScrollDown}`
    );

    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);
    const translateAfterScrollUp = await navBar.evaluate(readTranslate);
    record('4) التمرير للأعلى يُظهر BottomNav مجدداً', translateAfterScrollUp === translateAtTop, `after-scroll-up: ${translateAfterScrollUp}`);

    await page.evaluate(() => window.scrollTo(0, 0));

    // ---------------------------------------------------------------------
    // 5) "الأقسام" يفتح /categories ويعرض أقساماً حقيقية بروابط صحيحة
    // ---------------------------------------------------------------------
    await Promise.all([page.waitForURL('**/categories', { timeout: 5000 }), page.locator('a', { hasText: 'الأقسام' }).click()]);
    await page.waitForLoadState('networkidle');
    const categoriesPageHasLinks = (await page.locator('main a').count()) > 0;
    record('5) "الأقسام" يفتح /categories ويعرض أقساماً حقيقية بروابط', categoriesPageHasLinks);

    // ---------------------------------------------------------------------
    // 6) "طلباتي" بلا طلب محفوظ (localStorage فارغ) يوجّه لحالة فارغة /orders
    // ---------------------------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL('**/orders', { timeout: 5000 }), page.locator('button', { hasText: 'طلباتي' }).click()]);
    const emptyStateVisible = await page.locator('text=لا يوجد طلب محفوظ على هذا الجهاز بعد').isVisible();
    record('6) "طلباتي" بلا طلب محفوظ يوجّه لحالة فارغة حقيقية (/orders)', emptyStateVisible);

    // ---------------------------------------------------------------------
    // 7) رحلة شراء حقيقية واحدة — يثبت أن CheckoutForm.tsx يحفظ آخر طلب فعلياً
    // ---------------------------------------------------------------------
    await page.goto(`${BASE_URL}/product/${product.id}`, { waitUntil: 'networkidle' });
    const addToCartButton = page.locator('button', { hasText: 'أضف للسلة' });
    await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartButton.click();
    await page.waitForSelector('text=أُضيف للسلة', { timeout: 15000 });
    orderedProductId = product.id as string;

    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });
    const runId = Date.now();
    await page.fill('main input[type="tel"]', '01055500000');
    // main form ... لا input:not([type=tel]) وحدها — HeaderSearchBar.tsx (اليوم 31) يضيف حقل بحث
    // <input type="search"> في Header.tsx (خارج <main>، يسبقه في DOM)، فيُطابَق خطأً كأول عنصر لولا
    // هذا التحديد الصريح لنطاق نموذج Checkout تحديداً
    const textInputs = page.locator('main form input:not([type="tel"])');
    await textInputs.nth(0).fill(`عميل اختبار إغلاق-${runId}`);
    await textInputs.nth(1).fill('شارع الاختبار 1');
    await textInputs.nth(2).fill('القاهرة');

    const submitButton = page.locator('button', { hasText: 'تأكيد الطلب' });
    await submitButton.click();
    await page.waitForURL(/\/order\/[0-9a-f-]+/, { timeout: 15000 });
    testOrderId = page.url().split('/order/')[1];
    record('7) رحلة شراء حقيقية كاملة تنتهي بصفحة تتبّع طلب حقيقي', !!testOrderId, page.url());

    const savedId = await page.evaluate((key) => window.localStorage.getItem(key), LAST_ORDER_KEY);
    record('8) CheckoutForm.tsx يحفظ order.id فعلياً في localStorage عند النجاح', savedId === testOrderId, `محفوظ: ${savedId}, متوقَّع: ${testOrderId}`);

    // ---------------------------------------------------------------------
    // 9) "طلباتي" بعد وجود طلب محفوظ يوجّه مباشرة لصفحة تتبّعه (لا حالة فارغة)
    // ---------------------------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL(`**/order/${testOrderId}`, { timeout: 5000 }), page.locator('button', { hasText: 'طلباتي' }).click()]);
    record('9) "طلباتي" بعد وجود طلب محفوظ يوجّه مباشرة لنفس الطلب', page.url().includes(`/order/${testOrderId}`), page.url());

    // ---------------------------------------------------------------------
    // 10) PersonalThemeSheet — اختيار ثيم شخصي يطبَّق فعلياً ويبقى بعد إعادة التحميل
    // ---------------------------------------------------------------------
    await Promise.all([page.waitForURL('**/account', { timeout: 5000 }), page.locator('a', { hasText: 'حسابي' }).click()]);
    await page.locator('button', { hasText: 'مظهر التطبيق' }).click();
    await page.locator('h2', { hasText: 'اختر مظهرك الشخصي' }).waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('button', { hasText: 'داكن' }).click();
    await page.locator('button', { hasText: 'نسائي' }).click();
    await page.waitForTimeout(200);

    const appliedAttrs = await page.evaluate(() => ({
      theme: document.documentElement.dataset.personalTheme,
      mode: document.documentElement.dataset.personalMode,
      primary: getComputedStyle(document.documentElement).getPropertyValue('--sb-pt-primary').trim().toLowerCase(),
    }));
    const expectedPrimary = PERSONAL_THEMES[TEST_PERSONAL_THEME].modes[TEST_PERSONAL_MODE].primary.toLowerCase();
    const appliedCorrectly =
      appliedAttrs.theme === TEST_PERSONAL_THEME &&
      appliedAttrs.mode === TEST_PERSONAL_MODE &&
      (appliedAttrs.primary === expectedPrimary || expandShortHex(appliedAttrs.primary) === expectedPrimary);
    record('10) اختيار ثيم شخصي (نسائي/داكن) يُطبَّق فوراً عبر persistPersonalTheme/persistPersonalMode', appliedCorrectly, JSON.stringify(appliedAttrs));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction((theme) => document.documentElement.dataset.personalTheme === theme, TEST_PERSONAL_THEME, { timeout: 5000 });
    const afterReload = await page.evaluate(() => ({
      theme: document.documentElement.dataset.personalTheme,
      mode: document.documentElement.dataset.personalMode,
    }));
    record(
      '11) الاختيار يبقى بعد إعادة التحميل',
      afterReload.theme === TEST_PERSONAL_THEME && afterReload.mode === TEST_PERSONAL_MODE,
      JSON.stringify(afterReload)
    );

    record('12) بلا أخطاء Console طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));

    // تحقق مباشر من إضافة السلة قبل التنظيف (فحص لا افتراض)
    const cookies = await context.cookies();
    const cartCookie = cookies.find((c) => c.name === CART_COOKIE);
    if (cartCookie) {
      const { data: cart } = await admin.from('carts').select('id').eq('session_token', cartCookie.value).maybeSingle();
      if (cart) testCartId = cart.id as string;
    }

    await context.close();
  } finally {
    await browser.close();

    // -----------------------------------------------------------------------
    // تنظيف كامل: حذف الطلب الحقيقي (cascade يحذف order_items/order_status_history تلقائياً،
    // docs/DATABASE.md §3)، استرجاع الكمية المخصومة من المنتج الحقيقي (+1، نفس نمط
    // inventoryService.release())، حذف سلة الاختبار
    // -----------------------------------------------------------------------
    if (testOrderId) {
      await admin.from('orders').delete().eq('id', testOrderId);
    }
    if (orderedProductId) {
      const { data: inventoryRow } = await admin.from('inventory').select('quantity_available').eq('product_id', orderedProductId).maybeSingle();
      if (inventoryRow) {
        await admin
          .from('inventory')
          .update({ quantity_available: (inventoryRow.quantity_available as number) + 1 })
          .eq('product_id', orderedProductId);
      }
    }
    if (testCartId) {
      await admin.from('cart_items').delete().eq('cart_id', testCartId);
      await admin.from('carts').delete().eq('id', testCartId);
    }
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
