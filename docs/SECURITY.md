---
title: مرجع الأمن
status: ACTIVE
version: 1.7
last_updated: 2026-09-09
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف (التفصيل)، SALSABIL_CONSTITUTION.md §4, §26 (المبدأ)، INVARIANTS.md (الحالة والدليل الفعلي القابل للتحقق لكل ثابت أمني)
---

> **تحديث 2026-09-06 (`CONSTITUTION-V2-BATCH2-ARCHITECTURE-SECURITY-DATABASE`):** إضافة §0 "Trust
> Boundaries"، §0.1 "No Trust in Client"، §0.2 "No Security by UI"، وBLOCKER صريح على تسجيل الدخول
> بلا كلمة مرور (يربط §1 أدناه). بنود قائمة (§3 Multi-Tenancy تحديداً) اختُصرت لإحالة مباشرة لـ
> `INVARIANTS.md` بدل تكرار وصف التنفيذ — لا تغيير في الحقائق نفسها، فقط مكان سردها الكامل.

---

## 0. Trust Boundaries — الحدود الفعلية بين الثقة وعدمها

Evidence: `IMPLEMENTED` (مُستخرَجة من التنفيذ الفعلي في `src/`، لا افتراضاً نظرياً)

```
Browser (Untrusted)
   │  لا يُوثَق بأي شيء يصل من هنا: مدخلات نموذج، قيمة كوكي، role/tenant_id مُدَّعى، سعر/كمية
   ▼
Server Action (src/app/**/actions.ts)
   │  التحقق الفعلي هنا: شكل/نوع المدخل عبر Zod (`src/core/kernel/validation/schemas.ts` +
   │  مخططات محلية لكل action) — `egyptianPhoneSchema`, `uuidSchema`، إلخ (`ADR-014`). هذه طبقة
   │  تحقق شكل (Validation)، لا قرار تفويض (Authorization) — الاثنان منفصلان عمداً.
   ▼
Service (core/modules/*/service.ts أو core/kernel/*/service.ts)
   │  قرار التفويض الفعلي هنا: `assertActorCanAccessOrder()` (orders.service.ts، عزل مستأجرين،
   │  `ADR-022` بند د)، `MerchantService.canAccessTenant()`/`KhalilService.hasRole()`، فحص دور
   │  الجلسة صراحة في `transitionOrderAction` (دفاع مضاعف، `ADR-014`). **من هنا تحديداً يأتي كل
   │  سعر/توفر مخزون/حالة طلب — الخادم يعيد حسابها دائماً، لا يقرأها من مدخل العميل** (`INV-SEC-001`).
   ▼
Repository (core/modules/*/repository.ts)
   │  لا قرار تفويض هنا — طبقة وصول بيانات بحتة (استعلام/إدراج فقط). العزل الفعلي (Tenant/IDOR)
   │  يجب أن يكون قد تم في طبقة Service قبل الوصول لهنا؛ الاستثناء البنيوي الوحيد الحالي: RLS مقفول
   │  بالكامل على معظم الجداول (§ RLS في DATABASE.md) يعني أن `anon` لا يصل لهذه الطبقة أصلاً بلا
   │  `service_role` — لكن `service_role` نفسه يتجاوز RLS بالكامل، فالعزل المنطقي يبقى مسؤولية
   │  الـService لا الـRepository ولا RLS في هذا النمط.
   ▼
Database (Postgres/Supabase)
   │  آخر خط دفاع بنيوي: قيود `CHECK` (`orders_status_check`، `quantity_available >= 0`)، قيود FK
   │  (`user_personas.user_id → on delete restrict`)، RLS (نمطان — راجع `docs/DATABASE.md §6`).
   │  هذه الطبقة لا "تعرف" من الفاعل منطقياً (لا صلاحيات دور) — فقط تفرض اتساق بيانات وعزل وصول خام.
   ▼
External Services (Supabase Storage، مستقبلاً: بوابات دفع/توصيل/رسائل)
      لا خدمة خارجية حقيقية مُستهلَكة اليوم غير Supabase نفسها (`CashOnDeliveryProvider` لا يتصل
      بأي طرف خارجي — راجع §8 أدناه). أي Adapter مستقبلي (VodafoneCash، Instapay...) يدخل هنا،
      خلف واجهة `PaymentProvider` (`docs/ARCHITECTURE.md §4`) — لا اتصال مباشر من Service.
```

**القاعدة الحاكمة لهذا المخطط:** كل انتقال من طبقة لأخرى أضيق ثقة من التي قبلها. أي كود جديد يتحقق
من صلاحية/سعر/ملكية **بعد** طبقة Service (في Repository أو أبعد) يعني أن التحقق تأخر عن مكانه
الصحيح — ليس خطأً بالضرورة (دفاع إضافي مقبول) لكنه لا يجوز أن يكون **الفحص الوحيد**.

---

## 0.1 No Trust in Client — القائمة الصريحة

القيم التالية **دائماً** غير موثوقة عندما تصل من العميل (Browser)، بصرف النظر عمن يرسلها (زائر،
تاجر مسجَّل دخول، حتى إدارة) — الخادم يعيد حسابها أو التحقق منها مباشرة من قاعدة البيانات، لا يُصدِّق
القيمة المُرسَلة أبداً:

| القيمة | لماذا غير موثوقة | من يعيد حسابها/التحقق منها | Evidence |
|---|---|---|---|
| `role` (دور المستخدم) | العميل قد يدَّعي دوراً لا يملكه | يُقرأ من `sessions` عبر `token` عشوائي فقط، أبداً من مدخل نموذج | `INV-AUTHZ-001` (`INVARIANTS.md`) |
| `tenant_id` | العميل قد يدَّعي انتماءً لتاجر آخر | يُقرأ من الجلسة (`sessions.tenant_id`)، يُقارَن صراحة قبل أي قراءة/تعديل طلب | `INV-TEN-001` (`INVARIANTS.md`) |
| السعر (`price`) | تلاعب مباشر بربحية التاجر/المنصة | `CatalogService.calculatePrice()` من الخادم دائماً؛ العميل لا يملك حتى حقلاً لإرساله (`CheckoutInput` بلا حقل سعر) | `INV-SEC-001` (`INVARIANTS.md`) |
| المخزون (`stock`/توفر) | طلب كمية غير متوفرة فعلياً | `InventoryRepository.decrementIfAvailable()` — قراءة/تحديث ذرّي من الخادم، لا ثقة بادعاء توفر من العميل | `INV-INV-001` (`INVARIANTS.md`) |
| حالة الطلب (`status`) | تخطي انتقالات آلة الحالة | `ORDER_TRANSITIONS`/`ORDER_TRANSITION_ACTORS` (`orders/types.ts`) تُفرَض في الخادم، مع قيد `CHECK` مطابق في DB كدفاع ثانٍ | `INV-ORD-001` (`INVARIANTS.md`) |
| أي مُعرِّف مورد فرعي (`itemId`, `orderId`...) | انتحال وصول لمورد لا يملكه الفاعل (IDOR) | فحص انتماء صريح للمعرّف الأب قبل التنفيذ (`cartService.removeItem`)، أو سياق فاعل إلزامي في التوقيع نفسه (`assertActorCanAccessOrder`) | `INV-SEC-002`, `INV-TEN-001` (`INVARIANTS.md`) |

**لا تفصيل تنفيذي إضافي هنا عمداً** — كل قيمة أعلاه تحمل Invariant موثَّقاً بدليله الكامل (كود +
اختبار + حالة `ENFORCED`/`PARTIAL`/إلخ) في `INVARIANTS.md`؛ هذا الجدول فهرس فقط لضمان عدم نسيان أي
منها، لا مصدر التفصيل.

---

## 0.2 No Security by UI

**إخفاء عنصر في الواجهة ليس Authorization.** زر مخفي، رابط غير معروض، أو تبويب لا يظهر لدور معيّن —
كل هذه إجراءات تجربة مستخدم (UX)، لا حماية. **كل عملية حساسة تُحمى في الخادم** (طبقة Service، راجع
§0 أعلاه)، بصرف النظر عمّا تعرضه الواجهة أو تخفيه. مثال ملموس قائم فعلياً في هذا المشروع:
`transitionOrderAction` يتحقق صراحة أن دور الجلسة ضمن أدوار التاجر المعروفة (`ADR-014`) **حتى لو**
لم تعرض الواجهة أصلاً زر انتقال حالة لدور غير مخوَّل — التحقق الخادمي هو الحماية الفعلية الوحيدة،
لا غياب الزر من الشاشة.

---

## 1. Authentication — Evidence: `PARTIALLY_IMPLEMENTED`

المزوَّد النهائي المخطَّط: Supabase Auth (`PROPOSED`، غير مفعَّل بعد — لا صفحة تسجيل دخول بمعنى
Auth حقيقية). **الموجود فعلياً اليوم (مُحدَّث 2026-09-09):** تسجيل دخول تاجر/إدارة بالهاتف + كلمة
مرور معاً (`MerchantService.loginOwnerByPhone`/`AdminService.loginByPhone` →
`KhalilService.verifyPasswordForPhone`، تجزئة `scrypt` + `timingSafeEqual` عبر `node:crypto`
المدمجة بلا تبعية جديدة — `src/core/kernel/security/password.ts`)، عبر جلسة مخصَّصة (`sessions`،
`ADR-012`/`ADR-013`) لا Supabase Auth. كلمة مرور مؤقتة تُجبِر تغييرها عند أول دخول
(`users.must_change_password`/`sessions.must_change_password`). راجع
`specs/identity/PASSWORD_AUTH_SPEC.md` للتصميم الكامل.

> **⚠️ BLOCKER سابق — الآن `PARTIAL` (لا `RESOLVED` بعد):** BLOCKER دخول بلا كلمة مرور
> (`INV-AUTHN-001` في `INVARIANTS.md`، كان `WAIVED`، الآن `PARTIAL`) — **الكود منفَّذ ومختبَر
> بالكامل (200/200، وحدة + تكامل حي معاً)**، `scripts/password-auth-schema.sql` طُبِّق فعلياً على
> dev و`scripts/backfill-existing-owner-passwords.ts` شُغِّل بنجاح للحسابين التجريبيين القائمين.
> **لم يُغلَق فعلياً بعد لسبب واحد فقط:** **Guardian Review `DEEP` لم يبدأ بعد** (إلزامي،
> `AGENTS.md §17` — Authentication أعلى حساسية). راجع `DD-001` في `docs/DECISIONS.md` (يبقى `OPEN`
> حتى اكتمال المراجعة) وADR-026 للتفصيل الكامل.

## 2. Authorization / RBAC — Evidence: راجع `INV-AUTHZ-001` (`INVARIANTS.md`) للدليل الحالي

الأدوار الخمسة معرَّفة كـ `UserRole` في `khalil/types.ts`: `platform_admin`, `merchant_owner`, `merchant_manager`, `employee`, `customer`. `KhalilService.hasRole()`/`canAccessTenant()` مربوطان فعلياً اليوم بمسارات حقيقية (تسجيل دخول تاجر/إدارة، `assertActorCanAccessOrder`، دفاع الدور الصريح في `transitionOrderAction`) — **لا يزال بلا Middleware مركزي واحد يفرض الدور على كل مسار** (كل نطاق يتحقق بنفسه داخل `service.ts`). راجع `INV-AUTHZ-001` للنطاق الدقيق المُثبَت وغير المُثبَت.

## 3. Multi-Tenancy Isolation — Evidence: راجع `INV-TEN-001` (`INVARIANTS.md`) للتفاصيل والدليل الحالي

المبدأ (`CONSTITUTION §4` بند 3): `tenant_id` من الجلسة فقط، أبداً من طلب العميل — لا يُكرَّر
تفصيل التنفيذ/الاختبار/الفجوات هنا، **راجع `INV-TEN-001` في `INVARIANTS.md`** لحالته الفعلية
(`PARTIAL` اليوم — الآلية الأساسية مُثبَتة، دوال القوائم الجماعية غير مغطاة بدليل مباشر، راجع
`INV-TEN-001` للنطاق الدقيق). الجلسة نفسها (`sessions.token`) عشوائية لا JWT حقيقي بعد — لا Supabase
Auth مفعَّلة (§1 أعلاه).

## 4. JWT — Evidence: `PROPOSED`

Supabase يصدر JWT تلقائياً عبر Auth. **لم يُستخدَم فعلياً في أي منطق تحقق بعد.**

## 5. Row-Level Security (RLS) وأنماط الوصول لقاعدة البيانات — Evidence: `IMPLEMENTED` (نمطان مختلفان الآن)

راجع `DATABASE.md §6` للجدول الكامل. يوجد نمطان مطبَّقان فعلياً، لكل منهما استخدام مختلف تماماً — **لا تخلط بينهما:**

**النمط 1 — قراءة عامة، مفتاح `anon`:** `categories`, `products`, `inventory`. RLS يسمح بالقراءة للجميع (بيانات كتالوج عامة بطبيعتها). **سياسات الكتابة (Insert/Update/Delete) على `categories`/`products` لا تزال غير موجودة/موثَّقة — `OPEN_QUESTION`.** **`inventory` مُستثناة الآن (2026-09-05، `ADR-022`):** أول كتابة فعلية عليه (`InventoryRepository.decrementIfAvailable`/`restore`، خصم/استرجاع مخزون Checkout) تمر عبر `service_role` (`supabaseAdmin`) لا `anon` — يتجاوز RLS بالكامل، نفس نمط `merchants`/`carts`/`orders` لأي جدول بلا سياسة كتابة `anon` موثَّقة. لا حاجة لسياسة كتابة جديدة على النمط 1 نفسه.

**النمط 2 — قفل كامل، مفتاح `service_role` (اليوم 7، `ADR-008`؛ توسَّع لليوم 8، `ADR-009`):** `merchants`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `sessions`, **`audit_log`** (اليوم 12، `ADR-014`). RLS مفعَّل **بلا أي policy إطلاقاً** — هذا يمنع `anon`/`authenticated` تماماً، بما في ذلك القراءة. كل وصول (قراءة وكتابة) يمر حصرياً عبر `src/core/kernel/database/supabase-admin-client.ts` (مفتاح `service_role`، خادم فقط، محمي بحزمة `server-only` لمنع تسرّبه لأي Client Component). **متى يُستخدَم هذا النمط:** عندما يكتب بيانات مستخدم غير مُصادَق عليه حقيقياً (سلة الزائر عبر `session_token`) — RLS مسموح لـ`anon` في هذه الحالة لا يوفر حماية فعلية أصلاً، لأن مفتاح `anon` نفسه علني ولا يميّز بين طالب شرعي وآخر يخمّن معرّفات (كان سيخالف §2 أدناه). **قاعدة القرار لأي جدول جديد:** بيانات قراءتها عامة وآمنة للجميع ← النمط 1. بيانات خاصة بصاحبها ولا مصادقة حقيقية تحميها ← النمط 2، لا نمط وسط "RLS مفتوح لـanon باعتماد على صعوبة تخمين معرّف" (غير آمن، راجع `DECISIONS.md → ADR-008` للنقاش الكامل).

**⚠️ مراجعة RLS شاملة (اليوم 12، `ADR-014`) — النتيجة: بلا تغيير معماري، إصلاح واحد فقط.** الأنماط أعلاه صحيحة ومقصودة على كل الجداول القائمة (لا حاجة لإعادة بناء). ثلاث نقاط وُثِّقت صراحة بدل تصحيحها بلا داعٍ:
1. **سياسة `users` (`auth.uid() = id`) معطَّلة عملياً** — لا Supabase Auth حقيقية بعد، فـ`auth.uid()` لا يُطابِق شيئاً. غير خطيرة (فشل آمن — تمنع بدل أن تسمح خطأً)، تُفعَّل تلقائياً عند بناء Auth حقيقية لاحقاً.
2. **سياسات الكتابة المفقودة على `categories`/`products` (النمط 1) ليست خطراً فعلياً اليوم** — تحقُّق حي أكَّد عدم وجود أي كود كتابة عليها إطلاقاً حتى الآن (`catalog.repository.ts` قراءة فقط). القرار: تُحسَم عند بناء أول ميزة كتابة فعلية عليها، لا مسبقاً. **`inventory` مُستثناة من هذه النقطة منذ 2026-09-05 (`ADR-022`)** — أول ميزة كتابة فعلية عليه بُنيت (خصم/استرجاع مخزون Checkout)، والقرار حُسم وقتها: `service_role` لا سياسة `anon` جديدة، راجع §5 أعلاه.
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

**⚠️ راجع `INV-AUDIT-001` (`INVARIANTS.md`) — حالته `VIOLATED` جزئياً:** الادعاء الدستوري الحرفي
("كل تحوّل مخزون... يُسجَّل"، `CONSTITUTION §4` بند 5) أوسع من التنفيذ الفعلي هنا — خصم/استرجاع
المخزون الناجح لا يُكتب في `audit_log` مباشرة، فقط فشل الاسترجاع التعويضي. مُسجَّل كـ`DD-003` في
`docs/DECISIONS.md` (قرار مؤسس معلَّق: هل `order_items`/`order_status_history` كافيان كتتبع غير
مباشر، أم يُبنى `inventory_audit` صريح).

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
راجع `INV-RATE-001` (`INVARIANTS.md`، حالته `PARTIAL`) و`DD-002` (`docs/DECISIONS.md`، `BLOCKER`
موحَّد مع قفل `inFlightCheckouts` — راجع `docs/ARCHITECTURE.md §12` مبدأ 7) للدليل والقرار المعلَّق.

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

1. سياسات RLS للكتابة على `users`/`categories`/`products` (النمط 1، قراءة عامة) — لا تزال غير موجودة، لا كود كتابة عليها حتى الآن، لا خطر فعلي. **محسومة بالفعل لـ`merchants`/`carts`/`cart_items`/`orders`/`order_items`/`order_status_history`/`sessions`/`audit_log` (النمط 2، قفل كامل + service_role) منذ اليوم 7، ولـ`inventory` تحديداً منذ 2026-09-05 (`ADR-022`، service_role — راجع §5 أعلاه).** الباقي (`users`/`categories`/`products`) يُحسَم عند بناء أول ميزة كتابة فعلية عليهم، لا مسبقاً.
2. من يملك حق إنشاء `users` جديد (Auth مباشرة أم service مخصص؟) — لا يزال `OPEN_QUESTION` عاماً؛ **مُطبَّق فعلياً لسياق Checkout تحديداً منذ اليوم 8** (`KhalilService.findOrCreateCustomerByPhone()` عبر `service_role`، راجع `ADR-009`)، لا حلاً شاملاً لبقية المسارات (تسجيل تاجر، دخول حقيقي)
3. ~~Rate limiting — لا رقم ولا آلية محددة~~ **محسومة اليوم 12 (`ADR-014`) — راجع §12 أعلاه، نطاق محدود (الدخول فقط) بعدّاد في-الذاكرة.**
4. Soft Delete مقابل Hard Delete — غير محسوم (`DATABASE.md §7`)
5. BR-016 (الحد الأدنى لقيمة الطلب) — لا رقم معتمد (`docs/BUSINESS_RULES.md`)
6. متى تُبنى `sessions`/تسجيل الدخول الحقيقي — يبقى شرطاً لتفعيل §3 أعلاه فعلياً لا منطقياً فقط
7. ~~استبدال الدخول بلا كلمة مرور (تاجر وإدارة) بكلمة مرور/OTP/Supabase Auth كاملة~~ **مُغلَق
   جزئياً (2026-09-09، `URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH`):** كلمة مرور (لا OTP/Supabase
   Auth كاملة، بقرار مؤسس صريح) مُنفَّذة، SQL مُطبَّق على dev، ومختبَرة حياً بالكامل (200/200) —
   **لم تُغلَق فعلياً بعد** حتى Guardian Review `DEEP` (الشرط الوحيد المتبقي). راجع §1 أعلاه وDD-001.
8. **جديد (اليوم 12):** تأسيس نظام Migrations رسمي (`docs/DATABASE.md §8`) — لا يزال كل SQL يُنفَّذ يدوياً، بما فيها `audit_log` الجديد. مرشَّح طبيعي لليوم 13 (التجهيز للإنتاج).
9. **جديد (الأيام 14-16، `ADR-016`):** لا تحديد معدل ولا انتهاء صلاحية على قراءة `/order/[id]` (راجع §16 أعلاه) — أي حامل لرابط تتبّع طلب يستطيع الاستعلام عنه بلا حد. مقبول مؤقتاً لحجم البيانات التجريبي الحالي، يجب إعادة تقييمه قبل إنتاج حقيقي بحجم بيانات أكبر.
