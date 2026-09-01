---
title: المعمارية التقنية
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
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
├── components/          → مكونات واجهة قابلة لإعادة الاستخدام
│   └── ui/
├── core/
│   ├── kernel/          → محركات النواة (خليل، تيسير، حكيم...) — راجع DOMAIN_MAP.md
│   │   ├── khalil/       → IMPLEMENTED (types.ts, khalil.service.ts, khalil.repository.ts)
│   │   └── database/     → IMPLEMENTED (supabase-client.ts)
│   ├── modules/          → النطاقات (Catalog, Orders, Inventory...)
│   │   └── catalog/      → IMPLEMENTED (types.ts, catalog.service.ts, catalog.repository.ts)
│   ├── offline/          → دعم العمل بلا إنترنت — PROPOSED، لم يُبنَ بعد
│   └── telemetry/        → سجل الأحداث والتدقيق — PROPOSED، لم يُبنَ بعد
└── types/                → أنواع TypeScript مشتركة عبر النطاقات
```

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
core/kernel/database/supabase-client.ts
```

**ممنوع:** أي اتجاه معاكس (repository يستدعي service، أو component يستدعي repository مباشرة). هذه القاعدة **مُستنتجة من الكود الفعلي المكتوب في الأيام 1-3**، وليست منصوصاً عليها حرفياً بهذا الشكل في الدستور — لذا وسمها `INFERRED`. **مقترح: تُرفع لتصبح `DOCUMENTED_DECISION` صريحة في DECISIONS.md (انظر ADR-005 المقترح).**

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
| قاعدة البيانات | Supabase (Postgres + Auth + Realtime + Storage) | `ACTIVE`, `IMPLEMENTED` (اتصال حقيقي، 4 جداول) |
| الصلاحيات (RLS) | Postgres RLS | `IMPLEMENTED` (على جدول users، categories، products، inventory) |
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
