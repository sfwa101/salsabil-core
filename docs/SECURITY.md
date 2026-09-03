---
title: مرجع الأمن
status: ACTIVE
version: 1.4
last_updated: 2026-09-03
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف (التفصيل)، SALSABIL_CONSTITUTION.md §4, §26 (المبدأ)
---

# مرجع الأمن

---

## 1. Authentication — Evidence: `PROPOSED`

المزوَّد: Supabase Auth (مخطَّط، غير مفعَّل بعد فعلياً — لا صفحة تسجيل دخول موجودة، اليوم 4 من الخطة).

## 2. Authorization / RBAC — Evidence: `PARTIALLY_IMPLEMENTED`

الأدوار الخمسة معرَّفة كـ `UserRole` في `khalil/types.ts`: `platform_admin`, `merchant_owner`, `merchant_manager`, `employee`, `customer`. **منطق التحقق موجود** (`KhalilService.hasRole()`) لكن **غير مربوط بأي مسار API أو صفحة فعلية بعد** — لا Middleware يستدعيه حالياً.

## 3. Multi-Tenancy Isolation — Evidence: `PARTIALLY_IMPLEMENTED` (اليوم 4)

المبدأ: `tenant_id` من الجلسة/JWT فقط، أبداً من طلب العميل. `products.tenant_id` **موجود فعلياً** ويُشير إلى `merchants.id` (`DATABASE.md §2-3`)، وعزل القراءة مُختبَر (`CatalogRepository.findProductsByTenant()`). **الفجوة المتبقية:** لا مصادقة حقيقية بعد، فـ`Session.tenantId` الذي يُفترَض أن يأتي من JWT لا يزال نوع TypeScript فقط بلا ربط فعلي بـSupabase Auth (`specs/identity/SPEC.md`) — التحقق منطقي (`MerchantService.canAccessTenant()`) لا مُفعَّل عبر مسار مصادقة حقيقي.

## 4. JWT — Evidence: `PROPOSED`

Supabase يصدر JWT تلقائياً عبر Auth. **لم يُستخدَم فعلياً في أي منطق تحقق بعد.**

## 5. Row-Level Security (RLS) وأنماط الوصول لقاعدة البيانات — Evidence: `IMPLEMENTED` (نمطان مختلفان الآن)

راجع `DATABASE.md §6` للجدول الكامل. يوجد نمطان مطبَّقان فعلياً، لكل منهما استخدام مختلف تماماً — **لا تخلط بينهما:**

**النمط 1 — قراءة عامة، مفتاح `anon`:** `categories`, `products`, `inventory`. RLS يسمح بالقراءة للجميع (بيانات كتالوج عامة بطبيعتها). **سياسات الكتابة (Insert/Update/Delete) على هذه الجداول لا تزال غير موجودة/موثَّقة — `OPEN_QUESTION`.**

**النمط 2 — قفل كامل، مفتاح `service_role` (اليوم 7، `ADR-008`؛ توسَّع لليوم 8، `ADR-009`):** `merchants`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `sessions`, **`audit_log`** (اليوم 12، `ADR-014`). RLS مفعَّل **بلا أي policy إطلاقاً** — هذا يمنع `anon`/`authenticated` تماماً، بما في ذلك القراءة. كل وصول (قراءة وكتابة) يمر حصرياً عبر `src/core/kernel/database/supabase-admin-client.ts` (مفتاح `service_role`، خادم فقط، محمي بحزمة `server-only` لمنع تسرّبه لأي Client Component). **متى يُستخدَم هذا النمط:** عندما يكتب بيانات مستخدم غير مُصادَق عليه حقيقياً (سلة الزائر عبر `session_token`) — RLS مسموح لـ`anon` في هذه الحالة لا يوفر حماية فعلية أصلاً، لأن مفتاح `anon` نفسه علني ولا يميّز بين طالب شرعي وآخر يخمّن معرّفات (كان سيخالف §2 أدناه). **قاعدة القرار لأي جدول جديد:** بيانات قراءتها عامة وآمنة للجميع ← النمط 1. بيانات خاصة بصاحبها ولا مصادقة حقيقية تحميها ← النمط 2، لا نمط وسط "RLS مفتوح لـanon باعتماد على صعوبة تخمين معرّف" (غير آمن، راجع `DECISIONS.md → ADR-008` للنقاش الكامل).

**⚠️ مراجعة RLS شاملة (اليوم 12، `ADR-014`) — النتيجة: بلا تغيير معماري، إصلاح واحد فقط.** الأنماط أعلاه صحيحة ومقصودة على كل الجداول القائمة (لا حاجة لإعادة بناء). ثلاث نقاط وُثِّقت صراحة بدل تصحيحها بلا داعٍ:
1. **سياسة `users` (`auth.uid() = id`) معطَّلة عملياً** — لا Supabase Auth حقيقية بعد، فـ`auth.uid()` لا يُطابِق شيئاً. غير خطيرة (فشل آمن — تمنع بدل أن تسمح خطأً)، تُفعَّل تلقائياً عند بناء Auth حقيقية لاحقاً.
2. **سياسات الكتابة المفقودة على `categories`/`products`/`inventory` (النمط 1) ليست خطراً فعلياً اليوم** — تحقُّق حي أكَّد عدم وجود أي كود كتابة عليها إطلاقاً حتى الآن (`catalog.repository.ts`/`inventory.repository.ts` قراءة فقط). القرار: تُحسَم عند بناء أول ميزة كتابة فعلية على هذه الجداول، لا مسبقاً.
3. **ثغرة IDOR حقيقية أُصلِحت** — `cartService.removeItem` (`src/core/modules/cart/cart.service.ts`) كان يحذف `itemId` بلا التحقق من انتمائه لـ`cartId` المُمرَّر. أُصلِح بنفس نمط `updateItemQuantity` المجاور (فحص الملكية عبر `findItems` قبل الحذف). مُختبَر حياً (`cart.integration.test.ts` → "Cart IDOR").

## 6. Server-Side Validation — Evidence: `IMPLEMENTED` (في Catalog)

`CatalogService.calculatePrice()` يعيد حساب السعر من الخادم دائماً، لا يثق بأي رقم من العميل — هذا أول تطبيق فعلي لمبدأ `SALSABIL_CONSTITUTION.md §4` بند 2.

## 7. الأسعار والحسابات — Evidence: `CONSTITUTION`, `IMPLEMENTED` جزئياً

قاعدة صارمة: كل حساب سعر يحدث في `service.ts` فقط، مرة واحدة لكل منطق، لا يُكرَّر (`SALSABIL_CONSTITUTION.md §4` بند 2). المصدر الوحيد لحساب السعر هو `CatalogService.calculatePrice()` — لا `CartService` ولا `OrdersService` (اليوم 8) يعيدان كتابته، كلاهما يستدعيانه حياً. الفرق الجوهري بينهما: `cart_items` **لا** تُخزِّن سعراً إطلاقاً (يُحسَب عند كل قراءة)، بينما `order_items.unit_price_snapshot` **يُحسَب مرة واحدة عند إنشاء الطلب ثم يُجمَّد للأبد** — عكس تماماً، ومقصود (راجع `ADR-009`).

## 8. الدفع — Evidence: `PARTIALLY_IMPLEMENTED` (اليوم 8 — COD فقط)

`PaymentProvider` (واجهة) + `CashOnDeliveryProvider` (التطبيق الوحيد الفعلي) في `src/core/modules/payments/`. لا معالجة دفع فعلية — COD ينجح فوراً دائماً (`charge()` يُعيد `success:true`)، لا اتصال بمزوّد خارجي. باقي المزوّدين (VodafoneCash, Instapay, Card, DiwanWallet) لا تزال `PROPOSED` (`ARCHITECTURE.md §4`) — لم تُلمَس.

## 9. Audit Logs — Evidence: `IMPLEMENTED` (اليوم 12، `ADR-014`)

جدول `audit_log` عام (`docs/DATABASE.md` §3) — يغطي كل عملية حساسة خارج دورة حياة الطلب (التي تبقى في
`order_status_history` كما هي منذ اليوم 9، بلا لمس). **مُطبَّق فعلياً اليوم على نطاقين محدَّدين** (لا أكثر، حسب
فجوات موثَّقة صراحة في `ADR-013`):
1. تفعيل/تعطيل التاجر (`AdminService.setMerchantActiveStatus` → `merchant.activated`/`merchant.deactivated`) —
   الفجوة المذكورة حرفياً في `ADR-013` كـ"غير مسجَّلة".
2. محاولات دخول التاجر والإدارة، نجاحاً وفشلاً (`MerchantService.loginOwnerByPhone`/`AdminService.loginByPhone` →
   `auth.login_success`/`auth.login_failed`).

لا بيانات حساسة في `metadata` (لا Token جلسة، لا كلمة مرور — غير موجودة أصلاً). راجع `src/core/modules/audit/`.

## 10. حماية البيانات / Secrets — Evidence: `IMPLEMENTED`

مفاتيح Supabase في `.env.local`، مُستثناة من Git عبر `.gitignore` (`.env*.local`) — **تم التحقق فعلياً في اليوم 2.**

## 11. API Security — Evidence: `NOT_YET_APPLICABLE`

لا API خارجية مكشوفة بعد (راجع `API_CONTRACTS.md`).

## 12. Rate Limiting — Evidence: `IMPLEMENTED` (اليوم 12، `ADR-014` — نطاق محدود بموافقة صريحة)

النطاق: مسارَي الدخول فقط (`loginMerchantAction`/`loginAdminAction`) — أعلى قيمة هجومية فعلية اليوم (دخول بلا كلمة
مرور، `ADR-012`/`ADR-013`). **الرقم المعتمد (موافقة صريحة على خطة اليوم 12):** 5 محاولات فاشلة لكل رقم هاتف خلال
15 دقيقة، ثم رفض مؤقت. الآلية: عدّاد في-الذاكرة (`src/core/kernel/security/rate-limit.ts`، مفتاحه `merchant:<phone>`/
`admin:<phone>` منفصلَين).

**قيد موثَّق صراحة (لا تجاهل صامت):** لا ينجو من إعادة تشغيل الخادم أو تعدد النسخ (Serverless/عدة خوادم) — مقبول
مؤقتاً لمرحلة تجربة تاجر واحد على خادم واحد. **يجب** إعادة تقييمه (Redis/DB) قبل إنتاج حقيقي متعدد الخوادم — بند
صريح في `docs/ROADMAP.md`. لا نطاق آخر (السلة، الطلبات، الكتالوج) محمي بتحديد معدل بعد — خارج نطاق اليوم.

## 13. عدم الثقة في بيانات العميل — Evidence: `CONSTITUTION`, `IMPLEMENTED` جزئياً

مطبَّق في `CatalogService.validateOptions()` (يتحقق أن كل خيار مُرسَل من العميل موجود فعلياً في خيارات المنتج قبل قبوله).

## 14. العمليات الحساسة و Human Approval — Evidence: `CONSTITUTION` §4 بند 4

حكيم (Hakim) بحق نقض بشري كامل في كل قرار مالي أو حرج — `ACTIVE` كمبدأ، `NOT_YET_APPLICABLE` تقنياً (حكيم غير مبني بعد).

## 15. تحقق مدخلات Server Actions — Evidence: `IMPLEMENTED` (اليوم 12، `ADR-014`)

مكتبة `zod` (جديدة اليوم — لا مكتبة تحقق كانت مثبَّتة قبله). أنماط مشتركة في
`src/core/kernel/validation/schemas.ts` (`egyptianPhoneSchema`, `uuidSchema`)، ومخططات مخصَّصة بجانب كل Server
Action لبياناته (`checkout/actions.ts`, `merchant/orders/actions.ts`, `admin/dashboard/actions.ts`). **قاعدة
عامة:** كل Server Action يستقبل معرّفاً (`orderId`/`merchantId`/`itemId`) من العميل يمر بـ`uuidSchema` قبل الوصول
لأي طبقة خدمة. **دفاع إضافي (Defense-in-depth) في `transitionOrderAction`:** تأكيد صريح أن دور الجلسة ضمن أدوار
التاجر المعروفة، لا الاعتماد الضمني وحده على "فقط أدوار التاجر تملك `tenantId`".

## 16. تفويض رابط تتبّع الطلب للعميل الضيف (Guest Order Bearer Link) — Evidence: `IMPLEMENTED` (الأيام 14-16، `ADR-016`)

صفحة `/order/[id]` (`ordersService.getOrderForCustomerView`) **بلا فحص تاجر أو جلسة إطلاقاً** — بقرار معماري
متعمَّد، لا سهواً. **نموذج التفويض هنا مختلف جوهرياً عن كل ما سبق في هذا الملف:** معرّف الطلب نفسه
(`orders.id`، UUID عشوائي `gen_random_uuid()`، غير قابل للتخمين عملياً) هو آلية التفويض بحد ذاتها — رابط حامل
(Bearer Link)، نفس نمط "رقم تتبّع شحنة" في أي خدمة توصيل حقيقية. معرفة الرابط = حق العرض، بلا حساب ولا تسجيل
دخول (بقرار صريح خارج نطاق هذه المرحلة).

**لماذا هذا ليس IDOR (تباين صريح مع `ADR-014` §5 أعلاه):** ثغرة IDOR السلة المُصلَحة في `ADR-014` كانت فشلاً في
**التحقق من تطابق معرّفين يملكهما المستدعي بالفعل** (`itemId` يجب أن ينتمي لـ`cartId` المُمرَّر، لا أي `cartId`
آخر). هنا لا يوجد معرّف ثانٍ يُقارَن به — **لا "مستخدم آخر" في الصورة أصلاً**؛ زائر ضيف لا هوية دائمة له، ومعرفة
الـUUID نفسه هي كامل ما يُثبت حق الوصول، بتصميم مقصود لا بفجوة تحقق منسية.

**تخفيف أثر متعمَّد (Defense-in-depth):** الصفحة تعرض الحالة والعناصر والإجمالي فقط — **لا عنوان التوصيل ولا
هاتف/اسم العميل** — لتقليل الضرر لو تسرَّب الرابط لطرف غير مقصود (رسالة مُعاد توجيهها، سجل متصفح مشترك، إلخ).

**⚠️ قيد معروف (لا تجاهل صامت):** لا تحديد معدل (Rate Limiting) ولا انتهاء صلاحية على قراءة `/order/[id]` — أي
حامل للرابط يستطيع الاستعلام عنه بلا حد. مقبول الآن عند حجم البيانات التجريبي الحالي (نفس نمط أرقام تتبّع الشحن
العامة في الصناعة)، **يجب** إعادة تقييمه (تحديد معدل على الأقل) قبل حجم بيانات إنتاجي حقيقي — راجع بند
OPEN_QUESTIONS أدناه.

---

## قائمة OPEN_QUESTIONS الأمنية المجمَّعة

1. سياسات RLS للكتابة على `users`/`categories`/`products`/`inventory` (النمط 1، قراءة عامة) — لا تزال غير موجودة. **محسومة بالفعل لـ`merchants`/`carts`/`cart_items`/`orders`/`order_items`/`order_status_history`/`sessions`/`audit_log` (النمط 2، قفل كامل + service_role) منذ اليوم 7. مراجعة اليوم 12 (`ADR-014`) أكَّدت حياً: لا كود كتابة إطلاقاً على `categories`/`products`/`inventory` حتى الآن — لا خطر فعلي، القرار يُحسَم عند بناء أول ميزة كتابة عليها.**
2. من يملك حق إنشاء `users` جديد (Auth مباشرة أم service مخصص؟) — لا يزال `OPEN_QUESTION` عاماً؛ **مُطبَّق فعلياً لسياق Checkout تحديداً منذ اليوم 8** (`KhalilService.findOrCreateCustomerByPhone()` عبر `service_role`، راجع `ADR-009`)، لا حلاً شاملاً لبقية المسارات (تسجيل تاجر، دخول حقيقي)
3. ~~Rate limiting — لا رقم ولا آلية محددة~~ **محسومة اليوم 12 (`ADR-014`) — راجع §12 أعلاه، نطاق محدود (الدخول فقط) بعدّاد في-الذاكرة.**
4. Soft Delete مقابل Hard Delete — غير محسوم (`DATABASE.md §7`)
5. BR-016 (الحد الأدنى لقيمة الطلب) — لا رقم معتمد (`docs/BUSINESS_RULES.md`)
6. متى تُبنى `sessions`/تسجيل الدخول الحقيقي — يبقى شرطاً لتفعيل §3 أعلاه فعلياً لا منطقياً فقط
7. **جديد (اليوم 12):** استبدال الدخول بلا كلمة مرور (تاجر وإدارة) بكلمة مرور/OTP/Supabase Auth كاملة — خارج نطاق اليوم صراحة (نطاق أكبر بكثير من يوم أمان واحد)، تخفيف الضرر المؤقت الوحيد المُطبَّق اليوم هو تحديد المعدل + سجل تدقيق لكل محاولة (§9/§12). يبقى قراراً مؤسس منفصل مطلوب قبل أي عميل حقيقي ثانٍ.
8. **جديد (اليوم 12):** تأسيس نظام Migrations رسمي (`docs/DATABASE.md §8`) — لا يزال كل SQL يُنفَّذ يدوياً، بما فيها `audit_log` الجديد. مرشَّح طبيعي لليوم 13 (التجهيز للإنتاج).
9. **جديد (الأيام 14-16، `ADR-016`):** لا تحديد معدل ولا انتهاء صلاحية على قراءة `/order/[id]` (راجع §16 أعلاه) — أي حامل لرابط تتبّع طلب يستطيع الاستعلام عنه بلا حد. مقبول مؤقتاً لحجم البيانات التجريبي الحالي، يجب إعادة تقييمه قبل إنتاج حقيقي بحجم بيانات أكبر.
