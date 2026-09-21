---
title: تحقق ما بعد التنفيذ — REVOKE/GRANT على inventory.cost_price (SEC-P1-1)
status: COMPLETE
date: 2026-09-21
mode: READ-ONLY VERIFICATION
scope: هل يعتمد الكود الفعلي على SELECT * غير مقيَّد على جدول inventory عبر anon/authenticated؟ هل غيّر
       تطبيق REVOKE SELECT + GRANT SELECT (product_id, quantity_available, updated_at) أي سلوك حالي؟
related: SEC-P1-1 (SALSABIL_BACKEND_ARCHITECTURE_FORENSIC_AUDIT §E)، DD-022 (docs/DECISIONS.md)،
         commit c88ecd4 (fix(security): close SEC-P1-1 public exposure of inventory.cost_price)
---

# تحقق ما بعد التنفيذ — REVOKE/GRANT على inventory.cost_price (SEC-P1-1)

**الحالة المُبلَّغة قبل هذا التحقق (dev + staging):**
`anon_can_read_cost_price = false`, `authenticated_can_read_cost_price = false`,
`anon_can_read_quantity = true`, `anon_table_level_select = false`.

**ملاحظة سياق مهمة لقراءة هذا التقرير بدقة:** الكود الحالي في هذا الفرع (`inventory.repository.ts`)
لم يكن ينتظر هذا التحقق ليصبح متوافقاً — تعديل الكود المرافق (`findByProductId` لم يعد يطلب
`cost_price`، `findByProductIds` انتقلت من عميل `anon` إلى `service_role`) طُبِّق مسبقاً وعن قصد في
نفس الالتزام (commit) الذي أضاف سكربت الـREVOKE، **قبل** تطبيق الـSQL فعلياً على أي بيئة، تحديداً
لضمان ألا يكسر تطبيق الصلاحيات أي مسار قائم. هذا التقرير يتحقق من تلك الفرضية بعد أن أصبح تطبيق
الصلاحيات فعلياً واقعاً حياً على dev وstaging.

---

## منهجية البحث (Phase 2 — Cross-Checked)

نمط بحث 1 — سلسلة حرفية لاسم الجدول (case-insensitive) عبر `src/`: 20 ملفاً مطابقاً.
نمط بحث 2 — نمط استدعاء `.from('inventory')`/`.from("inventory")` تحديداً: 26 موضعاً عبر 8 ملفات
(1 ملف تطبيقي: `inventory.repository.ts`؛ الباقي كلها `*.integration.test.ts`/`e2e`).
نمط بحث 3 — `cost_price`/`costPrice` عبر كل المستودع (لا `src/` فقط): 10 ملفات، تشمل جدولاً آخر
منفصلاً كلياً (`catalog_review_queue.cost_price`، راجع القسم C أدناه).
نمط بحث 4 — كل استدعاء `select('*')`/`select("*")` عبر `src/` بالكامل (لا `inventory` فقط) لضمان عدم
تفويت أي بانيء استعلام ديناميكي أو نمط غير متوقَّع: 130+ نتيجة، فُلترَت يدوياً للمواضع الملموسة على
`inventory` تحديداً (4 مواضع، كلها `supabaseAdmin`، مُفصَّلة أدناه).
نمط بحث 5 — كل تهيئة عميل Supabase في المشروع (`createClient`/`createServerClient`/
`createBrowserClient`/`supabase.auth.*`): نتيجتان فقط — `supabase-client.ts` (مفتاح anon) و
`supabase-admin-client.ts` (مفتاح service_role). **لا يوجد Supabase Auth حقيقي في هذا المشروع** —
لا مسار واحد يُصدِر جلسة تحت دور `authenticated` الفعلي؛ هذا الدور نظري في تطبيق هذا الفحص تحديداً
(الجلسات المخصَّصة في هذا المشروع كلها تُقرَأ عبر `service_role`، لا عبر Supabase Auth JWT).

---

## A. Inventory Access Summary

| Location | Context | Execution Role | Columns | SELECT * | Client Accessible | Risk |
|---|---|---|---|---|---|---|
| `inventory.repository.ts:34-42` `findByProductId` | Backend Repository | **anon** | `product_id, quantity_available, updated_at` (صريح) | **لا** | لا (استهلاك داخلي فقط عبر `isAvailable`/`decrementIfAvailable`/`restore`) | **NONE** |
| `inventory.repository.ts:51-56` `findByProductIds` | Backend Repository | **service_role** | `*` (يشمل `cost_price`) | نعم | نعم — عبر `merchant/offers/page.tsx` (تاجر مُصادَق عليه، منتجاته هو فقط) | **NONE** — service_role يتجاوز REVOKE بالكامل، والتفويض مُتحقَّق منه في الصفحة قبل الاستدعاء |
| `inventory.repository.ts:67-85` `decrementIfAvailable` | Backend Repository | كتابة: **service_role**؛ قراءة داخلية: **anon** (عبر `findByProductId`) | كتابة: `*` (تأكيد الصف المُحدَّث)؛ قراءة: الأعمدة الثلاثة أعلاه | نعم (service_role فقط) | لا | **NONE** |
| `inventory.repository.ts:101-119` `restore` | Backend Repository | كتابة: **service_role**؛ قراءة داخلية: **anon** (عبر `findByProductId`) | نفس أعلاه | نعم (service_role فقط) | لا | **NONE** |
| `inventory.repository.ts:125-136` `upsertForImport` | Backend Repository | **service_role** | `*` (يكتب `cost_price`) | نعم | لا (مسار استيراد Excel تاجر، كتابة لا قراءة) | **NONE** |
| `cart.service.ts:142,165` (استهلاك `isAvailable`) | Backend Service | anon (عبر السلسلة أعلاه) | — | لا | لا | **NONE** |
| `orders.service.ts:129,241,448` (استهلاك `reserve`/`release`) | Backend Service | service_role (كتابة) + anon (قراءة داخلية) | — | لا (على anon) | لا | **NONE** |
| `catalog.service.ts:309,400` (استهلاك `setStockForImport`) | Backend Service | service_role | — | لا | لا | **NONE** |
| اختبارات تكامل (`orders`/`cart`/`admin`/`customer`/`e2e`) | Test | **service_role** حصراً | متنوّع، بعضها `*` | نعم (على service_role فقط) | لا | **NONE** — بيانات اختبار، عميل غير متأثر بالصلاحية |

---

## B. SELECT * Findings

**Found — لكن كلها على `service_role`، صفر على `anon`/`authenticated`.**

المواضع الأربعة الوحيدة لـ`select('*')` (أو مكافئها) على جدول `inventory` في كامل المستودع:
`inventory.repository.ts:53, 77, 111, 132` — الأربعة تُنفَّذ عبر `supabaseAdmin` (`service_role`)
حصراً، مُتحقَّق منه بقراءة السطر مباشرة لكل موضع (لا استنتاجاً).

**لا يوجد أي موضع واحد في كود التطبيق (لا الاختبارات) يُنفِّذ `select('*')` على `inventory` عبر عميل
`anon`.** الاستدعاء الوحيد عبر `anon` (`findByProductId`) يطلب ثلاثة أعمدة محدَّدة صراحة، ولا يطلب
`cost_price` ولا يعتمد على صلاحية جدول كاملة غير مقيَّدة.

**لا يوجد أي مسار في التطبيق يُنفَّذ تحت دور `authenticated` إطلاقاً** (لا Supabase Auth حقيقية في
هذا المشروع، مُتحقَّق منه بحثاً عن كل تهيئة عميل — نتيجتان فقط: anon وservice_role). هذا يعني عملياً
أن جزء `authenticated` من REVOKE/GRANT لا يُستهلَك من أي كود اليوم — لا خطر، لكنه أيضاً لا يحمي شيئاً
فعلياً بعد (دفاع استباقي لمستقبل قد يُفعِّل Supabase Auth، لا حاجة حالية).

---

## C. cost_price Exposure

| الوجهة | تصل إليها `inventory.cost_price`؟ | الدليل |
|---|---|---|
| Anonymous frontend (زائر بلا جلسة، أي صفحة `(reef)`) | **لا** | المسار الوحيد المتاح لـanon (`findByProductId`) لا يطلب العمود إطلاقاً — لا في الاستعلام، لا في الكائن المُعاد |
| Authenticated frontend (Supabase Auth JWT) | **N/A** | لا يوجد مسار Supabase Auth حقيقي في هذا المشروع أصلاً (راجع منهجية البحث أعلاه) |
| Merchant frontend | **نعم — بتصميم مقصود، مُصادَق عليه** | `merchant/offers/page.tsx:15` يتحقق من `getMerchantSession()` أولاً (يُعيد التوجيه لتسجيل الدخول إن غاب)، ثم `catalogService.listMerchantOffers(session.tenantId)` يُقيِّد `productIds` لمنتجات هذا التاجر تحديداً *قبل* استدعاء `getStockForProducts` — التاجر يرى تكلفة منتجاته هو فقط، لا أي تاجر آخر. القيمة تصل فعلياً لمكوّن `'use client'` (`MerchantOfferRow.tsx:1,13`)، أي تُسلسَل ضمن استجابة الصفحة — متوقَّع ومقصود لواجهة تحرير تفاعلية، لا تسرّباً |
| Admin frontend | **نعم — لكن عبر جدول مختلف تماماً، لا `inventory`** | `admin/catalog/review/page.tsx:47` يعرض `costPrice` من `catalogService.listReviewQueue()` → عمود `cost_price` **في جدول `catalog_review_queue`**، لا `inventory` (`catalog.repository.ts:167,182`) — كيان بيانات منفصل بنفس اسم العمود بالصدفة. خارج نطاق REVOKE/GRANT هذا (يخص `inventory` فقط). صفحة مُصادَق عليها (`getAdminSession()`) بأي حال |

**لا مسار Server Action وحده (بلا صفحة تُغلِّفه) يُعيد `cost_price` مباشرة لمستهلك غير موصوف أعلاه** —
تحقَّقتُ من كل استيراد لـ`inventoryService`/`inventoryRepository` عبر المستودع (قسم Phase 2)، كلها
محسوبة في الجدول أعلاه.

---

## D. Regression Assessment

| المحور | التصنيف | الدليل |
|---|---|---|
| هل يعتمد أي كود على `SELECT *` غير مقيَّد على `inventory` عبر anon/authenticated؟ | **PASS (لا يوجد)** | القسم B أعلاه — صفر مواضع |
| هل غيَّر REVOKE/GRANT أي سلوك ملاحَظ في الكود الحالي؟ | **PASS (لا تغيير)** | الكود عُدِّل مسبقاً (نفس commit الذي أضاف السكربت) ليطابق هذه الصلاحيات بالضبط قبل تطبيقها حياً |
| هل `cost_price` مُسرَّب لأي طرف غير مخوَّل بعد التطبيق؟ | **PASS** | القسم C — الوجهتان الوحيدتان (تاجر لمنتجاته، إدارة عبر جدول آخر) كلتاهما مُصادَق عليهما ومُقيَّدتان بتصميم مقصود، لا اعتماداً على صلاحية anon المسحوبة الآن |
| عرض المخزون في واجهة المتجر (storefront) | **NOT FOUND** | لا صفحة/مكوّن واحد في `src/app/(reef)/**` يستدعي `inventoryService`/`inventoryRepository` لعرض كمية أو أي عمود آخر — التحقق من التوفر يحدث فقط عند إضافة للسلة (`cart.service.ts`)، لا كعرض مستقل |
| إدارة مخزون التاجر ("عروضي") | **CONFIRMED — غير متأثرة** | `findByProductIds` على `service_role`، لا يعتمد على صلاحية `anon` المسحوبة |
| مؤشرات توفر المنتج/المخزون (إضافة للسلة) | **CONFIRMED — غير متأثرة** | `cart.service.ts:142,165` → `isAvailable()` → `findByProductId` (أعمدة صريحة، لا `cost_price`، لا `*`) |
| توفر منتجات الكتالوج (صفحات المنتج/الحي) | **NOT FOUND** | لا استدعاء لـ`inventoryService` من `catalog.service.ts` أو أي صفحة كتالوج — التوفر المعروض هناك (إن وُجد) مصدره `products.is_active`، لا `inventory` مباشرة (خارج نطاق هذا التحقق تحديداً، لكن مُسجَّل لعدم الخلط) |
| السلة (cart) | **CONFIRMED — غير متأثرة** | نفس مسار `isAvailable()` أعلاه |
| الدفع/إتمام الطلب (checkout) | **CONFIRMED — غير متأثرة** | `orders.service.ts:129` (`reserve`) و`:241,448` (`release`) → `decrementIfAvailable`/`restore` — الكتابة على `service_role`، القراءة الداخلية لا تطلب `cost_price` |
| لوحات مخزون في الإدارة (admin) | **NOT FOUND** | لا صفحة إدارة واحدة تستدعي `inventoryService`/`inventoryRepository` في كامل `src/app/admin/**` — لا لوحة مخزون إدارية موجودة أصلاً اليوم |

---

## E. Required Follow-Up

**لا يوجد إجراء عاجل مطلوب لمنع كسر — الكود متوافق فعلاً مع الحالة الحية المُبلَّغة (dev + staging).**

نقاط للعلم فقط (غير حاجبة، غير مطلوب إصلاحها الآن — مُسجَّلة للشفافية لا أكثر):

1. `catalog_review_queue.cost_price` (جدول منفصل تماماً عن `inventory`، القسم C) لم يُفحَص RLS/
   الصلاحيات الخاصة به في هذه المهمة — خارج النطاق المُعلَن صراحة (REVOKE/GRANT على `inventory`
   فقط). لا دليل حتى الآن على أنه معرَّض بنفس الطريقة أو مختلف — `UNKNOWN`، يحتاج فحصاً منفصلاً إن
   أُريد التأكد.
2. جزء `authenticated` من REVOKE/GRANT لا يحميه أي كود فعلي اليوم (لا Supabase Auth حقيقية) — ليس
   خطراً، لكنه أيضاً غير مُختبَر بمعنى وظيفي حياً. لا حاجة لإجراء الآن، فقط ملاحظة دقة.
3. `DD-022` (`docs/DECISIONS.md`) يوثّق بالفعل الإصلاح التكتيكي والفصل الأوسع المؤجَّل — لا حاجة
   لإدخال Decision Debt جديد من هذا التحقق.

---

## Files Inspected

`src/core/modules/inventory/inventory.repository.ts` (كامل)، `inventory.service.ts` (كامل)،
`inventory.service.test.ts`، `src/core/modules/cart/cart.service.ts` (مواضع الاستهلاك)،
`src/core/modules/orders/orders.service.ts` (مواضع الاستهلاك)، `src/core/modules/catalog/
catalog.service.ts` و`catalog.repository.ts` (مواضع `cost_price` على جدول مختلف)،
`src/app/merchant/offers/page.tsx`، `src/app/merchant/offers/actions.ts`،
`src/components/merchant/MerchantOfferRow.tsx`، `src/app/admin/catalog/review/page.tsx`،
`src/core/kernel/database/supabase-client.ts` و`supabase-admin-client.ts`، وكل ملفات
`*.integration.test.ts`/`e2e` المرجَّعة في نتائج البحث. `docs/DECISIONS.md` (DD-022) قُرئ للسياق فقط،
لم يُعدَّل.

---

## FINAL RULE — التزام صارم

```
Files created: 1 (هذا الملف فقط)
Existing files modified: 0
Database changes: 0
Dependency changes: 0
Code changes: 0
```
