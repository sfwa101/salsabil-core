// scripts/day26-feed-header-verify.ts
// اليوم 26 — تحقُّق حي على viewport الهاتف لإعادة هيكلة الترويسة (BAYAN-HOME-FEED-001): مبدّل
// عوالم (بصري)، عنوان بعناوين وهمية عبر BottomSheet، أيقونتا باركود/بحث بتنبيه "قريباً"، Story bar
// فوق الأحياء الحقيقية، شريط تبويبات كحالة عميل عبر رابط الصفحة. مقابل قيود docs/UI_UX_SYSTEM.md
// (RTL، بلا هاردكود لوني ظاهر، Sticky tab bar §7.1). عكس اليوم 25: لا صفحة معاينة مؤقتة هنا (الصفحة
// الرئيسية `/` نفسها مُعدَّلة بشكل دائم)، فيبقى هذا السكربت أيضاً دائماً — نفس نمط
// scripts/day24-bayan-admin-posts-verify.ts (تحقُّق حي دائم لميزة حقيقية دائمة، لا تحقُّق معزول مؤقت).

export {}; // يجعل الملف موديول TS فعلياً (لا استيراد ثابت غيره) — يُتيح top-level await أدناه

const { chromium } = await import('playwright');

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

type StepResult = { step: string; ok: boolean; detail?: string };
const results: StepResult[] = [];
function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\n=== اليوم 26 — ترويسة خلاصة بيان: تحقُّق حي على موبايل — ${BASE_URL} ===\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  try {
    // 1) فتح الصفحة الرئيسية
    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    record('1) فتح الصفحة الرئيسية', response?.status() === 200, `HTTP ${response?.status()}`);

    // 2) RTL فعلي — html dir=rtl، والعنوان الافتراضي محاذى صحيحاً (لا فحص بصري، فحص DOM)
    const dir = await page.evaluate(() => document.documentElement.dir);
    record('2) الصفحة RTL فعلياً (html dir=rtl)', dir === 'rtl');

    // 3) مبدّل العوالم ظاهر، والنقر عليه يعرض تنبيه "قريباً" ثم يختفي
    const globeButton = page.locator('button[aria-label="تبديل العالم"]');
    await globeButton.click();
    const toastAfterGlobe = await page.locator('text=قريباً').isVisible();
    record('3) مبدّل العوالم (بصري) ينتج تنبيه "قريباً" عند النقر', toastAfterGlobe);
    await page.locator('text=قريباً').waitFor({ state: 'detached', timeout: 3000 });

    // 4) العنوان الافتراضي ظاهر (أول عنوان وهمي)
    const defaultAddressVisible = await page.locator('text=المنزل — شارع النموذج 12، القاهرة').isVisible();
    record('4) العنوان الافتراضي (وهمي) ظاهر في الترويسة', defaultAddressVisible);

    // 5) فتح BottomSheet العنوان، واختيار عنوان آخر يحدّث الترويسة ويغلق الـSheet
    await page.locator('button', { hasText: 'المنزل — شارع النموذج' }).click();
    await page.locator('h2', { hasText: 'اختر العنوان' }).waitFor({ state: 'visible', timeout: 3000 });
    const addressCount = await page.locator('li button').count();
    await page.locator('button', { hasText: 'العمل' }).click();
    await page.locator('h2', { hasText: 'اختر العنوان' }).waitFor({ state: 'detached', timeout: 3000 });
    const addressUpdated = await page.locator('text=العمل — برج التجربة، الجيزة').isVisible();
    record('5) اختيار عنوان وهمي من BottomSheet يحدّث الترويسة ويغلق الـSheet', addressCount === 3 && addressUpdated, `عدد العناوين: ${addressCount}`);

    // 6) أيقونتا الباركود والبحث — كلتاهما تُنتج تنبيه "قريباً" (وينتهي تلقائياً بعد ~ثانيتين، يُنتظَر
    // زواله بعد كل نقرة قبل المتابعة — تفادياً لتسرّبه بصرياً على خطوات لاحقة مثل لقطة الشاشة)
    await page.locator('button[aria-label="مسح الباركود"]').click();
    const toastAfterBarcode = await page.locator('text=قريباً').isVisible();
    await page.locator('text=قريباً').waitFor({ state: 'detached', timeout: 3000 });
    await page.locator('button[aria-label="بحث"]').click();
    const toastAfterSearch = await page.locator('text=قريباً').isVisible();
    await page.locator('text=قريباً').waitFor({ state: 'detached', timeout: 3000 });
    record('6) أيقونتا الباركود والبحث تنتجان تنبيه "قريباً"', toastAfterBarcode && toastAfterSearch);

    // 7) Story bar — عنصر واحد على الأقل (حي الطعام اليومي)، رابط صحيح لصفحة القسم
    const storyLinks = await page.locator('a[href^="/"] >> visible=true').filter({ hasText: 'حي' }).count();
    const storyLinkHref = await page
      .locator('a', { hasText: 'حي الطعام اليومي' })
      .first()
      .getAttribute('href');
    record('7) Story bar يعرض الأحياء الحقيقية بروابط صحيحة', storyLinks > 0 && !!storyLinkHref && storyLinkHref !== '#', `عدد: ${storyLinks}, href: ${storyLinkHref}`);

    // 8) شريط التبويبات — 5 تبويبات (الكل + 4 أنواع منشور)، كلها ظاهرة
    const tabCount = await page.locator('button[aria-current]').count();
    record('8) شريط التبويبات يعرض 5 تبويبات (الكل + 4 أنواع)', tabCount === 5, `عدد: ${tabCount}`);

    // 9) اختيار تبويب "عرض" يحدّث الرابط (?tab=offer) ويُبرِز التبويب النشط (aria-current=true)
    await page.locator('button', { hasText: 'عرض' }).click();
    await page.waitForURL('**/?tab=offer', { timeout: 5000 });
    const offerTabActive = await page.locator('button[aria-current="true"]', { hasText: 'عرض' }).count();
    record('9) اختيار تبويب "عرض" يحدّث رابط الصفحة (?tab=offer) ويُبرِزه فعلياً', offerTabActive === 1);

    // 10) العودة لتبويب "الكل" تُزيل الباراميتر من الرابط تماماً (لا ?tab= متبقٍّ)، وتُبرِزه هو
    // تحديداً (لا "عرض" المتبقّي من الخطوة السابقة) — فحص صريح لتفادي أي التباس بصري لاحقاً
    await page.locator('button', { hasText: 'الكل' }).click();
    await page.waitForFunction(() => !window.location.search.includes('tab='), null, { timeout: 5000 });
    const allTabActiveAfterReset = await page.locator('button[aria-current="true"]', { hasText: 'الكل' }).count();
    const offerTabInactiveAfterReset = await page.locator('button[aria-current="false"]', { hasText: 'عرض' }).count();
    record(
      '10) اختيار "الكل" يزيل ?tab= من الرابط ويُبرِز "الكل" تحديداً (لا "عرض" المتبقّي)',
      allTabActiveAfterReset === 1 && offerTabInactiveAfterReset === 1
    );

    // 11) شريط التبويبات لاصق فعلياً أثناء التمرير (position: sticky محسوبة حياً — CONSTITUTION §7.1)
    const tabBarPosition = await page.evaluate(() => {
      const el = document.querySelector('[class*="sticky"]');
      return el ? getComputedStyle(el).position : null;
    });
    record('11) شريط التبويبات لاصق فعلياً (position: sticky محسوبة)', tabBarPosition === 'sticky', `القيمة: ${tabBarPosition}`);

    // 12) بلا هاردكود لوني — فحص عيّني: زر "تبديل العالم" يقرأ لون الحدود من متغيّر --sb-border
    // الحي **لنطاق reef تحديداً** (أقرب سلف [data-world="reef"]، لا <html data-world="diwan">
    // الأبعد — CSS custom properties لا تُقرأ من عنصر أب حين يُعاد تعريفها في سليل، أول محاولة هنا
    // قرأت من document.documentElement خطأً فأعطت قيمة ديوان لا ريف رغم أن الزر يعرض ريف فعلياً)
    const borderColorIsToken = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="تبديل العالم"]');
      const reefScope = btn?.closest('[data-world="reef"]');
      if (!btn || !reefScope) return false;
      const computed = getComputedStyle(btn).borderColor;
      const expected = getComputedStyle(reefScope).getPropertyValue('--sb-border').trim();
      const probe = document.createElement('canvas').getContext('2d')!;
      probe.fillStyle = expected;
      const expectedRgb = probe.fillStyle;
      probe.fillStyle = computed;
      const computedRgb = probe.fillStyle;
      return expectedRgb === computedRgb;
    });
    record('12) عنصر الترويسة يقرأ اللون من توكن دلالي حي (--sb-border) لا Hex ثابت', borderColorIsToken);

    // 13) لقطة شاشة للمراجعة البصرية اليدوية (هدوء التصميم — CONSTITUTION §21، UI_UX_SYSTEM §1)
    // انتظار قصير قبل اللقطة — يسمح لانتقال CSS (transition) للون الخلفية النشطة بالاستقرار
    // بصرياً (لُوحِظ فعلياً أثناء كتابة هذا السكربت: لقطة فورية بلا هذا الانتظار قد تلتقط لوناً
    // انتقالياً غير مستقر رغم أن قيمة aria-current في الـDOM صحيحة بالفعل في تلك اللحظة)
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scripts/day26-mobile-screenshot.png', fullPage: false });
    record('13) لقطة شاشة محفوظة للمراجعة البصرية', true, 'scripts/day26-mobile-screenshot.png');

    record('14) بلا أخطاء Console/صفحة غير متوقَّعة طوال الرحلة', consoleErrors.length === 0, consoleErrors.join(' | '));
  } catch (e) {
    record('استثناء غير متوقَّع', false, e instanceof Error ? e.message : String(e));
  } finally {
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
