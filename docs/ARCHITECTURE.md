---
title: المعمارية التقنية
status: ACTIVE
version: 1.4
last_updated: 2026-09-02
owner: المؤسس (أبوحتاب) + Claude (معماري)
source_of_truth: هذا الملف (تفصيل)، SALSABIL_CONSTITUTION.md §4-§5 (المبدأ)
---

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
│   └── merchant/          → IMPLEMENTED (اليوم 10) — بوابة التاجر (البوابة الثانية من ثلاث،
│                             CONSTITUTION §8). data-world="reef" أيضاً. login/ (دخول بالهاتف)
│                             وorders/ (قائمة طلبات التاجر + أزرار انتقال حالة) — بادئة URL
│                             حقيقية (لا Route Group مقنَّع) لأنها بوابة مستقلة، لا امتداد لريف
├── components/          → مكونات واجهة قابلة لإعادة الاستخدام، محايدة لونياً بالكامل
│   │                       (تستهلك فقط bg-primary/text-foreground/border-border...)
│   └── ui/               → فارغ حالياً — shadcn/ui **غير مثبّتة** (تحقَّق منه فعلياً
│                             اليوم 6: لا components.json، لا cva/clsx/cn — راجع
│                             docs/DECISIONS.md → CONFLICT-005)
├── config/
│   └── theme-registry.ts → IMPLEMENTED (اليوم 6) — السجل المركزي لثيمات كل عالم
│                             (slug، الاسم AR/EN، التوكنز الدلالية الكاملة).
│                             مصدر بيانات فقط؛ القيم المطبَّقة فعلياً كـ CSS في
│                             globals.css ويجب أن تبقى متطابقة معه يدوياً.
├── core/
│   ├── kernel/          → محركات النواة (خليل، تيسير، حكيم...) — راجع DOMAIN_MAP.md
│   │   ├── khalil/       → IMPLEMENTED — types.ts, khalil.service.ts (+ createSession/
│   │   │                     validateSessionToken/destroySession/findUserByPhone، اليوم 10)،
│   │   │                     khalil.repository.ts
│   │   └── database/     → IMPLEMENTED
│   │       ├── supabase-client.ts        → مفتاح anon، للقراءات العامة (categories/products/inventory)
│   │       └── supabase-admin-client.ts  → مفتاح service_role (اليوم 7، ADR-008)، خادم فقط،
│   │                                         محمي بحزمة server-only — يُستخدَم فقط عندما RLS
│   │                                         مقفول بالكامل (لا policy لـanon، مثل carts/orders/
│   │                                         merchants منذ اليوم 10/sessions)
│   ├── modules/          → النطاقات (Catalog, Orders, Inventory...)
│   │   ├── catalog/      → IMPLEMENTED (types.ts, catalog.service.ts, catalog.repository.ts)
│   │   ├── merchant/     → IMPLEMENTED — types.ts, merchant.service.ts (+ loginOwnerByPhone،
│   │   │                     اليوم 10)، merchant.repository.ts (service_role منذ اليوم 10،
│   │   │                     كان anon بلا استخدام فعلي)، merchant-session.ts (كوكي الجلسة)
│   │   ├── inventory/    → IMPLEMENTED (اليوم 7) — types.ts, inventory.service.ts (isAvailable
│   │   │                     فقط، بلا حجز), inventory.repository.ts
│   │   ├── cart/         → IMPLEMENTED (اليوم 7) — types.ts, cart.service.ts, cart.repository.ts
│   │   │                     (يستخدم supabase-admin-client، لا supabase-client العام)
│   │   ├── payments/     → IMPLEMENTED جزئياً (اليوم 8) — PaymentProvider (واجهة) +
│   │   │                     CashOnDeliveryProvider (التطبيق الوحيد الفعلي)
│   │   └── orders/       → IMPLEMENTED (اليوم 8-9) — types.ts (ORDER_TRANSITIONS/
│   │                         ORDER_TRANSITION_ACTORS كمصدر حقيقة لآلة الحالات)، orders.service.ts
│   │                         (checkout, transitionStatus, getStatusHistory), orders.repository.ts
│   ├── offline/          → دعم العمل بلا إنترنت — PROPOSED، لم يُبنَ بعد
│   └── telemetry/        → سجل الأحداث والتدقيق — PROPOSED، لم يُبنَ بعد
└── types/                → أنواع TypeScript مشتركة عبر النطاقات
```

### 2.1 معمارية الثيمات متعددة العوالم — Evidence: `IMPLEMENTED` (الآلية)، `PROPOSED` (قيم 5 عوالم لم تُبنَ واجهاتها بعد)

راجع `docs/UI_UX_SYSTEM.md §8` للتفصيل الكامل، و`ADR-007` في `docs/DECISIONS.md` للقرار المعماري (لا يزال `PROPOSED` رسمياً — التنفيذ سبق الاعتماد الرسمي، نفس نمط ADR-006).

طبقتان من CSS Variables داخل `src/app/globals.css`:
- **الطبقة 1 (خام):** قيم Hex مباشرة تحت `[data-world="<slug>"]`، بادئة `--sb-` (بديل عن أسماء shadcn القياسية غير المسبوقة، لأن shadcn/ui غير مثبّتة).
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
| منطق الخادم | Edge Functions / Node.js | `ACTIVE` |
| قاعدة البيانات | Supabase (Postgres + Auth + Realtime + Storage) | `ACTIVE`, `IMPLEMENTED` (اتصال حقيقي، 11 جدولاً: users, categories, products, merchants, inventory, carts, cart_items, orders, order_items, order_status_history, sessions) |
| الصلاحيات (RLS) | Postgres RLS | `IMPLEMENTED` — نمطان: قراءة عامة (categories/products/inventory) وقفل كامل عبر service_role (merchants/carts/cart_items/orders/order_items/order_status_history/sessions، اليوم 7-10) |
| اختبارات آلية | Vitest (وحدة + تكامل ضد Supabase حقيقي) | `IMPLEMENTED` (اليوم 7-10) — راجع `src/core/modules/cart/*.test.ts`, `src/core/modules/orders/*.test.ts`, `src/core/modules/merchant/*.test.ts` |
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
- ❌ نظام الأحداث المركزي الكامل (Event Ledger) — الآن فقط `audit_log` أساسي مخطَّط، غير منفَّذ بعد
- ❌ Rust أو Elixir بأي شكل
