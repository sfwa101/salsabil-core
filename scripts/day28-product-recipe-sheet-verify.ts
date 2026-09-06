// scripts/day28-product-recipe-sheet-verify.ts
// اليوم 28 — Product/Recipe Bottom Sheet (BAYAN-HOME-FEED-001): يزرع منشوراً بصورتين — واحدة
// مرتبطة بمنتج (ProductLink)، وأخرى بوصفة (RecipeLink، مكوّن واحد بكمية أساس معروفة) — بالإضافة
// لأربعة منشورات حشو (بلا رابط) لضمان ارتفاع صفحة كافٍ لاختبار سلوك التمرير. يتحقق حياً من: (أ)
// وضع "منتج" ينتهي بإضافة حقيقية للسلة (فحص مباشر عبر service_role على carts/cart_items، لا
// افتراض نجاح من رسالة الواجهة فقط)، (ب) وضع "وصفة" — تغيير عدّاد العائلة يُعيد حساب الكمية
// فعلياً (scaleRecipeIngredientsAction)، و"أضف الكل" ينتهي بإضافة حقيقية بنفس الكمية المُحدَّثة،
// (ج) سلوك إخفاء/إظهار الشريط (FeedTopBar+StoryBar+FeedTabBar) عند التمرير على viewport هاتف
// حقيقي. ذاتي التنظيف بالكامل. نفس منهجية scripts/day24-bayan-admin-posts-verify.ts/
// scripts/day27-feed-rendering-verify.ts.
//
// شرط تشغيل: خادم التطوير يعمل فعلياً على TEST_BASE_URL (افتراضي http://localhost:3000):
//   npm run dev   (في نافذة طرفية منفصلة)
//   npx tsx scripts/day28-product-recipe-sheet-verify.ts

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
const CART_COOKIE = 'sb_cart_session'; // يطابق src/core/modules/cart/cart-session.ts

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
  console.log(`\n=== اليوم 28 — Product/Recipe Bottom Sheet: تحقُّق حي كامل — ${BASE_URL} ===\n`);
  const runId = Date.now();
  const seededPostIds: string[] = [];
  let testCartId: string | null = null;

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: activeProducts, error: productsErr } = await admin
    .from('products')
    .select('id, category_id, name, unit')
    .eq('is_active', true)
    .limit(1);
  if (productsErr || !activeProducts || activeProducts.length === 0) {
    console.error('✗ يلزم منتج نشط واحد على الأقل في القاعدة لهذا التحقق.');
    process.exit(1);
  }
  const productA = activeProducts[0];
  const categoryId = productA.category_id as string;

  // منتج ثانٍ مؤقت (لا يوجد بالضرورة منتجان نشطان مختلفان فعلياً في القاعدة اليوم) — يُستخدَم حصراً
  // كمكوّن وصفة، يُحذَف في التنظيف النهائي بلا أثر دائم.
  const { data: productBRow, error: productBErr } = await admin
    .from('products')
    .insert({ category_id: categoryId, name: `منتج-مكوّن-اختبار-يوم28-${runId}`, base_price: 15, unit: 'قطعة' })
    .select('id, category_id, name, unit')
    .single();
  if (productBErr) throw productBErr;
  const productB = productBRow;

  // مخزون كافٍ لمنتج B — بلا هذا السجل، isAvailable() ترفضه دائماً ("لا سجل مخزون = غير متاح"،
  // inventory.service.ts) فتفشل الإضافة الفعلية للسلة بصرف النظر عن صحة كود اليوم 28 نفسه.
  const { error: inventoryErr } = await admin.from('inventory').insert({ product_id: productB.id, quantity_available: 100 });
  if (inventoryErr) throw inventoryErr;

  const RECIPE_BASE_FAMILY_SIZE = 2;
  const RECIPE_BASE_QUANTITY = 2; // عند familySize=2 → الكمية=2 (نفس الأساس)؛ عند 3 → round(2*3/2)=3

  try {
    // ---------------------------------------------------------------------
    // 1) Seed — منشور رئيسي بصورتين (منتج + وصفة) + 4 منشورات حشو (بلا رابط) لارتفاع صفحة كافٍ
    // ---------------------------------------------------------------------
    const PRIORITY_BASE = 1_000_000;
    const { data: mainPost, error: mainErr } = await admin
      .from('posts')
      .insert({
        world_scope: world.id,
        category_id: categoryId,
        post_type: 'post',
        caption: `يوم28-${runId}-منشور-رئيسي`,
        is_published: true,
        priority: PRIORITY_BASE + 5,
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
          title: `وصفة اختبار اليوم 28 — ${runId}`,
          baseFamilySize: RECIPE_BASE_FAMILY_SIZE,
          ingredients: [{ productId: productB.id, baseQuantity: RECIPE_BASE_QUANTITY }],
        },
      },
    ]);
    if (mediaErr) throw mediaErr;

    const fillerRows = Array.from({ length: 4 }, (_, i) => ({
      world_scope: world.id,
      category_id: categoryId,
      post_type: 'post' as const,
      caption: `يوم28-${runId}-حشو-${i}`,
      is_published: true,
      priority: PRIORITY_BASE + 4 - i,
    }));
    const { data: fillerPosts, error: fillerErr } = await admin.from('posts').insert(fillerRows).select('id');
    if (fillerErr) throw fillerErr;
    seededPostIds.push(...fillerPosts.map((p) => p.id as string));

    for (const filler of fillerPosts) {
      await admin
        .from('post_media')
        .insert({ post_id: filler.id, image_url: 'https://placehold.co/600x600/png?text=filler', display_order: 0, link: { type: 'none' } });
    }

    record('1) Seed — منشور رئيسي (صورة منتج + صورة وصفة) + 4 منشورات حشو', true, `رئيسي=${mainPost.id}`);

    // ---------------------------------------------------------------------
    // 2) فتح الصفحة الرئيسية على viewport هاتف حقيقي
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

      const mainArticle = page.locator(`article:has-text("يوم28-${runId}-منشور-رئيسي")`);
      await mainArticle.waitFor({ state: 'visible', timeout: 10000 });

      // ---------------------------------------------------------------------
      // 3) وضع "منتج" — النقر على الصورة الأولى يفتح BottomSheet بعنوان "تفاصيل المنتج"
      // ---------------------------------------------------------------------
      const carouselImages = mainArticle.locator('button img');
      await carouselImages.nth(0).click();
      await page.locator('h2', { hasText: 'تفاصيل المنتج' }).waitFor({ state: 'visible', timeout: 5000 });
      const addToCartButton = page.locator('button', { hasText: 'أضف للسلة' });
      await addToCartButton.waitFor({ state: 'visible', timeout: 5000 });
      record('3) النقر على صورة مرتبطة بمنتج يفتح BottomSheet ويُظهر ProductOptions القائم', true);

      await addToCartButton.click();
      await page.locator('button', { hasText: 'أُضيف للسلة ✓' }).waitFor({ state: 'visible', timeout: 5000 });
      record('4) الضغط على "أضف للسلة" في وضع المنتج ينجح واجهياً', true);

      await page.locator('button', { hasText: 'إغلاق' }).click();
      await page.locator('h2', { hasText: 'تفاصيل المنتج' }).waitFor({ state: 'detached', timeout: 5000 });

      // تحقق مباشر من القاعدة — لا افتراض نجاح من رسالة الواجهة فقط
      const cookies = await context.cookies();
      const cartCookie = cookies.find((c) => c.name === CART_COOKIE);
      if (!cartCookie) throw new Error('كوكي سلة الزائر غير موجود بعد الإضافة');
      const { data: cart, error: cartErr } = await admin.from('carts').select('id').eq('session_token', cartCookie.value).single();
      if (cartErr || !cart) throw cartErr ?? new Error('سلة الاختبار غير موجودة في القاعدة');
      testCartId = cart.id as string;
      const { data: itemsAfterProduct } = await admin.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id);
      const productLineAdded = itemsAfterProduct?.some((i) => i.product_id === productA.id && i.quantity === 1);
      record(
        '5) إضافة حقيقية في القاعدة (cart_items) لمنتج وضع "منتج" — فحص مباشر عبر service_role',
        !!productLineAdded,
        JSON.stringify(itemsAfterProduct)
      );

      // ---------------------------------------------------------------------
      // 6) وضع "وصفة" — النقر على الصورة الثانية يفتح BottomSheet بعنوان الوصفة نفسه
      // ---------------------------------------------------------------------
      await carouselImages.nth(1).click();
      const recipeTitleVisible = await page.locator('h2', { hasText: `وصفة اختبار اليوم 28 — ${runId}` }).isVisible();
      record('6) النقر على صورة مرتبطة بوصفة يفتح BottomSheet بعنوان الوصفة نفسه', recipeTitleVisible);

      // الكمية الابتدائية (familySize=2=الأساس) يجب أن تساوي baseQuantity نفسه (2) — يُنتظَر استقرار
      // الرقم فعلياً (لا "..." المؤقتة أثناء انتظار scaleRecipeIngredientsAction) قبل القراءة
      await page.locator(`text=${productB.name}`).waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForFunction(
        (name) => {
          const li = Array.from(document.querySelectorAll('li')).find((el) => el.textContent?.includes(name));
          return li ? !li.textContent?.includes('...') : false;
        },
        productB.name,
        { timeout: 5000 }
      );
      const initialQuantityText = await page.locator('li', { hasText: productB.name }).locator('span').nth(1).textContent();
      record('7) الكمية الابتدائية للمكوّن تطابق baseQuantity عند familySize=الأساس', (initialQuantityText ?? '').trim().startsWith(String(RECIPE_BASE_QUANTITY)), `النص: ${initialQuantityText}`);

      // زيادة عدد الأفراد من 2 إلى 3 — الكمية المتوقعة: round(2*3/2)=3
      await page.locator('button[aria-label="زيادة عدد الأفراد"]').click();
      await page.waitForFunction(
        (name) => {
          const li = Array.from(document.querySelectorAll('li')).find((el) => el.textContent?.includes(name));
          return li?.textContent?.includes('3');
        },
        productB.name,
        { timeout: 5000 }
      );
      record('8) زيادة عدّاد عدد الأفراد تُعيد حساب الكمية فعلياً (2 → 3) عبر scaleRecipeIngredientsAction', true);

      // "أضف الكل"
      const addAllButton = page.locator('button', { hasText: 'أضف الكل' });
      await addAllButton.click();
      try {
        await page.locator('button', { hasText: 'أُضيف الكل ✓' }).waitFor({ state: 'visible', timeout: 8000 });
        record('9) الضغط على "أضف الكل" في وضع الوصفة ينجح واجهياً', true);
      } catch (e) {
        const currentButtonText = await addAllButton.textContent();
        console.error('DEBUG: نص الزر الحالي =', currentButtonText, '| أخطاء Console:', consoleErrors);
        throw e;
      }

      const { data: itemsAfterRecipe } = await admin.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id);
      const recipeLineAdded = itemsAfterRecipe?.some((i) => i.product_id === productB.id && i.quantity === 3);
      record(
        '10) إضافة حقيقية في القاعدة لمكوّن الوصفة بالكمية المُحدَّثة (3) — فحص مباشر عبر service_role',
        !!recipeLineAdded,
        JSON.stringify(itemsAfterRecipe)
      );

      await page.locator('button', { hasText: 'إغلاق' }).click();

      // ---------------------------------------------------------------------
      // 11) سلوك التمرير — الشريط (بحث+قصص+تبويبات) يختفي عند التمرير للأسفل، ويظهر عند التمرير للأعلى
      // ---------------------------------------------------------------------
      const barLocator = page.locator('[class*="sticky"][class*="transition-transform"]').first();
      await barLocator.waitFor({ state: 'attached', timeout: 5000 });

      // Tailwind v4: translate-y-*/-translate-y-full يُطبَّقان عبر خاصية CSS منفصلة `translate`
      // (longhand)، لا `transform` نفسها — getComputedStyle(el).transform يبقى "none" دائماً هنا
      // (اكتُشف فعلياً أثناء كتابة هذا السكربت: الفحص الأول اعتمد `.transform` فأعطى "none" ثابتاً
      // رغم أن الإخفاء البصري يعمل فعلياً في المتصفح).
      const readTranslate = (el: Element) => getComputedStyle(el).translate;
      const translateAtTop = await barLocator.evaluate(readTranslate);

      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(500); // انتظار انتقال CSS (duration-300) + دورة rAF الخاصة بالمكوّن
      const translateAfterScrollDown = await barLocator.evaluate(readTranslate);
      const hiddenAfterScrollDown = translateAfterScrollDown !== 'none' && translateAfterScrollDown !== translateAtTop;
      record('11) التمرير للأسفل يُخفي الشريط فعلياً (translate محسوب يتغيّر)', hiddenAfterScrollDown, `at-top: ${translateAtTop}, after-scroll-down: ${translateAfterScrollDown}`);

      await page.evaluate(() => window.scrollTo(0, 400)); // تمرير للأعلى (600 → 400)
      await page.waitForTimeout(500);
      const translateAfterScrollUp = await barLocator.evaluate(readTranslate);
      const shownAfterScrollUp = translateAfterScrollUp === translateAtTop;
      record('12) التمرير للأعلى يُظهر الشريط مجدداً فعلياً', shownAfterScrollUp, `after-scroll-up: ${translateAfterScrollUp}`);

      record('13) بلا أخطاء Console/صفحة غير متوقَّعة طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));
    } finally {
      await browser.close();
    }
  } finally {
    // ---------------------------------------------------------------------
    // تنظيف كامل — حذف المنشورات المزروعة (cascade يزيل post_media) + سلة الاختبار تحديداً (لا
    // حذف عريض بـ product_id قد يمسّ سلال زوّار حقيقيين آخرين يحملون نفس المنتجين)
    // ---------------------------------------------------------------------
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
