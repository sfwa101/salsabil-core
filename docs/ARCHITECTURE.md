---
title: المعمارية التقنية
status: ACTIVE
version: 1.12
last_updated: 2026-09-20
owner: المؤسس (أبوحتاب) + Claude (معماري)
source_of_truth: هذا الملف (تفصيل)، SALSABIL_CONSTITUTION.md §4-§5 (المبدأ)
---

> **تحديث 2026-09-07 (تركيب shadcn/ui، `ADR-025`):** `shadcn/ui` أصبحت مثبَّتة فعلياً (كانت
> `CONFLICT-005` توثّق غيابها) — §2 (هيكل المجلدات) و§2.1 (الطبقة 1) مُحدَّثان ليعكسا ذلك. راجع
> `ADR-025` للتفصيل الكامل (لماذا، ماذا تغيّر في `globals.css`، وقيد فعلي مكتشَف ومُصلَح أثناء
> التنفيذ).
>
> **تحديث 2026-09-07 (`RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS`):** إضافة §13 "Neighborhood
> Identity System" — سجل مركزي ثانٍ (`src/config/neighborhood-identity-registry.ts`) فوق
> `theme-registry.ts`، لهوية بصرية اختيارية لكل حي (category) بمعزل عن ثيم العالم العام. راجع
> `ADR-024` للقرار الكامل. لا تعديل على أي قسم آخر خارج هذا.
>
> **تحديث 2026-09-06 (`CONSTITUTION-V2-BATCH2-ARCHITECTURE-SECURITY-DATABASE`):** إضافة §10
> "Architecture Boundaries" (حدود كل نطاق فعلي اليوم)، §11 "Event Model" (مبدأ فقط)، §12
> "Automation Principles"، وتصحيح إحالات كانت تُضمِّن أرقاماً (عدد جداول/اختبارات) عرضة للانحراف —
> استُبدلت بإحالة لمصدر الحقيقة الحي (`docs/DATABASE.md`, `INVARIANTS.md`, `docs/CHANGELOG.md`). لا
> تعديل على أي قسم آخر خارج هذا.
>
> **تحديث 2026-09-20 (توثيق فقط، بتكليف مؤسس مباشر):** إضافة بند في §9 يشير إلى
> `docs/ERP_SAAS_VISION.md` — رؤية سلسبيل بعيدة المدى كمنصة SaaS/ERP شاملة تتجاوز ريف، وريف كأول
> تطبيق فعلي لمحركاتها لا نظام منفصل. لا تعديل على أي حدود معمارية أو قرار قائم — إشارة مرجعية فقط
> لضبط سياق أي قرار تصميم مستقبلي في لوحات الإدارة/التاجر. راجع `DD-021` في `docs/DECISIONS.md`.

# المعمارية التقنية

> المبادئ العليا غير القابلة للكسر موجودة في `SALSABIL_CONSTITUTION.md §4`. هذا الملف يشرح **كيف** تُطبَّق تقنياً.

---

## 1. النمط المعماري العام — Evidence: `CONSTITUTION`

**Modular Monolith + Event-Driven** — تطبيق واحد، بحدود نطاقات (Domains) صارمة داخلياً، مع سجل أحداث مركزي. **ليس Microservices** في المرحلة الحالية.

```
                         سلسبيل (Salsabil)
                              │
                ┌─────────────┴─────────────┐
                │                           │
              Core                      Domains
        (لا تتغير أبدًا تقريبًا)      (تُضاف وتتوسع باستمرار)
                │                           │
      ┌─────────┼─────────┐         ┌───────┼───────┬─────────┐
      │         │         │         │       │       │         │
  Identity   Tenant     Audit    Catalog  Orders  Inventory  Payments
      │         │         │         │       │       │         │
      └─────────┴─────────┴─────────┴───────┴───────┴─────────┘
                              │
                            APIs
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          Customer App    Merchant Portal   Admin Portal
```

**لماذا ليس Microservices الآن (Evidence: `CONSTITUTION`, السبب موسّع هنا):** فريق واحد (المؤسس + Claude)، لا حاجة تشغيلية لعزل شبكي بين الخدمات في هذه المرحلة، وتعقيد التوزيع (network calls, service discovery, distributed transactions) يبطئ الوصول لأول عميل حقيقي بلا فائدة فعلية الآن. حدود النطاقات الصارمة داخل Monolith تسمح لاحقاً بفصل أي نطاق لخدمة مستقلة **دون إعادة تصميم منطق العمل** — هذا هو الشرط الذي يجعل التأجيل آمناً.

---

## 2. هيكل المجلدات المعتمد — Evidence: `IMPLEMENTED` (موجود فعلياً في الكود)

```
src/
├── app/                 → صفحات ونقاط دخول Next.js
│   ├── layout.tsx        → Root Layout، يحمل data-world="diwan" على <html> (الافتراضي)
│   ├── globals.css        → طبقتا التوكنز الدلالية لكل عالم — راجع §2.1 أدناه
│   ├── (reef)/            → Route Group لعالم ريف — layout.tsx يضع data-world="reef"
│   │                         على عنصر جذر (لا على <html>)، لا يغيّر مسارات URL — تطبيق العميل
│   ├── merchant/          → IMPLEMENTED (اليوم 10) — بوابة التاجر (البوابة الثانية من ثلاث،
│   │                         CONSTITUTION §8). data-world="reef" أيضاً. login/ (دخول بالهاتف)
│   │                         وorders/ (قائمة طلبات التاجر + أزرار انتقال حالة)
│   └── admin/             → IMPLEMENTED (اليوم 11) — لوحة الإدارة (البوابة الثالثة). data-world=
│                             "diwan" (تشرف على المنظومة كلها، لا عالماً واحداً). login/ وdashboard/
│                             (صفحة واحدة: تجار + كل الطلبات + سجل تدقيق — لا مسارات متعددة عند
│                             هذا الحجم). كلتا البوابتين بادئة URL حقيقية، لا Route Group مقنَّع
├── components/          → مكونات واجهة قابلة لإعادة الاستخدام، محايدة لونياً بالكامل
│   │                       (تستهلك فقط bg-primary/text-foreground/border-border...)
│   │                       OrderRow.tsx (كان MerchantOrderRow.tsx) مُعمَّم اليوم 11 — يُستخدَم من
│   │                       بوابتي التاجر والإدارة معاً عبر onTransition كـ prop قابل للحقن
│   └── ui/               → shadcn/ui **مثبَّتة فعلياً الآن** (`npx shadcn@latest init`،
│                             2026-09-07، `ADR-025`) — `button.tsx` أول مكوّن مولَّد، بلا استهلاك في
│                             أي صفحة بعد. `components.json` (`style: "radix-nova"`, `base: radix`,
│                             `rtl: true`) في جذر المستودع. راجع `docs/DECISIONS.md → CONFLICT-005`
│                             (حالتها الآن `SUPERSEDED` لا `RESOLVED`) و`ADR-025` للتفصيل الكامل
├── config/
│   └── theme-registry.ts → IMPLEMENTED (اليوم 6) — السجل المركزي لثيمات كل عالم
│                             (slug، الاسم AR/EN، التوكنز الدلالية الكاملة).
│                             مصدر بيانات فقط؛ القيم المطبَّقة فعلياً كـ CSS في
│                             globals.css ويجب أن تبقى متطابقة معه يدوياً.
├── core/
│   ├── kernel/          → محركات النواة (خليل، تيسير، حكيم...) — راجع DOMAIN_MAP.md
│   │   ├── khalil/       → IMPLEMENTED — types.ts, khalil.service.ts (+ createSession/
│   │   │                     validateSessionToken/destroySession/findUserByPhone، اليوم 10؛ +
│   │   │                     ensureIndividualPersona/listActiveWorlds/findWorldBySlug/
│   │   │                     findPersonaByUserAndWorld/createPersona، الأيام 19-21 — Context
│   │   │                     Engine)، khalil.repository.ts — نقطة الوصول الوحيدة المسموحة لجداول
│   │   │                     `users`/`sessions`/`worlds`/`user_personas`، مفروض آلياً عبر قاعدة
│   │   │                     `no-direct-khalil-repository-access` (راجع §3.1)
│   │   └── database/     → IMPLEMENTED
│   │       ├── supabase-client.ts        → مفتاح anon، للقراءات العامة (categories/products/inventory)
│   │       └── supabase-admin-client.ts  → مفتاح service_role (اليوم 7، ADR-008)، خادم فقط،
│   │                                         محمي بحزمة server-only — يُستخدَم فقط عندما RLS
│   │                                         مقفول بالكامل (لا policy لـanon، مثل carts/orders/
│   │                                         merchants منذ اليوم 10/sessions)
│   ├── modules/          → النطاقات (Catalog, Orders, Inventory...)
│   │   ├── catalog/      → IMPLEMENTED (types.ts, catalog.service.ts, catalog.repository.ts)
│   │   ├── merchant/     → IMPLEMENTED — types.ts, merchant.service.ts (+ loginOwnerByPhone
│   │   │                     اليوم 10، + listAll/setActiveStatus اليوم 11)، merchant.repository.ts
│   │   │                     (service_role منذ اليوم 10؛ + findAll/setActiveStatus اليوم 11)،
│   │   │                     merchant-session.ts (كوكي sb_merchant_session)
│   │   ├── admin/        → IMPLEMENTED (اليوم 11) — admin.service.ts (loginByPhone, listMerchants,
│   │   │                     setMerchantActiveStatus)، admin-session.ts (كوكي sb_admin_session
│   │   │                     مستقل + فحص role === 'platform_admin' صريح). لا types.ts ولا
│   │   │                     repository.ts — نطاق تجميع فقط عبر service.ts نطاقات أخرى
│   │   ├── inventory/    → IMPLEMENTED (اليوم 7) — types.ts, inventory.service.ts (isAvailable
│   │   │                     فقط، بلا حجز), inventory.repository.ts
│   │   ├── cart/         → IMPLEMENTED (اليوم 7) — types.ts, cart.service.ts, cart.repository.ts
│   │   │                     (يستخدم supabase-admin-client، لا supabase-client العام)
│   │   ├── payments/     → IMPLEMENTED جزئياً (اليوم 8) — PaymentProvider (واجهة) +
│   │   │                     CashOnDeliveryProvider (التطبيق الوحيد الفعلي)
│   │   ├── orders/       → IMPLEMENTED (الأيام 8-22) — types.ts (ORDER_TRANSITIONS/
│   │   │                     ORDER_TRANSITION_ACTORS كمصدر حقيقة لآلة الحالات)، orders.service.ts
│   │   │                     (checkout, transitionStatus, getStatusHistory, getOrdersForTenant،
│   │   │                     getAllOrders/getRecentStatusHistory، getOrderForCustomerView؛ +
│   │   │                     inFlightCheckouts قفل Single-Flight في-الذاكرة، ADR-022)،
│   │   │                     orders.repository.ts
│   │   ├── audit/        → IMPLEMENTED (اليوم 12، ADR-014) — سجل تدقيق عام (audit_log)، منفصل عن
│   │   │                     order_status_history الخاص بدورة حياة الطلب وحدها
│   │   └── bayan/        → IMPLEMENTED بالكامل (اليوم 23-32، دفعة BAYAN-HOME-FEED-001 مُغلَقة،
│   │                         ADR-021) — types.ts، bayan.service.ts (listFeed, getPostProducts,
│   │                         replacePostMedia, setPostProducts, scaleRecipeQuantities,
│   │                         getIndividualsWorldId)، bayan.repository.ts (يستخدم عميلَي anon
│   │                         وservice_role معاً — راجع §3.1). **لم يُعدَّل إطلاقاً منذ اليوم 23** —
│   │                         كل عمل الأيام 24-32 طبقة عرض/تركيب فوقه فقط عبر
│   │                         src/app/(reef)/feed-actions.ts (+ listActiveWorldsAction اليوم 29):
│   │                         لوحة إدارة (24)، مكوّنات مشتركة HorizontalShelf/BottomSheet (25)،
│   │                         ترويسة عميل (26)، الخلاصة الفعلية + تمرير لانهائي (27)، Product/Recipe
│   │                         Bottom Sheet (28)، مبدّل عوالم حقيقي WorldSwitcher (29)، محور تفضيل
│   │                         شخصي مستقل src/config/personal-theme-registry.ts (30)، Responsive
│   │                         كامل (31)، E2E شامل + إغلاق توثيقي (32). راجع docs/DOMAIN_MAP.md →
│   │                         بيان للحالة النهائية والنطاق المتبقي خارج الدفعة صراحة
│   ├── offline/          → دعم العمل بلا إنترنت — PROPOSED، لم يُبنَ بعد
│   └── telemetry/        → سجل الأحداث والتدقيق المركزي (Event Ledger) — PROPOSED، لم يُبنَ بعد
│                             (لا يُخلَط مع audit/ أعلاه، IMPLEMENTED فعلياً — راجع §11 Event Model)
└── types/                → أنواع TypeScript مشتركة عبر النطاقات
```

**عدد النطاقات (modules) والمحركات (kernel) الفعلي يتغيّر بسرعة أكبر من دورة تحديث هذا الملف — راجع
`git ls src/core/modules` و`src/core/kernel` مباشرة، أو `docs/DOMAIN_MAP.md` للوصف الوظيفي الكامل
لكل واحد، بدل الاعتماد على قائمة ثابتة هنا قد تنحرف.**

### 2.1 معمارية الثيمات متعددة العوالم — Evidence: `IMPLEMENTED` (الآلية)، `PROPOSED` (قيم 5 عوالم لم تُبنَ واجهاتها بعد)

راجع `docs/UI_UX_SYSTEM.md §8` للتفصيل الكامل، و`ADR-007` في `docs/DECISIONS.md` للقرار المعماري (لا يزال `PROPOSED` رسمياً — التنفيذ سبق الاعتماد الرسمي، نفس نمط ADR-006).

طبقتان من CSS Variables داخل `src/app/globals.css`:
- **الطبقة 1 (خام):** قيم Hex مباشرة تحت `[data-world="<slug>"]`، بادئة `--sb-` — تبقى مصدر الحقيقة
  الفعلي لألوان الواجهة حتى بعد تركيب shadcn/ui فعلياً (`ADR-025`، 2026-09-07). shadcn/ui تضيف طبقة
  `:root`/`.dark` خاماء منفصلة بأسمائها القياسية غير المسبوقة (`--primary`, `--background`...) —
  مطلوبة لبعض آلياتها الداخلية فقط (راجع تعليق `src/app/globals.css` أعلى تلك الكتلة)، لا تحل محل
  `--sb-*` ولا تتفاعل مع `[data-world]`.
- **الطبقة 2 (دلالية):** `@theme inline` تربط `--color-primary` بـ `var(--sb-primary)` وهكذا لبقية التوكنز. **يجب استخدام `@theme inline` لا `@theme` العادية** — `@theme` العادية تُجمِّد القيمة عند `:root` وقت البناء، فلا يتغيّر أي شيء فعلياً عند تبديل `data-world` في عنصر متداخل (تحقَّق منه فعلياً: خطأ حقيقي وقع أثناء بناء اليوم 6، أُصلح باستخدام `@theme inline`).

`data-world="diwan"` على `<html>` هو الافتراضي؛ كل قسم فرعي (مثل `(reef)`) يضع `data-world="<slug>"` على عنصر جذر خاص به (لا `<html>` مجدداً)، فيُعاد تعريف الطبقة الثانية فقط لذلك القسم من الشجرة.

**قاعدة بنية كل نطاق (Domain Module) — Evidence: `IMPLEMENTED` (نمط مطبَّق في catalog وkhalil):**
```
src/core/modules/[domain]/  أو  src/core/kernel/[engine]/
  ├── types.ts        → الأنواع والبيانات (لا منطق)
  ├── [name].service.ts    → منطق الأعمال فقط — لا استدعاء قاعدة بيانات هنا
  └── [name].repository.ts → طبقة الوصول لقاعدة البيانات فقط — لا منطق أعمال هنا
```

---

## 3. قاعدة الاعتماد (Dependency Direction) — Evidence: `IMPLEMENTED` (نمط مطبَّق)، `INFERRED` (لم يُكتب كقاعدة صريحة في الدستور، مُستنتج من الكود الفعلي)

```
components/ (واجهة)
     ↓ يستدعي فقط
core/modules/*/service.ts (منطق أعمال)
     ↓ يستدعي فقط
core/modules/*/repository.ts (وصول بيانات)
     ↓ يستدعي فقط
core/kernel/database/supabase-client.ts         (قراءة عامة، مفتاح anon)
core/kernel/database/supabase-admin-client.ts   (نطاقات مقفولة بالكامل بـRLS، مفتاح service_role — اليوم 7)
```

**ممنوع:** أي اتجاه معاكس (repository يستدعي service، أو component يستدعي repository مباشرة). هذه القاعدة **`DOCUMENTED_DECISION` معتمدة الآن (`ADR-005`، `ACCEPTED`)**، ومفروضة آلياً منذ اليوم 9 — راجع §3.1 أدناه.

### 3.1 الفرض الآلي (Deterministic Guardrails) — Evidence: `IMPLEMENTED` (اليوم 9، `ADR-011`)

القاعدة أعلاه (§3) لم تعد تعتمد على انتباه المطوّر/الأداة فقط — `dependency-cruiser` يفحصها آلياً على كل commit:

```
npm run arch:check   → depcruise src --config .dependency-cruiser.cjs
```

القواعد الست المفروضة (`.dependency-cruiser.cjs`، كل قاعدة مُتحقَّق منها فعلياً بحقن مخالفة مؤقتة والتأكد من رفضها قبل اعتمادها):

| القاعدة | تمنع |
|---|---|
| `no-repository-cross-import` | أي `repository.ts` يستورد `repository.ts` نطاق آخر (عزل الشرائح الرأسية — كل نطاق يملك جداوله حصرياً) |
| `no-repository-importing-service` | `repository.ts` يستدعي `service.ts` (عكس اتجاه الاعتماد) |
| `only-repository-touches-db-client` | أي شيء غير `repository.ts` يستورد `supabase-client.ts`/`supabase-admin-client.ts` مباشرة (ملفات `*.test.ts` مُستثناة عمداً — تصل مباشرة للتنظيف الذاتي) |
| `no-direct-khalil-repository-access` | أي نطاق خارج `kernel/khalil/` يستورد `khalil.repository.ts` مباشرة (يجب المرور عبر `khalilService`، نفس نمط `ADR-009`) |
| `no-ui-importing-repository` | `src/app/`, `src/components/` تستورد أي `repository.ts` مباشرة |
| `no-circular` | حلقات استيراد دائرية |

**قيد معروف وموثَّق (لا تجاهل صامت):** لا قاعدة تمنع `service.ts` نطاق ما من استيراد `repository.ts` نطاق **آخر** مباشرة (تجاوز طبقة خدمة ذلك النطاق) — يتطلب مطابقة بين مجلدَي from/to لا تدعمها `dependency-cruiser` بمطابقة regex بسيطة بلا تعداد صريح لكل نطاق. الحماية الفعلية القائمة (`no-repository-cross-import`) تمنع فعلياً أي `repository.ts` من لمس جداول نطاق آخر — وهي الحدّ الفاصل الحقيقي الذي يحمي عزل البيانات؛ الفجوة المتبقية أضعف (تجاوز طبقة منطق أعمال نطاق آخر، لا طبقة بياناته).

**Husky (Git Hooks):**
```
.husky/pre-commit  → typecheck && arch:check && test:unit   (سريع، بلا شبكة)
.husky/pre-push    → test (كامل، يشمل اختبارات التكامل ضد Supabase حقيقي)
```
لا يُتجاوَز `--no-verify` إلا بطلب صريح من المؤسس — راجع `AGENTS.md` بند 9.

**قاعدة إضافية (اليوم 7، `ADR-008`):** أي `repository.ts` لنطاق تُقفَل جداوله بالكامل عبر RLS (بلا أي policy لـ`anon`/`authenticated`) **يجب** أن يستخدم `supabase-admin-client.ts`، لا `supabase-client.ts` العام. هذا ليس اختياراً أسلوبياً — استخدام العميل الخطأ يعني فشل كل استعلام صامتاً (RLS يمنع anon) أو ثغرة أمنية (لو أُزيلت RLS بالخطأ). القرار بين العميلين يُحسَم عند تصميم RLS للجدول، لا بعده.

---

## 4. نمط Adapters — Evidence: `CONSTITUTION` (§5)

كل خدمة خارجية تُبنى خلف واجهة تجريدية، لا ربطاً مباشراً بمنطق العمل الأساسي:

```
PaymentProvider (واجهة عامة) — Status: PROPOSED (الواجهة مُصمَّمة، لا Adapter فعلي منفَّذ بعد)
   ├── VodafoneCashProvider    — PROPOSED
   ├── InstapayProvider        — PROPOSED
   ├── CardProvider            — PROPOSED
   ├── DiwanWalletProvider     — PROPOSED
   ├── QRPaymentAdapter        — DEFERRED (§34 دستور)
   ├── ContactlessAdapter      — DEFERRED
   └── UtilityTopUpAdapter     — DEFERRED (يتطلب شراكات فعلية أولاً)

ImportProvider (واجهة عامة، مقترحة من محادثة الاستيراد الدولي) — Status: PROPOSED، خارج الدستور v1.2
   ├── CarImportPartner        — PROPOSED
   └── MachineryTradingOffice  — PROPOSED
```

**الفائدة (Evidence: `CONSTITUTION`):** إضافة مزوّد جديد = Adapter جديد فقط، منطق الطلبات/الدفع الأساسي لا يتغير سطر واحد.

---

## 5. المكدس التقني — الحالة الآن

| الطبقة | التقنية | الحالة |
|---|---|---|
| الواجهة الأمامية | Next.js (RTL) + TypeScript + Tailwind | `ACTIVE` |
| مكوّنات UI | shadcn/ui (`base: radix`, `style: radix-nova`) + `radix-ui` | `IMPLEMENTED` (`ADR-025`، 2026-09-07) — `button.tsx` أول مكوّن، بلا استهلاك في صفحة بعد |
| منطق الخادم | Edge Functions / Node.js | `ACTIVE` |
| قاعدة البيانات | Supabase (Postgres + Auth + Realtime + Storage) | `ACTIVE`, `IMPLEMENTED` (اتصال حقيقي — **عدد الجداول وتفاصيلها الحية تتغيّر بسرعة؛ `docs/DATABASE.md §3` هو مصدر الحقيقة الوحيد لهذا الرقم، لا يُكرَّر هنا بقيمة عرضة للانحراف**) |
| الصلاحيات (RLS) | Postgres RLS | `IMPLEMENTED` — ثلاثة أنماط (قراءة عامة، قفل كامل عبر service_role، قراءة الذات معطَّلة عملياً) — راجع `docs/DATABASE.md §6` للجدول الكامل والحالة الفعلية لكل جدول |
| اختبارات آلية | Vitest (وحدة + تكامل ضد Supabase حقيقي) | `IMPLEMENTED` — **عدد الاختبارات يتغيّر مع كل مهمة؛ راجع `docs/CHANGELOG.md` (آخر رقم موثَّق لكل يوم) بدل رقم ثابت هنا.** راجع `src/core/modules/*/*.test.ts` |
| البحث | Meilisearch | `PROPOSED` (§9 دستور) — لم يُبنَ |
| الدردشة | Supabase Realtime (المرحلة 1) | `PROPOSED` — لم يُبنَ بعد، مخطط §25 دستور |

---

## 6. لغات النظام المستقبلية — Evidence: `CONSTITUTION` §27.2 (`DEFERRED` بوضوح)

**لا تُستخدم الآن. هذا قسم توثيقي بحت لمنع أي أداة تنفيذ من افتراض أنها متاحة.**

| اللغة/المنصة | الاستخدام المخطَّط | الحالة | الشرط |
|---|---|---|---|
| TypeScript/Node.js | كل شيء الآن | `ACTIVE` | — |
| Rust | نواة الدفتر المالي، محركات مطابقة عالية السرعة | `DEFERRED — Phase 2` | عند نضج تيسير كخدمة مالية حقيقية |
| Elixir/Erlang (BEAM/OTP) | عزل وانتعاش ذاتي على نمط QNX لخدمات نبض الحرجة | `DEFERRED — Phase 3` | عند بناء طبقة "لا تنهار أبدًا" الفعلية لنبض |

**تحذير صريح لأي أداة تنفيذ:** اعتماد TypeScript الآن **لا يعني** إلغاء Rust/Elixir. لا تفترض هذا، ولا تعترض على مقترحات مستقبلية بذريعة "قررنا TypeScript فقط".

---

## 7. استراتيجية التوسع المستقبلية (فصل النطاقات لاحقاً) — Evidence: `CONSTITUTION`, `PROPOSED` (التفاصيل التقنية للفصل نفسه غير موثَّقة، فقط المبدأ)

المبدأ: أي نطاق (Domain) داخل Modular Monolith يمكن فصله لاحقاً لخدمة مستقلة **إذا** التزم من البداية بـ:
- عدم استدعاء نطاق آخر مباشرة (فقط عبر service layer محدَّد)
- عدم مشاركة جداول قاعدة بيانات مع نطاق آخر دون توثيق العلاقة في `docs/DATABASE.md`
- كل تواصل بين النطاقات يُسجَّل كحدث في سجل الأحداث المركزي (عند بنائه)

**كيفية الفصل الفعلي (خطوات تقنية، بروتوكول، إلخ) غير محسومة بعد — `OPEN_QUESTION`، تُحسم عند وجود حاجة فعلية.**

---

## 8. فلسفة الخلايا الجذعية (Stem Cell Architecture) — Evidence: `CONSTITUTION` §4

لا شيء يُبرمج بشكل ثابت (Hardcoded) يمكن أن يتغير. الأقسام، السمات، الصلاحيات تُدار من سجل مركزي قابل للتعديل دون نشر كود جديد. **الحالة الحالية:** الأقسام (`categories`) بالفعل مُدارة كبيانات في جدول Supabase لا كقيم ثابتة في الكود — `IMPLEMENTED` جزئياً. الصلاحيات لا تزال أنواع TypeScript ثابتة (`UserRole`) — `PARTIALLY_IMPLEMENTED`، السجل المركزي القابل للتعديل بدون نشر كود لم يُبنَ بعد.

---

## 9. ما لا يُبنى الآن (توثيقاً لمنع الانحراف)

- ❌ Microservices فعلية
- ❌ أي Adapter دفع/استيراد فعلي (الواجهات فقط مُصمَّمة)
- ❌ محرك بحث منفصل (Meilisearch)
- ❌ نظام الأحداث المركزي الكامل (Event Ledger) — `audit_log` (اليوم 12) و`order_status_history`
  (اليوم 9) مُنفَّذان فعلياً كسجلَّي تدقيق، لكن ليسا سجل أحداث مركزياً بمعنى Event Ledger/Event
  Bus عابر للنطاقات — راجع §11 أدناه
- ❌ Rust أو Elixir بأي شكل
- ❌ منصة SaaS/ERP عامة قابلة للاستخدام من أي متجر/شركة/مصنع (مخزون/تسعير/كاشير-POS/سوشيال
  ميديا/عملاء/تسويق/دورات تعليمية بمعزل عن ريف) — رؤية بعيدة المدى موثَّقة في
  `docs/ERP_SAAS_VISION.md`، **يجب قراءتها أول أي مهمة مستقبلية تخص لوحات الإدارة/التاجر** لتقييم أي
  قرار تصميم جديد في ضوئها (هل يمنعها مستقبلاً أم يمهّد لها) — بلا بناء أي تعميم الآن.

---

## 10. Architecture Boundaries — حدود كل نطاق فعلي اليوم

> Evidence: `IMPLEMENTED` (الكود)، `DOCUMENTED_DECISION` (قواعد `dependency-cruiser`)، تقييم
> "Extraction Readiness" أدناه هو **تحليل جديد أُجري في هذه الدفعة (2026-09-06)** اعتماداً على
> `npm run arch:check` الفعلي، `docs/DOMAIN_MAP.md`، و`docs/DECISIONS.md` — **وليس نسخاً حرفياً عن
> أي تقرير تدقيق سابق محفوظ كملف**، لأن لا ملف من هذا النوع موجود فعلياً في المستودع (راجع "فجوات
> الاستمرارية" في Task Report دفعة `CONSTITUTION-V2-BATCH2` لتفصيل هذه النقطة). لكل نطاق بيانات
> رئيسي (Domain) موجود فعلياً في `src/core/modules/`:

### Catalog
| | |
|---|---|
| Owns Data | `categories`, `products`, `inventory` |
| Public Service Interface | `CatalogService.calculatePrice()`, `validateSelection()`/`validateOptions()`, `listAllProducts()` |
| Allowed Dependencies | `catalog.repository.ts` → `supabase-client.ts` (anon) فقط |
| Forbidden Dependencies | أي `repository.ts` نطاق آخر (`no-repository-cross-import`)، `khalil.repository.ts` مباشرة (`no-direct-khalil-repository-access`)، استيراد مباشر من `src/app`/`src/components` (`no-ui-importing-repository`) — الثلاثة مفروضة آلياً، راجع §3.1 |
| Extraction Readiness | **MEDIUM** — ملكية حصرية للجداول مُتحقَّق منها آلياً (`arch:check`: 0 مخالفات)، ويُستهلَك حصراً عبر `CatalogService` من Cart/Orders/Bayan/Admin (`docs/DOMAIN_MAP.md`). **العائق:** `Orders.checkout()` يستدعي `calculatePrice()` بشكل متزامن ضمن نفس العملية بلا أي تجريد لاستدعاء شبكي، والتعويض عند الفشل (`ADR-009`) مصمَّم على افتراض قاعدة بيانات واحدة مشتركة — فصل Catalog كخدمة مستقلة يتطلب إعادة تصميم هذا التدفق أولاً |

### Cart
| | |
|---|---|
| Owns Data | `carts`, `cart_items` |
| Public Service Interface | `CartService.getSummary()`, `clearCart()`, `addItem`/`removeItem`/`updateItemQuantity`, `getItemCountForSession()` |
| Allowed Dependencies | `cart.repository.ts` → `supabase-admin-client.ts` (service_role، `ADR-008`)؛ يستدعي `CatalogService`/`InventoryService` عبر `service.ts` لا `repository.ts` مباشرة |
| Forbidden Dependencies | نفس الثلاثة العامة أعلاه (§3.1) |
| Extraction Readiness | **LOW** — هوية سلة الزائر (`session_token`) مربوطة بـ`src/proxy.ts` (`ADR-016`) على مستوى التوجيه (routing) نفسه، لا طبقة خدمة قابلة للفصل بسهولة. `Orders.checkout()` يقرأ ملخَّص Cart ثم يستدعي `clearCart()` كخطوة أخيرة ضمن تدفق متزامن واحد بلا تعويض لو فشل `clearCart()` بعد نجاح Orders في بيئة موزَّعة |

### Orders
| | |
|---|---|
| Owns Data | `orders`, `order_items`, `order_status_history` |
| Public Service Interface | `OrdersService.checkout()`, `transitionStatus()`, `getStatusHistory()`, `getOrdersForTenant()`, `getAllOrders()`, `getRecentStatusHistory()`, `getOrderForCustomerView()`, `getOrderWithItems()` |
| Allowed Dependencies | `orders.repository.ts` → `supabase-admin-client.ts`؛ ينسِّق (عبر `service.ts` فقط) `CatalogService`, `InventoryService`, `CartService`, `KhalilService`, `PaymentProvider` |
| Forbidden Dependencies | تقسيم طلب واحد عبر أكثر من `tenant_id` (رفض صريح في الكود، `ADR-009`)؛ استيراد `repository.ts` نطاق آخر مباشرة (مفروض آلياً) |
| Extraction Readiness | **LOW** — أكثر نطاق تنسيقاً في المشروع (يستدعي أربعة نطاقات أخرى بشكل متزامن ضمن عملية واحدة)، ويعتمد على قفل في-الذاكرة (`inFlightCheckouts`, `ADR-022`) وتعويض تطبيقي بدل معاملة DB حقيقية (`ADR-009`) — كلاهما يفترضان عملية Node واحدة ولا ينجوان من فصل هذا النطاق أو تشغيله على أكثر من نسخة خادم بلا إعادة تصميم (راجع `DD-002` في `docs/DECISIONS.md`) |

### Merchant
| | |
|---|---|
| Owns Data | `merchants` |
| Public Service Interface | `MerchantService.loginOwnerByPhone()`, `validateSessionToken()`, `listAll()`, `setActiveStatus()`, `canAccessTenant()` |
| Allowed Dependencies | `merchant.repository.ts` → `supabase-admin-client.ts` (`ADR-012`)؛ يستدعي `KhalilService` للجلسة (أبداً `khalil.repository.ts` مباشرة) |
| Forbidden Dependencies | `khalil.repository.ts` مباشرة (مفروض آلياً)؛ أي `repository.ts` نطاق آخر |
| Extraction Readiness | **MEDIUM** — ملكية حصرية لجدول `merchants`، تفويض نظيف للجلسة عبر خدمة Khalil فقط. **العائق:** `Orders.assertActorCanAccessOrder()` يقارن `tenant_id` داخل نفس العملية بلا أي واجهة شبكية للتحقق من ملكية تاجر |

### Admin
| | |
|---|---|
| Owns Data | لا شيء — نطاق تجميع (Aggregation/BFF) بلا جدول خاص، راجع `docs/DOMAIN_MAP.md → Admin` |
| Public Service Interface | `AdminService.loginByPhone()`, `listMerchants()`, `setMerchantActiveStatus()` |
| Allowed Dependencies | `KhalilService`, `MerchantService`, `OrdersService`, `BayanService`/`CatalogService` (لوحة منشورات، اليوم 24) — كلها عبر `service.ts` فقط |
| Forbidden Dependencies | أي `repository.ts` مباشرة (مفروض آلياً)؛ تعديل عمولة تاجر أو حذفه، تسجيل تاجر جديد (قيد عمل صريح، غير مفروض آلياً — راجع `DD-006`) |
| Extraction Readiness | **N/A** — لا يملك بيانات، فهو ليس مرشَّحاً لاستخراج بمعنى "خدمة مستقلة تملك جداولها"؛ هو طبقة تركيب فوق نطاقات أخرى بطبيعته |

### Bayan
| | |
|---|---|
| Owns Data | `posts`, `post_media`, `post_products` |
| Public Service Interface | `BayanService.listFeed()`, `getPostProducts()`, `replacePostMedia()`, `setPostProducts()`, `scaleRecipeQuantities()`, `getIndividualsWorldId()` |
| Allowed Dependencies | `bayan.repository.ts` → عميلا `supabase` (anon، قراءة عامة) **و** `supabase-admin-client.ts` (service_role، إدارة/مسودات) معاً — نمط مزدوج موثَّق (`ADR-021`)؛ يستدعي `khalilService.listActiveWorlds()` (عبر الخدمة، لا `khalil.repository.ts`) |
| Forbidden Dependencies | قراءة مباشرة لجدولَي `products`/`categories` (لا تحدث فعلياً اليوم — تحقَّقتُ منه بحثاً مباشراً في `bayan.repository.ts`، 2026-09-06: لا استعلام واحد عليهما، فقط تخزين `product_id`/`category_id` كمعرّفات) |
| Extraction Readiness | **MEDIUM-HIGH** — لا اعتماد فعلي على قراءة جداول نطاقات أخرى مباشرة، فقط معرّفات FK يحلّها المستهلك. **العائق الوحيد:** إخفاء محتوى المسودات لـ`post_media`/`post_products` منطق تطبيقي بحت في `bayan.service.ts`، لا RLS (`ADR-021`) — أي استخراج مستقبلي يجب أن ينقل هذا المنطق معه، لا افتراض أن قاعدة البيانات تفرضه |

### خليل (Khalil)
| | |
|---|---|
| Owns Data | `users`, `sessions`, `worlds`, `user_personas` |
| Public Service Interface | `KhalilService` — `findUserByPhone`, `findOrCreateCustomerByPhone`, `createSession`, `validateSessionToken`, `destroySession`, `hasRole`, `canAccessTenant`, `ensureIndividualPersona`, `listActiveWorlds`, `findWorldBySlug`, `findPersonaByUserAndWorld`, `createPersona` |
| Allowed Dependencies | `khalil.repository.ts` → `supabase-client.ts`/`supabase-admin-client.ts` |
| Forbidden Dependencies | استيراد `khalil.repository.ts` من أي نطاق خارج `core/kernel/khalil/` — القاعدة الوحيدة المخصَّصة لنطاق بعينه في `.dependency-cruiser.cjs` (`no-direct-khalil-repository-access`)، لأن كل نطاق آخر (Merchant, Admin, Orders) يعتمد عليه لهوية المستخدم |
| Extraction Readiness | **LOW** — أعلى درجة اعتماد مركزي في المشروع: كل مسار دخول/Checkout يستدعيه بشكل متزامن على المسار الحرج (hot path). فصله يفرض على كل نطاق آخر تحويل استدعاء هوية داخلي إلى استدعاء شبكي |

---

## 11. Event Model — مبدأ فقط، لا بناء

**الحدث (Event) إشعار بأن الحالة تغيّرت، وليس مصدر الحقيقة.** مصدر الحقيقة هو حالة قاعدة
البيانات/Domain نفسها (`orders.status`، `inventory.quantity_available`، إلخ) — لا أي حدث مُصدَر
سابقاً يصف تلك الحالة. عند بناء أي نظام أحداث مركزي مستقبلي (Event Ledger/Event Bus، محرك النواة
"الأحداث" §6 من `SALSABIL_CONSTITUTION.md`، أو أي تكامل مستقبلي لبرق/تيسير)، **يُلزَم هذا المبدأ**:
قراءة الحالة الحالية تعود دائماً لمصدرها المباشر (الجدول/الخدمة)، لا لإعادة بناء الحالة من سجل
أحداث متراكم كمصدر وحيد، ما لم يُقرَّر صراحة نمط Event Sourcing كقرار معماري منفصل موثَّق (`ADR`)
لاحقاً — لا افتراضاً ضمنياً اليوم.

**الحالة الفعلية اليوم:** لا نظام أحداث مركزي مبني (`❌` في §9 أعلاه). `order_status_history`
و`audit_log` سجلا تدقيق (Audit Trail) — يوثقان أن حدثاً وقع، لا يُستهلَكان كمصدر حالة حي من أي كود
اليوم (`orders.status` نفسه، لا آخر صف في `order_status_history`، هو ما تقرأه `transitionStatus()`
والواجهات).

---

## 12. Automation Principles — سبع قواعد لأي أتمتة مستقبلية

> مبادئ مختصرة تحكم أي أتمتة مستقبلية (Barq، Taysir، Hakim كمُنفِّذ لا مستشاراً فقط، إلخ) — ليست
> وثيقة `AUTOMATION.md` كاملة، فقط القواعد السبع الحاكمة.

1. **Idempotent دائماً** — تنفيذ الأتمتة أكثر من مرة بنفس المدخلات يجب أن ينتج نفس النتيجة، لا آثاراً مضاعفة.
2. **Observable** — كل تنفيذ يترك أثراً قابلاً للملاحظة (سجل/تدقيق) يوضح ماذا حدث، متى، ولماذا.
3. **Retryable** — فشل مؤقت يُعاد المحاولة بأمان، بلا إنتاج نتيجة مضاعفة (يعتمد مباشرة على مبدأ 1).
4. **سلوك فشل صريح (Explicit failure behavior)** — كل أتمتة تُحدَّد سلفاً كيف تتصرف عند الفشل (توقف/تراجع/تنبيه بشري) — لا فشلاً صامتاً يُكتشَف لاحقاً بالصدفة.
5. **لا تتجاوز Authorization أبداً** — أي فحص تفويض يخضع له فاعل بشري ينفّذ نفس العملية، تخضع له الأتمتة بلا استثناء.
6. **لا تُعدِّل حالة مالية بلا تفويض Domain صريح** — امتداد مباشر لـ`SALSABIL_CONSTITUTION.md §4` بند 4 (حكيم استشاري بحق نقض بشري في المراحل الأولى) — لا أتمتة تنفّذ تحويلاً مالياً أو خصماً بلا موافقة صريحة من منطق النطاق المالك (Domain)، لا من الأتمتة نفسها.
7. **لا تعتمد على In-Memory State للعمليات الدائمة** — أي أتمتة تُنفَّذ عبر أكثر من طلب/عملية لا يجوز أن تعتمد صحتها على حالة محفوظة في ذاكرة عملية واحدة. **مثال حي فعلي قائم اليوم يوضح بالضبط لماذا هذا المبدأ ضروري لا نظري:** `INV-ORD-002` (`INVARIANTS.md`) وقفل `inFlightCheckouts` في-الذاكرة (`ADR-022`) — مصنَّف `PARTIAL` لا `ENFORCED` تحديداً لأنه لا ينجو من تعدد نسخ خادم (Serverless/multi-instance)، وموثَّق كـ`DD-002` (`docs/DECISIONS.md`) كـBLOCKER صريح يمنع أي نشر إنتاج متعدد الخوادم حتى استبداله بقفل موزَّع. أي أتمتة مستقبلية تكرر نفس النمط (قفل/عدّاد Map محلي) سترث نفس القيد بالضبط.

---

## 13. Neighborhood Identity System — Evidence: `IMPLEMENTED` (المرحلة 1: كود ثابت)، `DOCUMENTED_DECISION` (`ADR-024`)

> نمط **قابل لإعادة الاستخدام عبر أي عالم** (`WorldSlug`) — لا حلاً خاصاً بريف المدينة وحدها، رغم أن
> كل القيم المسجَّلة اليوم بادئتها `reef:` فقط (لا أحياء حقيقية في عوالم أخرى بعد).

### 13.1 المشكلة

`theme-registry.ts` (`ADR-007`) يحكم الهوية البصرية على مستوى **العالم بأكمله** (ريف/ديوان/أسراب...).
لوحظ في مرجع تصميم خارجي (Lovable) أن كل **حي (category)** داخل نفس العالم قد يحتاج تمييزاً بصرياً
خاصاً به فوق ثيم العالم العام — مثال حقيقي مكتشَف: قسم اللحوم هناك يستخدم لوناً أحمر-ورديّاً ثابتاً
(`rose-600` من Tailwind، لا توكن ثيم) بصرف النظر عن أي ثيم عام مختار (راجع `ADR-023` للتفصيل الكامل
لهذا الاكتشاف). هذا مستوى تخصيص **أدق** من `[data-world]`، ولا يصح حله بتكرار هاردكود لوني داخل
`ProductCard.tsx` أو أي مكوّن مشترك آخر — يخالف مبدأ الخلايا الجذعية (§8 أعلاه) مباشرة.

### 13.2 الحل — سجل مركزي ثانٍ، طبقة فوق الثيم لا بديلاً عنه

`src/config/neighborhood-identity-registry.ts` — نفس نمط `theme-registry.ts` حرفياً (سجل بيانات
مركزي `Partial<Record<Key, Identity>>` + دالة قراءة واحدة `getNeighborhoodIdentity()`)، لكن مفتاحه:

```ts
type NeighborhoodKey = `${WorldSlug}:${string}`; // ${world_slug}:${category_slug}
```

**لماذا `world_slug:category_slug` لا `category_slug` وحده:** حتى لو اليوم كل قيمة مسجَّلة بادئتها
`reef:` فقط، هذا يمنع تصادم `category_slug` عبر عوالم مختلفة مستقبلاً (مثال افتراضي: `meat` قد
تعني شيئاً مختلفاً تماماً في عالم أسراب عنه في ريف) بلا الحاجة لإعادة تصميم المفتاح لاحقاً.

**تمييز إلزامي — لا يُخلَط بين الاثنين:**
- `worldSlug` في هذا السجل = **الهوية التجارية الثابتة للعالم** ("reef") — نفس معنى `world_scope`
  في `src/core/modules/bayan/types.ts` (`posts.world_scope`).
- **ليس** اسم الثيم المرئي الحالي المُطبَّق فعلياً كـ`[data-world]` على الصفحة (`'reef'` أو
  `'reef-lavender'` سيّان — `ADR-023`). تبديل الغلاف البصري للعالم **لا يغيّر** مفتاح هوية الحي.

**لا قيمة افتراضية مكرَّرة:** إن لم يوجد سطر لمفتاح مُعطى، الدالة تُعيد `null` والمستهلك يستخدم
توكنز الثيم العامة (`bg-primary`/`border-primary`) بلا أي تخصيص. تسجيل قيمة hex افتراضية لكل عالم
هنا كان سيكرر بيانات موجودة أصلاً في `theme-registry.ts` — عكس "مصدر واحد للحقيقة لكل معلومة"
(`docs/DOCUMENTATION_RULES.md §6`).

**مبدأ صارم آخر:** لا يُسجَّل هنا أي حي **لا يقابله صف حقيقي في جدول `categories`** — حتى لو كانت
قيمته اللونية مُستخرَجة فعلياً من مرجع خارجي وجاهزة. تسجيل ألوان لأحياء لم تُنشَأ بعد ينتهك مباشرة
"الأقسام بيانات من جدول Supabase لا قيم ثابتة بالكود" (§8 أعلاه). القيم غير المستخدَمة بعد تُحفَظ في
`ideas/IDEAS.md` كمرجع لحظة إنشاء كل حي فعلياً، لا كسطر ميت في سجل كود حي.

### 13.3 نقاط الاستهلاك الفعلية اليوم

`src/app/(reef)/categories/page.tsx` (حلقة أفاتار الحي) و`src/app/(reef)/[category]/page.tsx`
(بانر أعلى صفحة الحي) — الاثنان فقط، عبر `style={identity ? {...} : undefined}` مع class افتراضي
(`border-primary`/`bg-primary`) يبقى فعّالاً حين `identity === null`.

### 13.4 المرحلة القادمة — `PROPOSED`، لا التزام تنفيذ

تحويل هذا السجل من كود ثابت إلى جدول قاعدة بيانات + واجهة إدارة CRUD (تغيير لون/هوية حي دون نشر كود
جديد) — راجع `docs/ROADMAP.md → Phase 2 Backlog`. لم يُبنَ بعد، يحتاج تقييم حجم الحاجة الفعلية أولاً
(اليوم: حي واحد فقط مسجَّل، `daily-food` — لا ضغط عملي حقيقي بعد يبرر بناء CRUD كامل).
