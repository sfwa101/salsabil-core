// scripts/test-first-real-purchase.e2e.ts
// اختبار Playwright من طرف إلى طرف يحاكي رحلة "عميل مجهول" الكاملة على ريف المدينة — من الزيارة
// الأولى حتى رؤية تأكيد الطلب. سكربت مستقل (لا @playwright/test — غير مثبَّتة في المشروع، فقط
// `playwright` الأساسية + `tsx` لتشغيل TS مباشرة، كلاهما موجود أصلاً في devDependencies).
//
// التشغيل:
//   npx tsx scripts/test-first-real-purchase.e2e.ts
//
// متغيرات بيئة اختيارية (كلها بقيم افتراضية آمنة — لا حاجة لأي إعداد لتشغيله كما هو):
//   TEST_BASE_URL       افتراضي: https://staging.reefam.com
//   TEST_CUSTOMER_NAME  افتراضي: "عميل اختبار الشراء"
//   TEST_CUSTOMER_PHONE افتراضي: 01055500000 (صيغة مصرية صحيحة، واضحة كرقم اختبار)
//   TEST_CUSTOMER_ADDRESS / TEST_CUSTOMER_CITY
//
// ⚠️ "يتوقف قبل الدفع": طريقة الدفع الوحيدة في المشروع اليوم هي الدفع عند الاستلام
// (CashOnDeliveryProvider — docs/SECURITY.md §8) — لا بوابة دفع فعلية، لا خطوة دفع منفصلة يمكن
// التوقف قبلها حرفياً. "التوقف" هنا يعني: السكربت يكتفي بمشاهدة تأكيد الطلب، ولا يتخذ أي إجراء
// لاحق (لا تغيير حالة، لا دخول لوحة تاجر/إدارة، لا محاكاة تسليم) — ذلك متروك للمؤسس يدوياً
// (راجع التقرير المرفق، القسم 2).
//
// ⚠️ لا وصول لقاعدة بيانات هنا إطلاقاً (لا مفاتيح Supabase، لا service_role) — اختبار صندوق أسود
// حقيقي (Black-Box) عبر المتصفح فقط، تماماً كتجربة عميل حقيقي، بلا أي امتياز خاص.

import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_BASE_URL ?? 'https://staging.reefam.com';
const CUSTOMER_NAME = process.env.TEST_CUSTOMER_NAME ?? 'عميل اختبار الشراء';
const CUSTOMER_PHONE = process.env.TEST_CUSTOMER_PHONE ?? '01055500000';
const CUSTOMER_ADDRESS = process.env.TEST_CUSTOMER_ADDRESS ?? 'شارع الاختبار 1';
const CUSTOMER_CITY = process.env.TEST_CUSTOMER_CITY ?? 'القاهرة';

type StepResult = { step: string; ok: boolean; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\n=== اختبار الشراء الكامل — ${BASE_URL} ===\n`);

  const browser = await chromium.launch();
  // سياق جديد كلياً بلا كوكيز — يحاكي زائراً مجهولاً حقيقياً، أول زيارة على الإطلاق
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  try {
    // 1) الزيارة الأولى — الصفحة الرئيسية
    const homeResponse = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    record('1) زيارة الصفحة الرئيسية', homeResponse?.status() === 200, `HTTP ${homeResponse?.status()}`);

    // 2) اختيار "حي الطعام اليومي" — waitForURL (لا waitForLoadState) لأن التنقّل من جانب العميل
    // (Next.js Link) قد يُبلَّغ "networkidle" قبل أن يبدأ فعلياً، فيسبق فحص page.url() وصول الصفحة
    const categoryLink = page.locator('a', { hasText: 'حي الطعام اليومي' }).first();
    await categoryLink.waitFor({ timeout: 10000 });
    await Promise.all([page.waitForURL(/\/daily-food/, { timeout: 10000 }), categoryLink.click()]);
    await page.waitForLoadState('networkidle');
    record('2) الدخول لقسم "حي الطعام اليومي"', true, page.url());

    // 3) اختيار أول منتج ظاهر في القسم (لا اسم منتج مُثبَّت بالكود — أكثر مرونة لتغيّر الكتالوج مستقبلاً)
    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await firstProductLink.waitFor({ timeout: 10000 });
    const productName = (await firstProductLink.locator('span').first().textContent())?.trim();
    await Promise.all([page.waitForURL(/\/product\//, { timeout: 10000 }), firstProductLink.click()]);
    await page.waitForLoadState('networkidle');
    record('3) فتح صفحة المنتج', true, productName ?? page.url());

    // 4) إضافة للسلة (الحجم الافتراضي المُختار مسبقاً من الواجهة، بلا تعديل)
    const addToCartButton = page.locator('button', { hasText: 'أضف للسلة' });
    await addToCartButton.waitFor({ timeout: 10000 });
    await addToCartButton.click();
    await page.waitForSelector('text=أُضيف للسلة', { timeout: 15000 });
    record('4) إضافة المنتج للسلة', true);

    // 5) الانتقال للسلة والتأكد من ظهور البند
    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
    const cartBody = await page.textContent('body');
    const itemInCart = !!productName && (cartBody ?? '').includes(productName);
    record('5) ظهور المنتج في السلة', itemInCart);

    // 6) إتمام الطلب — الانتقال لـ/checkout
    const checkoutLink = page.locator('a', { hasText: 'إتمام الطلب' });
    await checkoutLink.waitFor({ timeout: 10000 });
    await Promise.all([page.waitForURL('**/checkout'), checkoutLink.click()]);
    record('6) الوصول لصفحة Checkout', /\/checkout/.test(page.url()));

    // 7) تعبئة نموذج Checkout ببيانات اختبار واضحة (راجع رأس الملف لتخصيصها عبر متغيرات بيئة)
    await page.fill('input[type="tel"]', CUSTOMER_PHONE);
    const textInputs = page.locator('input:not([type="tel"])');
    await textInputs.nth(0).fill(CUSTOMER_NAME); // الاسم
    await textInputs.nth(1).fill(CUSTOMER_ADDRESS); // العنوان
    await textInputs.nth(2).fill(CUSTOMER_CITY); // المدينة
    record('7) تعبئة بيانات التوصيل', true, `${CUSTOMER_NAME} / ${CUSTOMER_PHONE} / ${CUSTOMER_ADDRESS}, ${CUSTOMER_CITY}`);

    // 8) تأكيد الطلب — ⚠️ نقطة اللاعودة: هذا يُنشئ طلباً حقيقياً فعلياً في قاعدة البيانات
    // (الدفع عند الاستلام ينجح تلقائياً دائماً — لا بوابة خارجية، لا رسوم، لا خطوة توقف حرفية ممكنة هنا)
    const submitButton = page.locator('button', { hasText: 'تأكيد الطلب' });
    await submitButton.click();
    await page.waitForURL(/\/order\/[0-9a-f-]+/, { timeout: 15000 });
    const orderUrl = page.url();
    const orderId = orderUrl.split('/order/')[1];
    record('8) إرسال الطلب وإعادة التوجيه لصفحة التتبّع', true, orderUrl);

    // 9) التحقق من محتوى صفحة التأكيد — رقم الطلب + الحالة "قيد الانتظار"
    const confirmationBody = await page.textContent('body');
    const showsOrderNumber = (confirmationBody ?? '').includes(orderId.slice(0, 8));
    const showsPendingStatus = (confirmationBody ?? '').includes('قيد الانتظار');
    record('9) صفحة التأكيد تعرض رقم الطلب', showsOrderNumber, `#${orderId.slice(0, 8)}`);
    record('9) صفحة التأكيد تعرض الحالة "قيد الانتظار"', showsPendingStatus);

    // 10) التحقق من أن الرابط رابط دائم حقيقي — فتحه من سياق منفصل كلياً بلا أي كوكيز (يحاكي
    // مشاركة الرابط لجهاز/متصفح آخر تماماً، لا الاعتماد على جلسة السياق الحالي)
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    const freshResponse = await freshPage.goto(orderUrl, { waitUntil: 'networkidle' });
    const freshBody = await freshPage.textContent('body');
    const worksAsSharedLink =
      freshResponse?.status() === 200 && !!productName && (freshBody ?? '').includes(productName);
    record('10) الرابط يعمل من متصفح/جهاز منفصل بلا جلسة (رابط قابل للمشاركة فعلاً)', worksAsSharedLink);
    await freshContext.close();

    record('صفر أخطاء console عبر الرحلة كاملة', consoleErrors.length === 0, consoleErrors.join(' | '));
  } catch (e) {
    record('استثناء غير متوقع أوقف السكربت', false, e instanceof Error ? e.message : String(e));
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('\n=== الملخص ===');
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.step}`);
  }
  console.log(failed.length === 0 ? '\nنجحت الرحلة الكاملة.' : `\n${failed.length} خطوة/خطوات فشلت.`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
