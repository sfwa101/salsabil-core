// scripts/day32-bayan-full-e2e.ts
// اليوم 32 — إغلاق دفعة بيان (BAYAN-HOME-FEED-001): اختبار E2E واحد شامل يغطي رحلة بيان الكاملة
// من الصفر، بنفس نمط scripts/test-first-real-purchase.e2e.ts (StepResult/record واحد، رحلة
// مستمرة برقم خطوة واضح) — لكن ببيانات مزروعة ذاتية التنظيف عبر service_role (نفس منهجية
// scripts/day28-product-recipe-sheet-verify.ts، أُعيدت شبه حرفياً) لأن هذه الرحلة تحتاج منشور
// منتج ومنشور وصفة مُتحكَّم بهما، لا كتالوجاً عشوائياً موجوداً أصلاً كما في اختبار الشراء.
//
// الرحلة الكاملة تُشغَّل مرتين — هاتف حقيقي (390×844) ثم سطح مكتب حقيقي (1440×900)، بذرة بيانات
// مستقلة لكل تكرار: الصفحة الرئيسية (خلاصة حقيقية) → تمرير لانهائي → منشور منتج (BottomSheet) →
// إضافة للسلة → منشور وصفة → تحجيم بعدد أفراد + "أضف الكل" → WorldSwitcher (فتح/إغلاق آمن) →
// تبديل ثيم شخصي والتحقق من بقائه بعد إعادة تحميل.
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day32-bayan-full-e2e.ts

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
const CART_COOKIE = 'sb_cart_session'; // يطابق src/core/modules/cart/cart-session.ts
const PERSONAL_THEME_KEY = 'sb_personal_theme'; // يطابق src/lib/personal-theme.ts
const PERSONAL_MODE_KEY = 'sb_personal_mode';
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

const VIEWPORTS = [
  { name: 'هاتف (390×844)', width: 390, height: 844 },
  { name: 'سطح مكتب (1440×900)', width: 1440, height: 900 },
];

async function runJourney(vp: { name: string; width: number; height: number }) {
  const runId = `${Date.now()}-${vp.width}`;
  const seededPostIds: string[] = [];
  let testCartId: string | null = null;
  let productB: { id: string; name: string } | null = null;

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: activeProducts, error: productsErr } = await admin
    .from('products')
    .select('id, category_id')
    .eq('is_active', true)
    .limit(1);
  if (productsErr || !activeProducts || activeProducts.length === 0) {
    throw new Error('يلزم منتج نشط واحد على الأقل في القاعدة لهذا الاختبار.');
  }
  const productA = activeProducts[0];
  const categoryId = productA.category_id as string;

  const { data: productBRow, error: productBErr } = await admin
    .from('products')
    .insert({ category_id: categoryId, name: `منتج-مكوّن-اختبار-يوم32-${runId}`, base_price: 15, unit: 'قطعة' })
    .select('id, name')
    .single();
  if (productBErr) throw productBErr;
  productB = productBRow;

  const { error: inventoryErr } = await admin.from('inventory').insert({ product_id: productB.id, quantity_available: 100 });
  if (inventoryErr) throw inventoryErr;

  const RECIPE_BASE_FAMILY_SIZE = 2;
  const RECIPE_BASE_QUANTITY = 2;

  const browser = await chromium.launch();
  const consoleErrors: string[] = [];

  try {
    // ---------------------------------------------------------------------
    // Seed — منشور رئيسي بصورتين (منتج + وصفة) + 10 منشورات حشو (hasMore=true، DEFAULT_FEED_PAGE_SIZE=10)
    // ---------------------------------------------------------------------
    const PRIORITY_BASE = 1_000_000;
    const { data: mainPost, error: mainErr } = await admin
      .from('posts')
      .insert({
        world_scope: world.id,
        category_id: categoryId,
        post_type: 'post',
        caption: `يوم32-${runId}-رئيسي`,
        is_published: true,
        priority: PRIORITY_BASE + 11,
      })
      .select('id')
      .single();
    if (mainErr) throw mainErr;
    seededPostIds.push(mainPost.id as string);

    const { error: mediaErr } = await admin.from('post_media').insert([
      { post_id: mainPost.id, image_url: 'https://placehold.co/600x600/png?text=product', display_order: 0, link: { type: 'product', productId: productA.id } },
      {
        post_id: mainPost.id,
        image_url: 'https://placehold.co/600x600/png?text=recipe',
        display_order: 1,
        link: {
          type: 'recipe',
          title: `وصفة اختبار اليوم 32 — ${runId}`,
          baseFamilySize: RECIPE_BASE_FAMILY_SIZE,
          ingredients: [{ productId: productB.id, baseQuantity: RECIPE_BASE_QUANTITY }],
        },
      },
    ]);
    if (mediaErr) throw mediaErr;

    const fillerRows = Array.from({ length: 10 }, (_, i) => ({
      world_scope: world.id,
      category_id: categoryId,
      post_type: 'post' as const,
      caption: `يوم32-${runId}-حشو-${i}`,
      is_published: true,
      priority: PRIORITY_BASE + 10 - i,
    }));
    const { data: fillerPosts, error: fillerErr } = await admin.from('posts').insert(fillerRows).select('id');
    if (fillerErr) throw fillerErr;
    seededPostIds.push(...fillerPosts.map((p) => p.id as string));

    record(`[${vp.name}] 1) Seed — منشور رئيسي (منتج+وصفة) + 10 حشو = 11 منشوراً`, true, `رئيسي=${mainPost.id}`);

    // ---------------------------------------------------------------------
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[${vp.name}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => consoleErrors.push(`[${vp.name}] pageerror: ${err.message}`));

    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    record(`[${vp.name}] 2) زيارة الصفحة الرئيسية — الخلاصة الحقيقية`, response?.status() === 200, `HTTP ${response?.status()}`);

    const mainArticle = page.locator(`article:has-text("يوم32-${runId}-رئيسي")`);
    await mainArticle.waitFor({ state: 'visible', timeout: 10000 });

    // ---------------------------------------------------------------------
    // 3) التمرير اللانهائي — 10 مقالات أولاً، ثم 11 بعد التمرير للأسفل
    // ---------------------------------------------------------------------
    const runIdArticles = page.locator(`article:has-text("يوم32-${runId}-")`);
    const countBeforeScroll = await runIdArticles.count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(
      (expected) => document.querySelectorAll(`article`).length >= expected,
      11,
      { timeout: 10000 }
    ).catch(() => {});
    await page.waitForTimeout(500);
    const countAfterScroll = await runIdArticles.count();
    record(
      `[${vp.name}] 3) التمرير اللانهائي يحمّل صفحة ثانية فعلياً (10 → 11)`,
      countBeforeScroll === 10 && countAfterScroll === 11,
      `قبل: ${countBeforeScroll}, بعد: ${countAfterScroll}`
    );

    // ---------------------------------------------------------------------
    // 4) وضع "منتج" — إضافة للسلة، تحقق مباشر من القاعدة
    // ---------------------------------------------------------------------
    const carouselImages = mainArticle.locator('button img');
    await carouselImages.nth(0).scrollIntoViewIfNeeded();
    await carouselImages.nth(0).click();
    await page.locator('h2', { hasText: 'تفاصيل المنتج' }).waitFor({ state: 'visible', timeout: 5000 });
    const addToCartButton = page.locator('button', { hasText: 'أضف للسلة' });
    await addToCartButton.click();
    await page.locator('button', { hasText: 'أُضيف للسلة ✓' }).waitFor({ state: 'visible', timeout: 5000 });
    record(`[${vp.name}] 4) فتح منشور منتج (BottomSheet) وإضافته للسلة تنجح واجهياً`, true);

    await page.locator('button', { hasText: 'إغلاق' }).click();
    await page.locator('h2', { hasText: 'تفاصيل المنتج' }).waitFor({ state: 'detached', timeout: 5000 });

    const cookies = await context.cookies();
    const cartCookie = cookies.find((c) => c.name === CART_COOKIE);
    if (!cartCookie) throw new Error('كوكي سلة الزائر غير موجود بعد الإضافة');
    const { data: cart, error: cartErr } = await admin.from('carts').select('id').eq('session_token', cartCookie.value).single();
    if (cartErr || !cart) throw cartErr ?? new Error('سلة الاختبار غير موجودة في القاعدة');
    testCartId = cart.id as string;
    const { data: itemsAfterProduct } = await admin.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id);
    const productLineAdded = itemsAfterProduct?.some((i) => i.product_id === productA.id && i.quantity === 1);
    record(`[${vp.name}] 5) إضافة المنتج حقيقية في القاعدة (cart_items) — فحص مباشر service_role`, !!productLineAdded, JSON.stringify(itemsAfterProduct));

    // ---------------------------------------------------------------------
    // 6) وضع "وصفة" — تحجيم بعدد أفراد + "أضف الكل"
    // ---------------------------------------------------------------------
    await carouselImages.nth(1).click();
    await page.locator('h2', { hasText: `وصفة اختبار اليوم 32 — ${runId}` }).waitFor({ state: 'visible', timeout: 5000 });

    await page.locator(`text=${productB.name}`).waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      (name) => {
        const li = Array.from(document.querySelectorAll('li')).find((el) => el.textContent?.includes(name));
        return li ? !li.textContent?.includes('...') : false;
      },
      productB.name,
      { timeout: 5000 }
    );

    await page.locator('button[aria-label="زيادة عدد الأفراد"]').click();
    await page.waitForFunction(
      (name) => {
        const li = Array.from(document.querySelectorAll('li')).find((el) => el.textContent?.includes(name));
        return li?.textContent?.includes('3');
      },
      productB.name,
      { timeout: 5000 }
    );
    record(`[${vp.name}] 6) فتح منشور وصفة، تحجيم عدد الأفراد يُعيد حساب الكمية فعلياً (2 → 3)`, true);

    const addAllButton = page.locator('button', { hasText: 'أضف الكل' });
    await addAllButton.click();
    await page.locator('button', { hasText: 'أُضيف الكل ✓' }).waitFor({ state: 'visible', timeout: 8000 });
    record(`[${vp.name}] 7) "أضف الكل" ينجح واجهياً`, true);

    const { data: itemsAfterRecipe } = await admin.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id);
    const recipeLineAdded = itemsAfterRecipe?.some((i) => i.product_id === productB.id && i.quantity === 3);
    record(`[${vp.name}] 8) إضافة مكوّن الوصفة حقيقية بالكمية المُحدَّثة (3) — فحص مباشر service_role`, !!recipeLineAdded, JSON.stringify(itemsAfterRecipe));

    await page.locator('button', { hasText: 'إغلاق' }).click();
    await page.locator('h2', { hasText: `وصفة اختبار اليوم 32 — ${runId}` }).waitFor({ state: 'detached', timeout: 5000 });

    // ---------------------------------------------------------------------
    // 9) WorldSwitcher — فتح، إغلاق آمن (Escape لا نقر خلفية — فخّ موثَّق يوم 31)، والتحقق أن
    // إغلاقه لا يترك طبقة علوية يتيمة تحجب تفاعلاً لاحقاً
    // ---------------------------------------------------------------------
    await page.locator('button[aria-label="تبديل العالم"]').click();
    const worldPanel = page.locator('h2:has-text("اختر عالمك")');
    await worldPanel.waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
    await worldPanel.waitFor({ state: 'detached', timeout: 3000 });
    const closeBackdropGone = (await page.locator('button[aria-label="إغلاق"]').count()) === 0;

    // تفاعل لاحق حقيقي يثبت عدم بقاء أي طبقة علوية تحجب النقر
    await page.locator('button', { hasText: 'الكل' }).click();
    const stillInteractive = page.url().length > 0; // النقر نفسه لم يُرمَ خطأً (Playwright كان سيفشل لو حُجِب)
    record(
      `[${vp.name}] 9) WorldSwitcher يُغلَق بأمان — لا طبقة علوية يتيمة تحجب تفاعلاً لاحقاً`,
      closeBackdropGone && stillInteractive,
      `خلفية متبقية: ${!closeBackdropGone}`
    );

    // ---------------------------------------------------------------------
    // 10) تبديل ثيم شخصي — لا UI بعد (اليوم 30)، فيُضبَط المصدر الحقيقي (localStorage) مباشرة،
    // ثم يُتحقَّق أن PersonalThemeInitializer.tsx طبَّقه فعلياً بعد إعادة التحميل
    // ---------------------------------------------------------------------
    await page.evaluate(
      ({ themeKey, modeKey, theme, mode }) => {
        window.localStorage.setItem(themeKey, theme);
        window.localStorage.setItem(modeKey, mode);
      },
      { themeKey: PERSONAL_THEME_KEY, modeKey: PERSONAL_MODE_KEY, theme: TEST_PERSONAL_THEME, mode: TEST_PERSONAL_MODE }
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.personalTheme === theme,
      TEST_PERSONAL_THEME,
      { timeout: 5000 }
    );
    const appliedAttrs = await page.evaluate(() => ({
      theme: document.documentElement.dataset.personalTheme,
      mode: document.documentElement.dataset.personalMode,
      primary: getComputedStyle(document.documentElement).getPropertyValue('--sb-pt-primary').trim().toLowerCase(),
    }));
    const expectedPrimary = PERSONAL_THEMES[TEST_PERSONAL_THEME].modes[TEST_PERSONAL_MODE].primary.toLowerCase();
    const themePersisted =
      appliedAttrs.theme === TEST_PERSONAL_THEME &&
      appliedAttrs.mode === TEST_PERSONAL_MODE &&
      (appliedAttrs.primary === expectedPrimary || expandShortHex(appliedAttrs.primary) === expectedPrimary);
    record(
      `[${vp.name}] 10) تبديل ثيم شخصي (${TEST_PERSONAL_THEME}/${TEST_PERSONAL_MODE}) يبقى بعد إعادة التحميل`,
      themePersisted,
      JSON.stringify({ ...appliedAttrs, expectedPrimary })
    );

    await context.close();
  } finally {
    await browser.close();
    if (seededPostIds.length > 0) {
      await admin.from('posts').delete().in('id', seededPostIds);
    }
    if (testCartId) {
      await admin.from('cart_items').delete().eq('cart_id', testCartId);
      await admin.from('carts').delete().eq('id', testCartId);
    }
    if (productB) {
      await admin.from('inventory').delete().eq('product_id', productB.id);
      await admin.from('products').delete().eq('id', productB.id);
    }
  }

  return consoleErrors;
}

// Lightning CSS (Tailwind v4/Next dev) يُقصِّر #rrggbb إلى #rgb حتى داخل CSS Custom Properties —
// نفس التطبيع المستخدَم في سكربت اليوم 30 المؤقت (محذوف الآن).
function expandShortHex(value: string): string {
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : value;
}

async function main() {
  console.log(`\n=== اليوم 32 — رحلة بيان الكاملة E2E — ${BASE_URL} ===\n`);
  const allConsoleErrors: string[] = [];

  for (const vp of VIEWPORTS) {
    const errors = await runJourney(vp);
    allConsoleErrors.push(...errors);
  }

  record('11) صفر أخطاء Console عبر كامل الرحلة على كلا الحجمين', allConsoleErrors.length === 0, allConsoleErrors.join(' | '));

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
