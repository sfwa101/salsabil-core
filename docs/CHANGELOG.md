---
title: سجل التغييرات
status: ACTIVE
version: 1.6
last_updated: 2026-09-03
owner: Claude (تلقائي مع كل مهمة كبيرة)
source_of_truth: هذا الملف + Git log
---

# سجل التغييرات

> يُسجَّل هنا فقط التغييرات المهمة (معمارية، قواعد أعمال، قاعدة بيانات، أمان، UX، قرارات، خارطة طريق) — لا كل commit صغير.

---

## 2026-09-03 (اليوم 18) — الإطلاق الحي: تحقّق Staging وسكربت التجربة الأولى (FULL-DOCS-AUDIT-AND-SYNC)

> **ملاحظة دقة مقصودة:** "اليوم 18" هنا يعني اكتمال **العمل البرمجي/الهندسي** الخاص بالإطلاق — تجهيز أداة التحقق وتسليم إرشادات الشراء اليدوي للمؤسس. إتمام أول عملية شراء حقيقية فعلية عبر `staging.reefam.com` فعل بشري يقوم به المؤسس بنفسه، خارج قدرة أي كود على "إكماله" — لا يُدَّعى هنا حدوثه فعلياً، فقط أن أداته وتحقّق جاهزيته اكتملا.

- **تحقُّق حي أولاً، لا افتراض:** قبل كتابة أي سكربت، تحقَّقتُ فعلياً أن `staging.reefam.com` حي ويستجيب (`curl` مباشر)، ثم أن المحتوى هو فعلاً هذا الكود بالذات (نص "ريف المدينة"، مسار `/daily-food`) — وأهم من ذلك: **زيارة مباشرة بلا كوكيز لـ`/cart` أعادت 200 مع "السلة فارغة" لا 500**، ما يثبت أن إصلاح `src/proxy.ts` (الأيام 14-16) يعمل فعلياً على الإنتاج الحي، ليس فقط محلياً.
- تحقَّقتُ أيضاً أن بيانات `scripts/seed-test-accounts.sql` (بأرقامها المُحدَّثة `01099999990`/`01099999991`) مزروعة فعلاً على staging — دخول التاجر والإدارة نجحا حياً (تحويل صحيح لـ`/merchant/orders`/`/admin/dashboard`).
- `scripts/test-first-real-purchase.e2e.ts` (جديد) — سكربت Playwright مستقل (لا `@playwright/test` غير مثبَّتة؛ يستخدم `playwright` الأساسية + `tsx` الموجودتين أصلاً) يحاكي رحلة عميل مجهول كاملة: رئيسية → قسم → منتج → إضافة للسلة → السلة → Checkout → إرسال → `/order/[id]` (رقم الطلب + "قيد الانتظار") → **إعادة فتح نفس الرابط من سياق متصفح ثانٍ بلا أي كوكيز** لإثبات أنه رابط دائم قابل للمشاركة فعلياً، لا مرتبط بجلسة الشراء.
- **"يتوقف قبل الدفع" لا مقابل حرفياً له في هذا التصميم** — طريقة الدفع الوحيدة (الدفع عند الاستلام) تنجح تلقائياً بلا بوابة خارجية ولا خطوة منفصلة يمكن التوقف قبلها؛ التوقف الفعلي هو عند رؤية تأكيد الطلب، بلا أي إجراء لاحق (لا تغيير حالة، لا دخول لوحة).
- **قرار تحقُّق مهم:** لم يُشغَّل السكربت ضد staging فعلياً — لا مفاتيح Supabase لتلك البيئة متاحة للتنظيف بعده، وتشغيله كان سيُنشئ طلباً تجريبياً دائماً يُزاحم أول شراء حقيقي ينوي المؤسس القيام به بنفسه. تحقَّق منه بدلاً من ذلك مرتين ضد dev المحلي (11/11 في كل مرة، صفر أخطاء console)، ونُظِّفت بيانات كلتا المرتين بعدها بالكامل عبر `service_role` المحلي.
- إرشادات يدوية مُسلَّمة للمؤسس: البيانات المطلوبة (اسم، هاتف مصري صحيح، عنوان، مدينة)، خطوات الشراء، وكيفية التحقق لاحقاً عبر لوحتَي التاجر/الإدارة على staging.
- لا اختبارات Vitest جديدة (سكربت خارج `npm test`) — المجموع يبقى **104**، مُتحقَّق منه عبر `npm test` الكامل قبل الدفع.
- commit `648cff4`.

## 2026-09-03 (اليوم 17) — تجهيز بيئة الإنتاج (PRODUCTION-PREP-001/002)

- **فحص متغيرات البيئة الحي الكامل:** بحث نصي شامل عن كل `process.env.*` في `src/` — 3 متغيرات فقط فعلياً (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)، لا أكثر. تأكَّد حياً أن `.env.local` مُستثناة عبر `.gitignore` (`.env*.local`) **ولم تظهر في تاريخ Git إطلاقاً** (`git log --all -- .env.local` فارغ).
- `.env.example` (جديد، لم يكن موجوداً) — أسماء المتغيرات الثلاثة بقيم توضيحية فقط.
- **`npm run build` حقيقي (لا افتراض):** نجح بصفر تحذيرات/أخطاء، كل الـ12 مساراً بُنيت بنجاح بما فيها `src/proxy.ts` (ظهرت كـ`ƒ Proxy (Middleware)` في إخراج البناء). لا حاجة لأي تعديل على `next.config.ts` لـVercel (فارغ أصلاً، لا `next/image` مُستخدَمة). صفر استخدامات `localhost`/`:3000` مُثبَّتة بالكود.
- `scripts/schema-setup.sql` (جديد) — إعادة بناء المخطط الكامل للاثني عشر جدولاً بترتيب Foreign Keys الصارم (`users → merchants → categories → products → inventory → carts → cart_items → orders → order_items → order_status_history → sessions → audit_log`)، كل جدول موسوم بيوم/ADR إنشائه. حيث لا نص SQL أصلي محفوظ (RLS الفعلية على `categories`/`products`/`inventory`، شكل `merchants` الكامل) وُسم صراحة `⚠️ إعادة بناء (INFERRED)` بدل ادّعاء توثيق حرفي — **أول خطوة عملية فعلية نحو نظام Migrations**، الفجوة الموثَّقة كـOPEN_QUESTION منذ اليوم 12 (`docs/SECURITY.md`، `docs/DATABASE.md §8`).
- `scripts/seed-test-accounts.sql` (جديد، منفصل عمداً عن ملف المخطط) — تاجر/منتج/إدارة تجريبيون لبيئة staging، بمفاتيح طبيعية (phone/slug/name) عبر subqueries بدل UUIDs مُدرَجة يدوياً (idempotent، يعمل على أي مشروع Supabase جديد بلا تعديل).
- **قرار أرقام هاتف staging (نهائي، بعد تكرارين):** أول نسخة أبقت على أرقام dev المحلي (`01000000000`/`01000000001`) لتفادي لمس ملفات الاختبار. قرار المؤسس النهائي غيّرها لـ`01099999990`/`01099999991` — فصل بصري متعمَّد بين بيئتين قد تُفتحان في تبويبين متجاورين. وُثِّق صراحة أن اختبارات التكامل الحية في هذا المستودع لا تلمس حسابات staging إطلاقاً — تعمل حصراً ضد dev المحلي عبر `.env.local`.
- **توثيق فقط، لم يُعدَّل:** نصوص "سلسبيل"/"ديوان"/"ريف المدينة" الثابتة في `metadata` (`layout.tsx`) والـHeader — قرار تسويقي مؤجَّل عمداً عن اتساقها مع نطاق `staging.reefam.com`/`reefam.com`.
- لا اختبارات جديدة (تجهيز بيئة بحت) — المجموع يبقى 104.
- commit `22aeb0a`.

## 2026-09-03 (الأيام 14-16) — القطعة الرأسية الحرجة للواجهة الأمامية (UI-FRONTEND-AUDIT-001 → PHASE-001، ADR-016)

- **تدقيق حي شامل أولاً (`UI-FRONTEND-AUDIT-001`)** لكل واجهات `src/app/` — لا افتراضات من التوثيق. كشف فجوتين حرجتين تمنعان "أول بيع حقيقي": **خطأ 500 حي** عند زيارة `/cart`/`/checkout` مباشرة من زائر جديد (تحقَّق منه عبر خادم `dev` حقيقي + `curl`، لم يظهر في أي تحقق Playwright سابق لأنها جميعاً اتبعت مساراً سعياً يضيف منتجاً أولاً)، وغياب أي Header/Navigation موحّد. المؤسس اعتمد نطاقاً محدوداً صراحة (ثلاثة بنود فقط، بالترتيب، اختبار كامل بعد كل بند) — بقية الفجوات (تسجيل دخول عميل، إدارة منتجات تاجر، لوحات إحصائيات) أُجِّلت عمداً لـPhase 2.
- **1) `src/proxy.ts` (إصلاح 500):** السبب الجذري — `getCartIdentity()` تكتب كوكي أثناء عرض RSC مباشرة (لا عبر Server Action)، وNext.js يمنع ذلك. **اكتشاف أثناء التنفيذ:** Next.js 16.0.0 أهمل رسمياً اصطلاح `middleware.ts` وأعاد تسميته `proxy.ts` — تحقَّق منه حياً من `node_modules/next/dist/docs` قبل الكتابة (لا اعتماداً على معرفة تدريب سابقة، بنص `AGENTS.md` "This is NOT the Next.js you know"). النطاق مقصور على `/cart`/`/checkout` فقط عمداً.
- **2) `Header.tsx` (تنقّل موحّد + عدّاد سلة):** **سباق حقيقي اكتُشف واستُبعِد قبل وقوعه أثناء التخطيط، لا بعد كسر شيء:** لو استدعى الـHeader `getOrCreateCart` مثل صفحتَي `/cart`/`/checkout` بالضبط، يتسابق الاثنان (RSC تُحلّل مكوّنات مستقلة بالتوازي) على إدراج نفس `session_token` الجديد (عمود UNIQUE)، فيفشل الخاسر بخطأ قيد فريد. أُصلح بمنع الـHeader من إنشاء سلة إطلاقاً: `getExistingCartSessionToken` (قراءة بلا إنشاء) + `cartService.getItemCountForSession` (قراءة فقط، صفر إن لم توجد سلة بعد) — تجنّب من الجذر لا معالجة بعد وقوع.
- **3) `/order/[id]` (تتبّع طلب ضيف):** `ordersService.getOrderForCustomerView` — معرّف الطلب (UUID عشوائي) هو آلية التفويض بحد ذاته (رابط حامل، نفس نمط رقم تتبّع شحنة)، **مختلف جوهرياً عن IDOR السلة المُصلَح في `ADR-014`** (هناك معرّفان يملكهما المستدعي بالفعل بلا تحقق تطابق؛ هنا لا "مستخدم آخر" في الصورة أصلاً). تخفيف أثر متعمَّد: لا يعرض عنوان التوصيل ولا هاتف/اسم العميل. `CheckoutForm` يُوجِّه إليها بعد النجاح بدل حالة تأكيد محلية مؤقتة.
- كل الثلاثة بنود مُتحقَّق منها حياً عبر Playwright (سياقات متصفح جديدة كلياً، لقطات شاشة، صفر أخطاء console) بعد كل بند قبل الانتقال للتالي — لا دفعة واحدة في النهاية.
- 7 اختبارات وحدة جديدة (`cart.service.test.ts`, `orders.service.test.ts`) — المجموع الآن **104 اختباراً**.
- تحديث `docs/DECISIONS.md` (`ADR-016`)، `docs/ROADMAP.md` (الأيام 14-16 → DONE)، `docs/SECURITY.md` (§16 جديد: نموذج تفويض الرابط الحامل + OPEN_QUESTION عن غياب Rate Limiting على `/order/[id]`).
- commit `1397f1c`.

## 2026-09-02 (اليوم 13) — الاختبار الشامل من الخارج: القطعة الرأسية الكاملة (E2E-DAY13-001)

- اختبار تكامل شامل واحد (`src/core/e2e/reef-city-journey.integration.test.ts`) يحاكي رحلة "ريف المدينة" الكاملة ضد Supabase حقيقي بثمانية سيناريوهات: زائر يتصفح (+ فحص قفل RLS المباشر على `carts`/`orders`/`merchants` عبر عميل `anon`) → سلة (محاولة سعر مخادع تُرفَض) → Checkout → تاجر أ يؤكّد → **تاجر ب حقيقي** (لا `tenantId` مُصطنَع) يُرفَض تطبيقياً **وRLS مباشرة معاً** → تاجر أ يكمل دورة الحياة → إدارة تُسلِّم بلا `tenantId` → تحقُّق كامل من `order_status_history` + `audit_log` (بما فيه حارس انحدار: `audit_log` يبقى خالياً من صفوف `entity_type: 'order'`، تصحيحاً لالتباس في صياغة المهمة الأصلية مقابل تصميم `ADR-014` الفعلي).
- **اكتُشف وأُصلح سباقان حقيقيان أثناء التحقق من الاستقرار (تشغيل `npm test` عدة مرات)، لا افتراض "نجح مرة إذن هو صحيح":**
  1. الاختبار الجديد كان يعتمد على التاجر التجريبي المشترك (`01000000000`)، الذي يُبدِّل ملف اختبار آخر (`admin.integration.test.ts`) حالة تفعيله أثناء التشغيل المتوازي لملفات Vitest — سبَّب فشلاً متقطعاً حقيقياً. أُصلح بعزل كامل: تاجر أ ومنتجه أصبحا يُنشآن حياً خصيصاً لهذا الملف، تماماً كتاجر ب.
  2. زيادة عمليات الدخول الناجحة المتزامنة (من الاختبار الجديد) كشفت تسابقاً موجوداً أصلاً في `admin.integration.test.ts` — فحص "آخر صف `auth.login_success`" بلا تصفية بالفاعل كان يلتقط أحياناً صف دخول من ملف آخر متزامن. أُصلح بإضافة `eq('actor_id', ...)`.
- المجموع ارتفع من 89 (نهاية اليوم 12) إلى **97 اختباراً**، بلا أي حالة تسابق معروفة متبقية.
- إغلاق توثيقي منفصل (`DAY-13-CLOSE`): تحديث `docs/ROADMAP.md` (الأيام 12 و13 → DONE) و`SALSABIL_CONSTITUTION.md §23` (قسم فرعي جديد "تصحيح تاريخي: من 14 إلى 18 يوماً" يوثّق التمديد الثالث والمحسوم للخطة بعد إزاحتين سابقتين موثَّقتين).
- commits `c3b28eb`، `5b3cd2a`، `68efdf4`.

## 2026-09-02 (اليوم 12) — يوم الأمان الكامل: audit_log، إصلاح IDOR، تحقق مدخلات، Rate Limiting (ADR-014, ADR-015)

- جدول `audit_log` عام جديد (`id, actor_id, actor_role, action, entity_type, entity_id, metadata jsonb, created_at`) — نفس عائلة `order_status_history` لكن خارج نطاق طلب واحد. RLS مقفول بالكامل، وصول حصري عبر `service_role`. نطاق التطبيق الفعلي: تفعيل/تعطيل التاجر (فجوة موثَّقة صراحة في `ADR-013`) ومحاولات دخول التاجر/الإدارة (نجاحاً وفشلاً).
- **مراجعة RLS شاملة على الجداول الإحدى عشر القائمة وقتها** — النتيجة: لا إعادة بناء معمارية، الأنماط الحالية صحيحة ومقصودة. إصلاحان توثيقيان فقط: تأكيد أن سياسة `users` (`auth.uid()=id`) معطَّلة عملياً (فشل آمن، لا خطر)، وأن "سياسات كتابة مفقودة" على `categories`/`products`/`inventory` ليست خطراً فعلياً (لا كود كتابة عليها إطلاقاً وقتها).
- **ثغرة IDOR حقيقية أُصلِحت:** `cartService.removeItem` كان يحذف `itemId` بلا التحقق من انتمائه فعلياً لـ`cartId` المُمرَّر — أُصلح بفحص ملكية عبر `findItems` قبل الحذف، نفس نمط `updateItemQuantity` المجاور.
- `zod` مكتبة تحقق جديدة (لم تكن مثبَّتة قبله) — `egyptianPhoneSchema`/`uuidSchema` مشتركان في `src/core/kernel/validation/schemas.ts`، مطبَّقان على كل Server Action حساس. دفاع إضافي في `transitionOrderAction`: تأكيد صريح أن دور الجلسة ضمن أدوار التاجر المعروفة.
- Rate Limiting بعدّاد في-الذاكرة — نطاق محدود صراحة لمساري الدخول فقط (تاجر/إدارة)، 5 محاولات فاشلة/15 دقيقة لكل هاتف. قيد موثَّق صراحة: لا ينجو من إعادة تشغيل الخادم أو تعدد نسخ Serverless.
- `ADR-015` (نموذج الهوية المرحلي) — Phase 1 توثيق لواقع قائم فعلياً (زائر بلا توثيق، `users.phone` يبقى `not null`)، Phase 2 (`national_id`/`is_verified`) مفاهيمي بحت، غير موجود في الجدول إطلاقاً بعد.
- المجموع ارتفع من 72 (نهاية اليوم 11) إلى **89 اختباراً**.
- تحديث `docs/DATABASE.md`، `docs/DECISIONS.md` (`ADR-014`, `ADR-015`)، `docs/SECURITY.md`، `specs/admin/SPEC.md`، `specs/merchant/SPEC.md`.
- commit `dd13cea`.

## 2026-09-02 (اليوم 11) — لوحة الإدارة الأساسية (ADR-013)
- خطة صريحة (هوية `platform_admin`، نطاق العمليات، سيناريوهات الاختبار) عُرضت واعتُمدت من المؤسس بمحددات هندسية دقيقة قبل أي كود — حظر التوسع خارج تفعيل/تعطيل التاجر، ترحيل `audit_log` العام لليوم 12 صراحة
- أول مستخدم `platform_admin` (هاتف `01000000001`) أُنشئ يدوياً عبر `service_role` — لا يوجد أي حساب إدارة قبله في المشروع
- نطاق جديد `src/core/modules/admin/` — لا جدول خاص به، تجميع قراءات/عمليات عبر `Merchant` وOrders (نفس دور `orders.service.ts` في تنسيق نطاقات أخرى). `AdminService.loginByPhone()` — نفس نمط `MerchantService.loginOwnerByPhone` حرفياً
- `admin-session.ts`: كوكي `sb_admin_session` مستقل تماماً عن `sb_merchant_session`، **+ فحص `role === 'platform_admin'` صريح** غير موجود في نظير التاجر — ضروري لأن جلسات الإدارة `tenantId` فيها `null` دائماً بتصميم، فلا يحميها فحص "tenantId موجود؟" الضمني الذي يحمي جلسات التاجر
- `merchantRepository.findAll()`/`setActiveStatus()` (+ تغليف رقيق في `merchantService`)، `ordersRepository.findAll()`/`findAllStatusHistory()` (+ تغليف رقيق `ordersService.getAllOrders()`/`getRecentStatusHistory()`) — كلها تُستدعى عبر `service.ts` نطاقات أخرى حصراً، لا وصول مباشر لـ`repository.ts` أجنبي
- **إعادة استخدام حقيقية:** `MerchantOrderRow.tsx` عُمِّم إلى `OrderRow.tsx` (يقبل `onTransition` كـ prop بدل استيراد Server Action ثابت) — نفس المكوّن يُستخدَم الآن من بوابتي التاجر والإدارة بلا تكرار كود
- `src/app/admin/dashboard/` — صفحة واحدة (لا مسارات متعددة، الحجم الحالي لا يبرر ذلك) بثلاثة أقسام: التجار (تفعيل/تعطيل)، كل الطلبات (بلا تصفية تاجر، تحكم كامل بالحالة)، سجل التدقيق (آخر 50 قيداً من `order_status_history` الموجود فعلياً — **بلا جدول `audit_log` جديد**، مؤجَّل صراحة لليوم 12)
- 24 اختباراً جديداً (وحدة + تكامل حي، بما فيها اختبارات أمنية سلبية صريحة: هاتف تاجر يُرفض من دخول الإدارة، جلسة تاجر حقيقية لا تُقرَأ كجلسة `platform_admin`) — المجموع الآن 72 اختباراً، كلها خضراء تحت `npm test` الكامل
- تحقق فعلي عبر متصفح حقيقي (Playwright): دخول بهاتف تاجر يُرفض من `/admin/login` بالرسالة الصحيحة → دخول بهاتف إدارة حقيقي ينجح → تبديل حالة تاجر ينعكس حياً → تأكيد طلب حقيقي ينعكس في سجل التدقيق حياً → تسجيل خروج → **جلسة تاجر نشطة لا تفتح `/admin/dashboard` إطلاقاً** (كوكيان منفصلان تماماً) — صفر أخطاء console حقيقية
- تحديث `docs/DATABASE.md` (استخدام `sessions` من الإدارة، جدول حسابات اختبار حية جديد)، `docs/DOMAIN_MAP.md` (قسم Admin جديد، تحديث Orders/Merchant)، `docs/ARCHITECTURE.md` (شجرة `src/`)، `docs/DECISIONS.md` (`ADR-013`)، `docs/ROADMAP.md` (اليوم 11 → DONE)، `specs/admin/SPEC.md` (جديد)، `specs/orders/README.md`، `specs/merchant/SPEC.md`

## 2026-09-02 (اليوم 10) — طلبات التاجر: تسجيل دخول حقيقي + بوابة طلبات (ADR-012)
- خطة صريحة عُرضت واعتُمدت قبل أي كود — سؤال مباشر للمؤسس بين 3 خيارات لهوية التاجر (جلسة حقيقية مصغّرة / بلا تسجيل دخول إطلاقاً / تأجيل ليوم Supabase Auth كاملة)، اختار المؤسس الخيار الأول
- **اكتشافان أمنيان حقيقيان أثناء التحقق الحي من قاعدة البيانات (لا من التوثيق) قبل التنفيذ:**
  1. `merchants` كانت قابلة للقراءة العامة بالكامل عبر `anon` منذ اليوم 4 (`phone`/`owner_id` مكشوفان) — تحقَّقنا أن لا مستهلك فعلي واحد لها في الكود، فحُذفت السياسة بالكامل بدل تقييدها
  2. `OrdersService.transitionStatus()` (اليوم 9) بلا أي فحص عزل مستأجرين — تاجر كان يستطيع نظرياً تغيير حالة طلب تاجر آخر بمجرد معرفة `orderId`. أُغلقت الفجوة بإضافة `tenantId` إلزامي فعلياً لأدوار التاجر
- جدول `sessions` جديد (كان `CONCEPTUAL` منذ اليوم 2) — يُفعِّل لأول مرة `Session`/`canAccessTenant` الموجودين في `khalil` منذ اليوم 4 بلا مستهلك فعلي
- `MerchantService.loginOwnerByPhone()` — تسجيل دخول بالهاتف الشخصي لمالك التاجر بلا كلمة مرور (خطر أمني معروف ومقبول مؤقتاً، تاجر تجريبي واحد فقط الآن)
- `KhalilService`: أربع دوال جديدة (`findUserByPhone` بلا إنشاء تلقائي، `createSession`, `validateSessionToken`, `destroySession`)
- دمج تكرار: `canAccessTenant` كانت موجودة بنسختين (`khalilService` و`merchantService`) بلا أي مستدعٍ فعلياً لأيّهما — أُبقي على نسخة `khalilService`، حُذفت الأخرى
- `merchant.repository.ts` تحوَّل من مفتاح `anon` إلى `service_role` — `create()` كان معطَّلاً صامتاً من الأساس (RLS يمنع إدراج `anon`)، نفس نمط اكتشاف `ADR-009` مع `khalil`
- بوابة تاجر فعلية جديدة (`src/app/merchant/`): `/login` (نموذج هاتف) و`/orders` (قائمة معزولة بالتاجر، أزرار تغيير حالة نصية مبنية على `ORDER_TRANSITIONS ∩ ORDER_TRANSITION_ACTORS`)، بلا `manager`/`employee` (مالك واحد فقط لكل تاجر)
- 17 اختباراً جديداً (5 وحدة merchant + 5 وحدة khalil session + 2 وحدة orders tenant-isolation + 5 تكامل حي merchant/orders) — المجموع الآن 55 اختباراً، كلها خضراء تحت `npm test` الكامل (وحدة + تكامل)
- تحقق فعلي عبر متصفح حقيقي (Playwright): دخول بهاتف حقيقي → قائمة فارغة صحيحة → طلب مزروع يظهر → "تأكيد الطلب" يحدّث الحالة حياً → تسجيل خروج → مسار محمي يُعيد التوجيه → هاتف خاطئ يُظهر رسالة الخطأ الصحيحة. أثر جانبي حميد ملاحَظ: تحذير hydration mismatch من Playwright نفسه (`caret-color:transparent` يُحقَن آلياً عند ملء حقول الإدخال آلياً) — تحقَّقنا أنه لا يظهر في تفاعل مستخدم حقيقي وأنه لا علاقة له بمنطق التطبيق (نفس النمط غير موجود في نماذج الأيام السابقة)
- تحديث `docs/DATABASE.md` (§merchants مقفول، §sessions جديد، تصحيح تصنيف RLS التاريخي)، `docs/DOMAIN_MAP.md` (Khalil, Tenant/Merchant, Orders)، `docs/ARCHITECTURE.md` (شجرة src/، عدد الجداول 11)، `docs/DECISIONS.md` (`ADR-012`)، `docs/ROADMAP.md` (اليوم 10 → DONE)، `specs/merchant/SPEC.md` (نسخة 2.0)، `specs/orders/README.md`

## 2026-09-02 (بين اليوم 9 واليوم 10) — حماية معمارية حتمية (Deterministic Guardrails, ADR-011)
- Husky: `.husky/pre-commit` (typecheck + arch:check + test:unit، سريع بلا شبكة) و`.husky/pre-push` (مجموعة الاختبارات الكاملة، تشمل تكامل حي ضد Supabase)
- `.dependency-cruiser.cjs`: 6 قواعد تفرض آلياً قاعدة اتجاه الاعتماد الموثَّقة سلفاً في `ADR-005`/`docs/ARCHITECTURE.md §3` (component→service→repository→db-client، لا عكس، لا تقاطع بين repository.ts نطاقات مختلفة، لا وصول مباشر من الواجهة لطبقة البيانات، لا وصول مباشر لـkhalil.repository.ts خارج kernel/khalil/، لا حلقات دائرية) — كل قاعدة مُتحقَّق منها فعلياً بحقن مخالفة مؤقتة والتأكد من رفضها قبل التراجع عنها واعتماد الإعداد
- **اكتشاف أثناء التنفيذ:** dependency-cruiser 18.2.0 (أحدث إصدار) يتطلب `typescript <7.0.0` ليعمل إطلاقاً — فشل صامت تام (0 ملفات مفحوصة، بلا رسالة خطأ) مع `typescript@^7.0.2` المثبَّت منذ اليوم 0. عُرضت 3 خيارات على المؤسس، اختار خفض `typescript` إلى `^6.0.3` — أُعيد التحقق من `tsc --noEmit` والاختبارات الـ30 كاملة بعد الخفض، بلا أي تغيّر سلوك
- `ADR-005` رُفعت من `PROPOSED` إلى `ACCEPTED` (الفرض الآلي = اعتماد ضمني للقاعدة)، `ADR-011` جديد يوثّق قرار الأدوات وخفض TypeScript
- `AGENTS.md` بند 9 جديد: لا تجاوز للخطافات بـ`--no-verify` إلا بطلب صريح
- `package.json`: سكربتات جديدة `typecheck`, `arch:check`, `test:unit`
- تحديث `docs/ARCHITECTURE.md` (§3.1 جديد)، `docs/DECISIONS.md` (ADR-005, ADR-011)

## 2026-09-02 (اليوم 9) — دورة حياة الطلب الكاملة (Orders Lifecycle, ORDERS-002)
- خطة صريحة (آلة الحالات + مصفوفة الفاعلين + SQL الهجرة) عُرضت واعتُمدت من المؤسس قبل أي تنفيذ كود — الهجرة طُبِّقت يدوياً عبر Supabase SQL Editor (لا أداة DDL مباشرة متاحة)، وتحقَّق منها Claude حياً بعدها (محاولة إدراج `status` غير صحيح رُفضت فعلياً بكود `23514`) قبل المتابعة
- `orders.status`: حُسم القيد المؤجَّل عمداً في `ADR-009` — 7 قيم (`pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled`) مفروضة بـ`CHECK` حي
- جدول `order_status_history` جديد (سجل تدقيق كامل: from/to/actor_role/actor_id/note)، بـ`CHECK` مطابقة، RLS مقفول بالكامل — نفس نمط `ADR-008`/`ADR-009`
- إضافة `cancelled` كحالة نهائية غير مذكورة حرفياً في `CONSTITUTION §8` — مستندة صراحة لـ`BR-009` (`ACCEPTED`) التي كانت تنتظر هذا الجدول بالذات، موثَّقة كقرار صريح في `ADR-010` لا حسماً صامتاً
- `orders.service.ts`: دالتان جديدتان — `transitionStatus()` (تحقق مزدوج: الانتقال مسموح؟ ثم الفاعل مخوَّل؟) و`getStatusHistory()`؛ `checkout()` يُنشئ الآن قيد سجل أول تلقائياً (`null → pending`, `actorRole: 'system'`)
- **إصلاح خلل موجود مسبقاً من اليوم 8:** `orders.repository.ts` كان يُرجع `status: 'pending'` مُثبَّتة يدوياً في `toOrder()` بدل قراءة العمود الفعلي من الصف — لم يظهر كخطأ وقتها لأن النوع كان مقفولاً على `'pending'` فقط؛ صار خطأً حقيقياً الآن مع توسّع الحالات، فأُصلح ليقرأ `row.status`
- `Order` يحمل الآن `updatedAt` أيضاً (كان مفقوداً رغم وجود العمود في قاعدة البيانات منذ اليوم 8)
- 11 اختباراً جديداً (5 وحدة + 6 تكامل حي) — الأخيرة تغطي دورة الحياة الكاملة PENDING→...→DELIVERED ضد Supabase حقيقي بسجل متسلسل صحيح، رفض القفز، رفض الانتقال من حالة نهائية، رفض فاعل غير مخوَّل بلا إنشاء قيد سجل، والإلغاء من حالة وسيطة غير `pending`. المجموع الآن 30 اختباراً، كلها خضراء
- `vitest.config.ts`: رفع `testTimeout` الافتراضي من 5 إلى 15 ثانية (اختبارات تكامل تضرب Supabase حياً، تحت تزامن ملفات متعددة تتجاوز 5 ثوانٍ أحياناً — ليس خللاً منطقياً)
- `specs/orders/README.md` مُلئ بالكامل (كان placeholder فارغاً) — آلة الحالات، مصفوفة الفاعلين، Open Questions صريحة (من يملك حق `out_for_delivery`/`delivered` عند بناء برق؟ هل يحق للعميل الإلغاء بعد Auth حقيقي؟)
- تحديث `docs/DATABASE.md` (§3 `orders`/`order_items`/`order_status_history`، §4 الجدول المفاهيمي)، `docs/DOMAIN_MAP.md` (Orders)، `docs/BUSINESS_RULES.md` (BR-009)، `docs/ARCHITECTURE.md` (شجرة `src/`، عدد الجداول)، `docs/DECISIONS.md` (`ADR-010`)، `docs/ROADMAP.md` (اليوم 9 → DONE، اليوم 10 → NEXT)

## 2026-09-02 — تحديث docs/ لمطابقة CART-001 قبل بدء اليوم 8
- ARCHITECTURE.md: شجرة src/ محدَّثة (cart/, inventory/, supabase-admin-client.ts)، توضيح متى يُستخدَم كل عميل Supabase
- DATABASE.md §1: أُصلح تعارض داخلي (كان يقول "لا tenant_id في أي جدول" رغم أن §2-3 يوثّقانه منذ اليوم 4)
- SECURITY.md: كان الأكثر تأخراً — §3 كان يقول multi-tenancy "لا ينطبق بعد"، و§5 لم يذكر نمط service_role إطلاقاً رغم أن ADR-008 يعتمد عليه بالكامل. وثِّق النمطان الآن (قراءة عامة مقابل قفل كامل + service_role)
- ROADMAP.md: أُضيف يوم Checkout مستقل (كان الجدول يقفز من السلة مباشرة لدورة حياة الطلب الكاملة) — هذا يُزيح الخطة لتتجاوز يوم 14 (الإطلاق يصبح يوم 15)، سُجِّل صراحة كسؤال يحتاج تأكيد المؤسس

## 2026-09-02 (اليوم 8) — Checkout: تحويل السلة إلى طلب PENDING (CHECKOUT-001)
- خطة Specification+Plan صريحة قبل أي كود، بعد تحقق مباشر من Supabase الحي (لا التوثيق فقط): منتج واحد فقط، من تاجر واحد فقط — القرار: طلب واحد بلا تقسيم تجار، مع رفض صريح لأي سلة متعددة التجار مستقبلاً (موثَّق في ADR-009)
- اكتشاف أثناء التخطيط: khalil.repository.ts (findUserByPhone/findUserById) يستخدم مفتاح anon، وRLS على users (auth.uid()=id) لا تنطبق أبداً بلا مصادقة حقيقية — الدالتان لا تعملان فعلياً (غير مستخدَمتين في أي مسار، فلا انحدار). أُضيفت دوال جديدة (findUserByPhoneAdmin, createUser) عبر service_role بدل تعديل القديمة
- إنشاء جدولي orders, order_items (بلا أي policy، وصول حصري عبر service_role — نفس نمط ADR-008)
- إضافة src/core/modules/payments/ (PaymentProvider + CashOnDeliveryProvider — التطبيق الوحيد الفعلي، باقي المزوّدين لا تزال PROPOSED)
- إضافة src/core/modules/orders/ (types, orders.service.ts, orders.repository.ts) — order_items.unit_price_snapshot يُحسَب من CatalogService.calculatePrice() مرة واحدة عند الإنشاء ثم يُجمَّد، عكس تصميم cart_items تماماً
- تعديلات مبرَّرة لنطاقين قائمين: khalil (+ findOrCreateCustomerByPhone) وcart (+ clearCart، + استخراج cart-session.ts لإعادة استخدام منطق cookie الجلسة بين cart وcheckout)
- إضافة src/app/(reef)/checkout/ (actions.ts, page.tsx) وCheckoutForm.tsx — رابط "إتمام الطلب" من صفحة السلة
- BR-016 لا يزال بلا رقم مخترَع — TODO صريح في orders.service.ts أيضاً
- 8 اختبارات وحدة جديدة (orders.service.test.ts) + اختبارا تكامل (orders.integration.test.ts، Supabase حقيقي، تنظيف ذاتي) — المجموع الآن 19 اختباراً، كلها خضراء
- تحقق فعلي عبر متصفح حقيقي (Playwright): منتج → سلة → checkout → نموذج → تأكيد طلب حقيقي (100 جنيه، الدفع عند الاستلام)، بلا أخطاء console؛ نُظِّفت بيانات الاختبار يدوياً بعد التحقق (لم يكن سكربتاً ذاتي التنظيف)
- تحديث docs/DATABASE.md (orders/order_items)، docs/DOMAIN_MAP.md (Orders, Payments, Inventory, Khalil)، docs/BUSINESS_RULES.md (BR-016)، docs/SECURITY.md (§5, §7, §8)، docs/DECISIONS.md (ADR-009)

## 2026-09-01 (اليوم 7) — نطاق السلة (Cart Domain, CART-001)
- خطة Specification+Plan صريحة قبل أي كود (دورة §24 السبعية) — قرارا المؤسس المعتمدان قبل التنفيذ: (أ) سلة زائر عبر session_token nullable، (ب) حماية الكتابة عبر service_role خادم فقط لا RLS مفتوح لـanon — موثَّقان في ADR-008
- إنشاء جدولي carts, cart_items في Supabase (لا عمود سعر إطلاقاً، CHECK يفرض user_id XOR session_token، RLS بلا policy)
- إضافة src/core/kernel/database/supabase-admin-client.ts (مفتاح service_role، حزمة server-only كحارس بناء)
- إضافة نطاق src/core/modules/inventory/ جديد بالكامل (types, service: isAvailable فقط بلا حجز, repository) — لم يكن موجوداً رغم أن جدول inventory IMPLEMENTED منذ اليوم 3
- إضافة src/core/modules/cart/ (types, cart.service.ts, cart.repository.ts) — السعر يُحسَب دائماً حياً عبر catalogService.calculatePrice، لا تكرار لمنطق التسعير
- إضافة src/app/(reef)/cart/ (actions.ts بكوكي session httpOnly، page.tsx) وزر "أضف للسلة" في ProductOptions.tsx — تحقَّق أولاً أن shadcn/ui لا تزال غير مثبَّتة (نفس فحص اليوم 6)، تُستهلَك التوكنز الدلالية فقط
- BR-016 (الحد الأدنى للطلب) جديد بحالة OPEN_QUESTION — لا رقم مُخترَع، TODO صريح في الكود
- إضافة vitest: 8 اختبارات وحدة (منطق cart.service/inventory.service، الوصول لقاعدة البيانات مُموَّه) + 3 اختبارات تكامل (ضد Supabase حقيقي، تنظّف بياناتها في afterAll) — كلها خضراء
- تحقق فعلي عبر متصفح حقيقي (Playwright): إضافة "دجاجة كاملة طازجة" (صغير) → ظهورها في /cart بسعر 100 → زيادة الكمية إلى 200 حياً → حذف → سلة فارغة، بلا أخطاء console
- تحديث docs/DATABASE.md (§3 carts/cart_items)، docs/DOMAIN_MAP.md (Cart جديد، Inventory محدَّث، تصحيح قسم Tenant/Authorization الذي عاد لحالة قديمة خاطئة في تحديث خارجي)، docs/BUSINESS_RULES.md (BR-016)

## 2026-09-01 (اليوم 6) — معمارية الثيمات متعددة العوالم (Multi-World Theming)
- إضافة src/config/theme-registry.ts: السجل المركزي لثيمات 7 عوالم (ديوان، ريف، أسراب، نبض، نور الدين، تكوين، بيان) — slug + اسم AR/EN + توكنز دلالية كاملة
- تحقَّق فعلياً: shadcn/ui **غير مثبّتة** (لا components.json، src/components/ui/ فارغ، لا cva/clsx) — سُجِّل CONFLICT-005 في docs/DECISIONS.md، استُخدم بادئة --sb- بصيغة Hex كخطة احتياط موثَّقة مسبقاً
- src/app/globals.css: طبقتان — [data-world="<slug>"] (خام) + @theme inline (دلالية) لكل الأسماء القياسية (bg-primary, text-foreground, border-border...)
- **خطأ حقيقي وقع وأُصلح أثناء التنفيذ:** @theme العادية (لا inline) تُجمِّد قيمة --color-primary عند :root وقت البناء، فلا يتغيّر شيء فعلياً عند تبديل data-world في عنصر متداخل رغم أن --sb-primary نفسه يتغيّر بشكل صحيح. اكتُشف عبر لقطات شاشة فعلية (كانت تظهر ألوان ديوان الأرجوانية على صفحات ريف رغم DOM صحيح) — أُصلح باستخدام @theme inline، أُعيد التحقق والتقط لقطات جديدة تطابق الأصل تماماً
- src/app/layout.tsx: data-world="diwan" على <html> (الافتراضي)
- نقل صفحات ريف الثلاث إلى src/app/(reef)/ (Route Group، لا يغيّر مسارات URL) مع layout.tsx يضع data-world="reef" على عنصر جذر
- تحديث CategoryCard, ProductCard, ProductOptions وصفحات (reef) لاستهلاك التوكنز الدلالية فقط (bg-card, text-foreground, border-primary...) بدل ألوان Tailwind الثابتة (stone-*, brand-green/orange) — بحث نصي عن hex خارج globals.css يُرجع صفر نتائج
- تحقق فعلي عبر Playwright: (أ) واجهة ريف مطابقة بصرياً لليوم 5 بالضبط (نفس الأخضر/البرتقالي)، (ب) تبديل data-world يدوياً من reef إلى diwan غيّر --primary فوراً (#2d6a4f → #5b3e96) دون أي تعديل كود مكوّن، (ج) حساب السعر 100/150 لا يزال صحيحاً (Server Action لم يتأثر)، (د) صفر أخطاء console
- تحديث docs/ARCHITECTURE.md §2 (+ §2.1 جديد)، docs/UI_UX_SYSTEM.md §8/§2، docs/ROADMAP.md (اليوم 6 → DONE)
- حالة ADR-007 نفسها تبقى PROPOSED كما طلب المؤسس صراحة — لم تُغيَّر لـ ACCEPTED

## 2026-09-01 (اليوم 5) — واجهة العميل (Storefront)
- تأسيس Next.js الفعلي (لم يكن موجوداً رغم تثبيته يوم 0): next.config.ts, postcss.config.mjs (Tailwind v4 عبر @tailwindcss/postcss), src/app/layout.tsx + globals.css، أُضيفت scripts (dev/build/start) لـ package.json
- ADR-006: اعتماد ألوان الدستور (#2D6A4F, #F4845F) فعلياً لأول واجهة مستخدم
- إضافة src/app/page.tsx (الأقسام)، src/app/[category]/page.tsx (منتجات القسم)، src/app/product/[id]/page.tsx + actions.ts (تفاصيل + حساب سعر عبر Server Action)
- إضافة src/components/ (CategoryCard, ProductCard, ProductOptions)
- تحديث catalog.service.ts بدوال قراءة رقيقة (listCategories, getCategoryBySlug, listProductsByCategory, getProductById) حفاظاً على اتجاه الاعتماد الموثَّق (components → service → repository)
- تحقق فعلي عبر متصفح حقيقي (Playwright headless، لعدم توفر chromium-cli): المسار الكامل (أقسام → منتج → صغير=100 → كبير=150) يعمل، بلا أخطاء console
- next dev أضاف تلقائياً قسم توثيقي في AGENTS.md (يُعاد إنشاؤه تلقائياً، يُحتفَظ به) يشير لـ node_modules/next/dist/docs/ لأن Next.js 16 يتجاوز معرفة تدريب النموذج — تم فحص دليل الترقية للتأكد من توافق params/Server Actions قبل الاستمرار
- تحديث specs/catalog/SPEC.md (UX من UNKNOWN إلى IMPLEMENTED)، docs/UI_UX_SYSTEM.md، docs/DECISIONS.md

## 2026-09-01 — تنظيف: حذف ملفات مرجع سريع مكررة من الجذر
- حذف ARCHITECTURE.md, DATABASE.md, DOMAIN_MAP.md, ROADMAP.md, SECURITY.md من جذر المستودع (نسخ اليوم 0/1 المبسطة) — استُبدلت بالكامل بـ docs/*.md الرسمية
- حسم CONFLICT-004 في docs/DECISIONS.md بقرار صريح من المؤسس
- AGENTS.md وSALSABIL_CONSTITUTION.md بقيا في الجذر (غير مكررين مع docs/)

## 2026-09-01 (اليوم 4) — نطاق التاجر وتعدد المستأجرين (Merchant Domain & Multi-Tenancy)
- إنشاء جدول merchants + عمود products.tenant_id في Supabase
- إنشاء src/core/modules/merchant/ (types.ts, merchant.service.ts, merchant.repository.ts)
- تحديث src/core/modules/catalog/ (types.ts, catalog.repository.ts) لدعم tenantId وfindProductsByTenant
- تحقق فعلي: عزل تاجر وهمي (0 منتجات)، ربط منتج حقيقي بتاجر حقيقي، رفض جلسة تاجر آخر عبر canAccessTenant
- كتابة specs/merchant/SPEC.md رجعياً، تحديث specs/catalog/SPEC.md وdocs/DATABASE.md
- ملاحظة: specs/identity/SPEC.md وdocs/BUSINESS_RULES.md (BR-007..BR-011) لم يكونا موجودين في المستودع عند بدء اليوم 4، ووصلا لاحقاً ضمن نظام التوثيق أدناه

## 2026-09-01 — نظام التوثيق الرسمي (docs/, specs/, ideas/)
- إنشاء كامل نظام التوثيق: 15 ملفاً في docs/، بنية specs/، ideas/IDEAS.md وARCHIVED.md
- تسجيل 5 ADRs رجعية (ADR-001 إلى ADR-004 معتمدة، ADR-005 مقترحة)
- تسجيل 3 تعارضات (CONFLICT-001, 002, 003) — راجع docs/DECISIONS.md
- اعتماد 5 قواعد عدالة تجار جديدة (BR-007 إلى BR-011) بحالة ACCEPTED / FOUNDER_DECISION

## 2026-08-31 (اليوم 3) — محرك المنتج (Catalog)
- إنشاء جداول: categories, products (options JSONB), inventory
- إنشاء src/core/modules/catalog/ (types.ts, catalog.service.ts, catalog.repository.ts)
- ADR-004: قرار استخدام JSONB للخيارات المرنة بدل أعمدة ثابتة/EAV
- تحقق فعلي: حساب سعر دجاجة بأحجام مختلفة (100/150 جنيه) نجح

## 2026-08-31 (اليوم 2) — الاتصال الفعلي بـ Supabase
- إنشاء مشروع Supabase حقيقي
- إنشاء جدول users مع RLS (سياسة قراءة الذات فقط)
- إنشاء src/core/kernel/database/supabase-client.ts
- إنشاء src/core/kernel/khalil/khalil.repository.ts
- تحقق فعلي: رسالة نجاح الاتصال

## 2026-08-31 (اليوم 1) — Khalil Engine + ملفات الذاكرة
- إنشاء 6 ملفات ذاكرة أولية (AGENTS, ARCHITECTURE, DATABASE, SECURITY, DOMAIN_MAP, ROADMAP — نسخة مبسطة، استُبدلت لاحقاً بنظام التوثيق الكامل في 2026-09-01)
- إنشاء src/core/kernel/khalil/ (types.ts, khalil.service.ts)
- تحقق: npx tsc --noEmit بلا أخطاء

## 2026-08-31 (اليوم 0) — إعداد البيئة
- تثبيت Git, Node.js (LTS), VS Code
- إنشاء مستودع salsabil-core + GitHub repository
- إعداد Next.js + TypeScript + Tailwind الأساسي
