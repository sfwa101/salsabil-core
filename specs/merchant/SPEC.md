---
title: Spec — Merchant (نطاق التاجر وتعدد المستأجرين)
status: PARTIALLY_IMPLEMENTED
version: 2.1 (اليوم 11 — findAll/setActiveStatus للوحة الإدارة)
last_updated: 2026-09-02
owner: Claude (تنفيذ) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة بين النية والتنفيذ — الكود الفعلي هو الحقيقة النهائية لما يعمل الآن
---

# Spec — Merchant (التاجر)

> **ملاحظة منهجية:** الأقسام الموسومة "اليوم 4" رجعية (الكود سبق التوثيق). القسمان الجديدان — تسجيل الدخول وبوابة الطلبات — من اليوم 10، مخطَّطان قبل التنفيذ (`ADR-012`).

---

## Purpose

عزل بيانات كل تاجر عن الآخر (Multi-Tenant Isolation)، ربط المنتجات بتاجر مالك محدد، **وتمكين التاجر فعلياً من الوصول لطلباته وتغيير حالتها (اليوم 10)**.

## Problem

كتالوج اليوم 3 كان بلا مالك — كل منتج "عائم" بلا تاجر. اليوم 9 بنى دورة حياة طلب كاملة، لكن بلا أي طريقة للتاجر نفسه للوصول إليها — لا تسجيل دخول، لا جلسة حقيقية، `canAccessTenant` موجودة منذ اليوم 4 بلا مستهلك واحد.

## Scope

**اليوم 4:**
- جدول `merchants` (تسجيل تاجر: اسم العمل، هاتف، slug، نسبة عمولة قابلة للتهيئة)
- عمود `products.tenant_id` يربط المنتج بتاجره
- عزل القراءة عبر `CatalogRepository.findProductsByTenant()`

**اليوم 10:**
- تسجيل دخول تاجر بالهاتف بلا كلمة مرور (`MerchantService.loginOwnerByPhone`) — يُفعِّل `Session`/`canAccessTenant` لأول مرة
- جدول `sessions` (كان `CONCEPTUAL`) — جلسة حقيقية server-side، `token` عشوائي فقط في cookie `httpOnly`
- بوابة تاجر فعلية (`src/app/merchant/`): `/login`، `/orders` (قائمة معزولة بالتاجر + أزرار تغيير حالة)
- عزل مستأجرين في `OrdersService.transitionStatus()` — `tenantId` إلزامي فعلياً لأدوار التاجر
- قفل `merchants` بالكامل (كانت قراءة عامة تكشف `phone`/`owner_id`)

## Non-Goals (صراحة، هذه المرحلة)

- ❌ `stores` كطبقة فرعية تحت التاجر — `CONCEPTUAL`
- ❌ Supabase Auth حقيقية أو كلمة مرور/OTP — تسجيل الدخول بالهاتف وحده، بلا تحقق ثانٍ (`ADR-012`، خطر معروف)
- ❌ العقد الإلكتروني الكامل (BR-007) بمنع برمجي للرسوم الخفية — لم يُبنَ، فقط إسقاط بسيط (`MerchantAgreement`)
- ❌ أدوار `merchant_manager`/`employee` — مالك واحد فقط لكل تاجر (`merchants.owner_id` ↔ `users.id`)، لا نطاق موظفين
- ❌ تسجيل تاجر جديد عبر واجهة (لا يزال يدوياً عبر `service_role`)
- ❌ صفحة تفاصيل طلب منفصلة — كل شيء في قائمة واحدة (اليوم 10 Vertical Slice)

## Requirements — الفعلي مقابل المخطَّط

| المتطلب | الحالة |
|---|---|
| جدول merchants | `IMPLEMENTED` — RLS مقفول بالكامل منذ اليوم 10 (كانت قراءة عامة، `ADR-012`) |
| products.tenant_id | `IMPLEMENTED` |
| MerchantRepository (findById/findBySlug/findByOwnerId/create) | `IMPLEMENTED` — `service_role` منذ اليوم 10 (كان `anon`، `create()` كان معطَّلاً صامتاً) |
| MerchantService (validateRegistration, loginOwnerByPhone, isOwner, toAgreement, listAll، setActiveStatus) | `IMPLEMENTED` — `canAccessTenant` المكرَّرة حُذفت لصالح `khalilService.canAccessTenant` (`ADR-012`). `listAll`/`setActiveStatus` جديدان اليوم 11 — للوحة الإدارة حصراً، راجع `specs/admin/SPEC.md` |
| CatalogRepository.findProductsByTenant | `IMPLEMENTED` + **مُختبَر فعلياً** (عزل تاجر وهمي = صفر منتجات) |
| جدول sessions + KhalilService (createSession/validateSessionToken/destroySession) | `IMPLEMENTED` (اليوم 10) |
| بوابة تاجر (`/merchant/login`, `/merchant/orders`) | `IMPLEMENTED` (اليوم 10) — مُتحقَّق منها في متصفح حقيقي |
| MerchantAgreement (عقد BR-007 الكامل) | `PARTIALLY_IMPLEMENTED` — نوع فقط، لا منطق منع رسوم مخفية فعلي |

## Business Rules

- BR-007 (الشفافية المطلقة / Zero Hidden Fees) — `commissionRate` رقم واحد شفاف لكل تاجر، لا رسوم مركّبة، لكن **لا إنفاذ برمجي كامل بعد** لمنع إضافة رسوم لاحقة خارج هذا الرقم. راجع `docs/BUSINESS_RULES.md`.
- BR-008 (حرية الأجهزة) — لا صلة مباشرة بكود اليوم 4، محقَّقة تلقائياً عبر اختيار Next.js.
- BR-009/BR-010/BR-011 — تعتمد على Orders/تيسير/AgentAssignment، خارج نطاق هذا الـSpec.

## UX Requirements

`IMPLEMENTED` (أولي، اليوم 10) — نموذج هاتف واحد → قائمة طلبات (رقم مختصر، حالة، إجمالي، تاريخ) → أزرار انتقال حالة نصية (فعل لا اسم حالة: "تأكيد الطلب" لا "مؤكَّد") لكل طلب حسب `ORDER_TRANSITIONS ∩ ORDER_TRANSITION_ACTORS`. لا Spacing/Typography موحَّدة رسمياً (نفس فجوة `docs/UI_UX_SYSTEM.md §6` العامة) — استُخدمت نفس قيم Tailwind شبه الافتراضية المستخدمة في `CheckoutForm`/`ProductCard`.

## Technical Requirements

```
src/core/modules/merchant/
  ├── types.ts (Merchant, MerchantAgreement, MerchantRegistrationInput)
  ├── merchant.service.ts (validateRegistration, loginOwnerByPhone [اليوم 10], isOwner, toAgreement)
  ├── merchant.repository.ts (findById, findBySlug, findByOwnerId, create — service_role اليوم 10)
  └── merchant-session.ts (اليوم 10 — كوكي httpOnly، نفس نمط cart-session.ts، بلا إنشاء تلقائي)

src/core/kernel/khalil/
  ├── khalil.repository.ts (+ createSession/findSessionByToken/deleteSession، اليوم 10)
  └── service.ts (+ findUserByPhone/createSession/validateSessionToken/destroySession، اليوم 10)

src/core/modules/orders/
  └── orders.service.ts (+ getOrdersForTenant، +tenantId في transitionStatus، اليوم 10)

src/core/modules/catalog/
  ├── types.ts (Product.tenantId: string | null — أُضيف اليوم 4)
  └── catalog.repository.ts (findProductsByTenant — أُضيف اليوم 4)

src/app/merchant/
  ├── layout.tsx (data-world="reef")
  ├── page.tsx (redirect → /orders)
  ├── login/ (page.tsx, actions.ts)
  └── orders/ (page.tsx, actions.ts)

src/components/
  ├── MerchantLoginForm.tsx
  └── MerchantOrderRow.tsx
```

## Security Requirements

القاعدة الذهبية (`CONSTITUTION §5`): `tenant_id` يُقارَن دائماً بـ `Session.tenantId` القادم من الجلسة، لا بما يرسله العميل. **مُفعَّلة فعلياً الآن (اليوم 10)** — `Session` مربوط بجدول `sessions` حقيقي، `khalilService.canAccessTenant()` (وحّدت النسختين المكرَّرتين) وعزل `orders.service.ts.transitionStatus()` كلاهما يعملان ضد بيانات حقيقية، لا منطقياً فقط.

**⚠️ خطر أمني معروف ومقبول مؤقتاً:** تسجيل الدخول بالهاتف وحده بلا كلمة مرور أو تحقق ثانٍ (OTP) — أي طرف يعرف رقم هاتف تاجر نشط يستطيع انتحاله بالكامل والوصول لكل طلباته وتغيير حالتها. مقبول الآن لتاجر تجريبي واحد فقط (`ADR-012`)، **يجب** إغلاقه (كلمة مرور، OTP، أو Supabase Auth كاملة) قبل تسجيل تاجر ثانٍ حقيقي.

## Acceptance Criteria (للحالة الحالية "PARTIALLY_IMPLEMENTED")

- [x] جدول merchants موجود، RLS مقفول بالكامل (لا قراءة عامة، لا كتابة anon)
- [x] منتج حقيقي مربوط بتاجر حقيقي عبر tenant_id
- [x] اختبار عزل فعلي: تاجر وهمي لا يرى منتجات تاجر آخر (0 نتائج)
- [x] تسجيل دخول حقيقي بهاتف تاجر تجريبي موجود مسبقاً — يعمل حياً (وحدة + تكامل + متصفح حقيقي)
- [x] جلسة حقيقية: إنشاء، قراءة، إبطال (`destroySession`) — كلها ضد Supabase حقيقي
- [x] `khalilService.canAccessTenant` يرفض جلسة بـ tenantId مختلف
- [x] عزل مستأجرين حي في `transitionStatus`: تاجر لا يستطيع تغيير حالة طلب تاجر آخر (وحدة + تكامل)
- [x] بوابة تاجر فعلية: دخول → عرض طلب → تأكيد → تحديث حي للحالة (مُتحقَّق منه في متصفح حقيقي)
- [x] `npx tsc --noEmit` و`npm run arch:check` بلا أخطاء
- [ ] تسجيل تاجر جديد فعلياً عبر واجهة — **غير مكتمل** (يدوي عبر service_role)
- [ ] كلمة مرور/تحقق ثانٍ لتسجيل الدخول — **غير مكتمل، خطر معروف أعلاه**

## Dependencies

- `specs/identity/SPEC.md` (Supabase Auth الحقيقية الكاملة — لا تزال الفجوة الأشمل، الجلسة المصغّرة اليوم 10 لا تحلّها)
- `specs/orders/README.md` (`transitionStatus` وعزل المستأجرين)
- `docs/BUSINESS_RULES.md` BR-007 (يتطلب نطاق MerchantAgreement كامل لاحقاً)

## قرارات اتُّخذت أثناء التنفيذ ولم تكن موثَّقة صراحة قبله

- `commissionRate` نسبة مئوية عائمة لكل تاجر (0–100)، لا شرائح ثابتة مبرمجة حسب الفئة — قرار عملي لتجنّب تشفير أرقام الدستور المؤقتة (§8) في الكود قبل اعتمادها نهائياً. `Evidence: INFERRED`.
- تعريف SQL لجدول `merchants` في `docs/DATABASE.md` أُعيد بناؤه استنتاجياً من فحص الأعمدة الفعلية عبر الاستعلامات — لا نص SQL أصلي محفوظ في المستودع.
- تسجيل الدخول بالهاتف الشخصي لمالك التاجر (`users.phone`)، لا هاتف العمل التجاري (`merchants.phone`) — قرار تنفيذي منطقي (شخص يسجّل الدخول، لا كيان تجاري) لم يُطرَح صراحة في الطلب الأصلي، موثَّق في `ADR-012`.

## أجزاء تحتاج إعادة نظر

- `MerchantAgreement` (BR-007) إسقاط بسيط فقط — لا يمنع فعلياً إضافة رسوم مستقبلية، فقط يعرض الرقم الحالي.
- لا تنظيف دوري لجلسات `sessions` منتهية الصلاحية — تبقى في الجدول إلى الأبد ما لم يُسجَّل خروج فعلي.
- مدة الجلسة (7 أيام) قيمة عملية غير معتمدة رسمياً — نفس نمط `BR-016`.

## Open Questions

1. من يملك حق `ready → out_for_delivery` و`out_for_delivery → delivered` فعلياً؟ لا يزال مؤقتاً للتاجر/الإدارة (`specs/orders/README.md` Open Question 1، لم يتغيّر اليوم 10).
2. متى يُبنى نطاق `MerchantAgreement` الكامل لإنفاذ BR-007 برمجياً؟
3. متى تُستبدَل جلسة الهاتف المصغّرة بمصادقة حقيقية (كلمة مرور/OTP/Supabase Auth)؟ يحدد هذا مباشرة متى يصبح تسجيل تاجر ثانٍ حقيقي آمناً. **تخفيف مؤقت أُضيف اليوم 12 (`ADR-014`):** تحديد معدل (5 محاولات/15 دقيقة لكل رقم هاتف) + تسجيل كل محاولة دخول (نجاح/فشل) في `audit_log` العام — لا يُغلِق هذا السؤال، فقط يقلّل الضرر ريثما يُحسَم.
4. **جديد:** هل تحتاج `merchant_manager`/`employee` نطاقاً فعلياً قريباً، أم يبقى مالك واحد لكل تاجر لفترة أطول؟

## أجزاء تحتاج إعادة نظر (تحديث اليوم 12)

- ~~`cartService.removeItem` كان يحذف `itemId` بلا التحقق من انتمائه لـ`cartId`~~ **أُصلِحت (`ADR-014`)** — IDOR حقيقي، لا فخ نظري: `carts`/`cart_items` غير مربوطين بجلسة حقيقية (سلة زائر)، فحماية UUID وحدها لم تكن كافية. مُختبَرة حياً (`cart.integration.test.ts` → "Cart IDOR").

## Status

`PARTIALLY_IMPLEMENTED` — عزل بيانات فعلي ومُختبَر (قراءة وكتابة)، تسجيل دخول حقيقي (بتحديد معدل وتسجيل تدقيق اليوم 12) وبوابة طلبات تعملان حياً، لا تسجيل تاجر جديد عبر واجهة، لا مصادقة قوية (كلمة مرور/OTP) بعد.
