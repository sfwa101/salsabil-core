---
title: تصميم Phase 2 — الطلب متعدد التجار + موظفو التاجر + مكتب الدليفري المبسَّط
status: APPROVED
version: 1.0
last_updated: 2026-09-15
owner: Claude (تصميم) + المؤسس (اعتماد نهائي) — اعتُمد من المؤسس بتاريخ 2026-09-15
source_of_truth: هذا الملف لنطاق التصميم نفسه — معتمَد نهائياً من المؤسس بتاريخ 2026-09-15؛ لا كود، لا Schema حي حتى تكليف صريح منفصل بتنفيذ TASK-12
related: SALSABIL_CONSTITUTION.md §4/§8، docs/DIWAN_VISION.md (Addendum 4ب، Addendum 5)، docs/audits/2026-09-14-reef-v1-engineering-audit.md §8/§9/§17، specs/orders/REEF_V1_MASTER_EXECUTION_PLAN.md Phase 2، docs/DATABASE.md، docs/DECISIONS.md (ADR-009, ADR-010, ADR-012, ADR-018, CONFLICT-006)، docs/BUSINESS_RULES.md (BR-007, BR-009, BR-010)
---

> **Founder Gate — معتمَد.** المؤسس اعتمد هذا التصميم نهائياً بتاريخ 2026-09-15 بعد جولة تصحيحات (راجع §10.1 للقرارات المحسومة). هذا الملف يبقى تصميماً فقط — **صفر كود، صفر Migration، صفر تعديل على أي ملف تطبيق نُفِّذ أو يُنفَّذ ضمن نطاق TASK-09 نفسها.** الاعتماد هنا يُغلق TASK-09 فقط؛ **TASK-12** (تنفيذ Schema + منطق تقسيم Checkout الفعلي) **تبقى مهمة منفصلة تماماً تنتظر تكليفاً صريحاً لاحقاً من المؤسس** — لا تبدأ تلقائياً بمجرد هذا الاعتماد.

---

## 1. ملخص تنفيذي

هذا التصميم يمتد فوق نطاق الطلبات الحالي (`orders`/`order_items`/`order_status_history`، `ADR-009`/`ADR-010`) بثلاثة جداول-عائلات جديدة كلياً — `customer_orders`/`merchant_suborders` (الطلب متعدد التجار)، `merchant_staff` (موظفو التاجر)، و`delivery_offices`/`drivers`/`delivery_jobs` (مكتب الدليفري المبسَّط) — بلا لمس أي جدول قائم عبر `ALTER` على بيانات حية، تطبيقاً حرفياً لمبدأ "الخلايا الجذعية" (`CONSTITUTION §4` بند 7) ولتوصية التقرير الهندسي (§8: "extend, don't rebuild"). آلة حالة الطلب الحالية (`ORDER_TRANSITIONS`، `ORDER_TRANSITION_ACTORS`) تبقى **بلا أي تعديل** — يُعاد استخدامها حرفياً على `merchant_suborders`.

---

## 2. `customer_orders` / `merchant_suborders`

### 2.1 قرار تسمية الجداول الفعلية (مراجعة صريحة)

المؤسس/التقرير يستخدمان `customer_order`/`merchant_suborder` (مفرد) في النثر والمخططات. لكن `docs/DATABASE.md §5` (Naming Conventions) يفرض: "أسماء الجداول: جمع، snake_case". **القرار هنا:** أسماء SQL الفعلية جمع (`customer_orders`, `merchant_suborders`) اتساقاً مع كل جدول قائم اليوم (`orders`, `products`, `merchants`...)، بينما تبقى الصياغة المفردة (`customer_order`/`merchant_suborder`) هي المصطلح المفاهيمي في النثر (كما وردت في التقرير)، لا تعارضاً — نفس الفارق الموجود أصلاً بين مصطلح "الطلب" ومسمّى جدول `orders`.

### 2.2 قرار بنيوي حاسم: جداول موازية جديدة، لا XOR على الجداول الحيّة

التقرير الأصلي (§8) اقترح: `order_items` "gains suborder_id FK **instead of/alongside** order_id" — خياران غامضان عمداً. رُوجعا هنا:

| الخيار | الوصف | القرار |
|---|---|---|
| (أ) XOR على `order_items`/`order_status_history` الحيّة | عمود `merchant_suborder_id` جديد `nullable` + قيد XOR مع `order_id` (نفس نمط `carts.user_id`/`session_token`، `ADR-008`) | **مرفوض** — يتطلب `ALTER COLUMN order_id DROP NOT NULL` على جدول مالي حي (`order_items`) وتعديل قيود `order_status_history` القائمة، يزيد مخاطرة على الـ184 اختباراً القائمة بلا داعٍ فعلي |
| (ب) جداول موازية جديدة كلياً (`merchant_suborder_items`, `merchant_suborder_status_history`) | نسخ طبق الأصل من شكل `order_items`/`order_status_history`، بعمود `merchant_suborder_id` بدل `order_id` | **معتمَد** — `CREATE TABLE` بحت، صفر `ALTER` على أي جدول مالي حي، صفر خطر على الاختبارات القائمة، يطابق حرفياً "ابنِ الجداول الجديدة إلى جانب القديمة" في التقرير |

**التبرير:** `merchant_suborder` "بديل مباشر (Drop-in) لصف `orders` الحالي" (خطة التنفيذ الرئيسية §2) — لا مجرد امتداد لجدول `orders` نفسه، بل **خليفة بنيوية كاملة الشكل** تحل محله في كل Checkout مستقبلي (راجع §8 لمسار الهجرة). "امتداد لا استبدال" هنا يعني على مستوى **النظام** (لا حذف لـ`orders` ولا لبياناته التاريخية)، لا `ALTER` حرفي على نفس الجدول.

### 2.3 `customer_orders`

```sql
create table customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  delivery_address jsonb not null,          -- نفس شكل orders.delivery_address ({line1, city, notes?})
  payment_method text not null default 'cash_on_delivery',
  subtotal_snapshot numeric(10,2) not null check (subtotal_snapshot >= 0),
  delivery_fee_snapshot numeric(10,2),      -- من delivery_quotes عند Checkout — راجع §5
  total_snapshot numeric(10,2) not null check (total_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table customer_orders enable row level security;
-- بلا أي policy — النمط 2 (FINANCIAL/TENANT_PRIVATE)، نفس نمط orders، وصول حصري عبر service_role
```

- **لا عمود `overall_status`.** راجع §3 — مُشتَق دوماً، غير مخزَّن، بنفس فلسفة `cart_items` بلا عمود سعر (`ADR-008`: يُحسَب حياً، لا يُخزَّن ليُكتَب لاحقاً).
- `subtotal_snapshot`/`total_snapshot` مُجمَّدان لحظة إنشاء `customer_order` — نفس فلسفة `order_items.unit_price_snapshot` (`ADR-009`): لا يُعاد حسابهما لاحقاً حتى لو تغيّر أي سعر منتج، **ولا حتى عند إلغاء جزئي** (راجع §4 — الإلغاء لا يُعدِّل `total_snapshot`، بل تُحسَب "القيمة المتبقية" حياً).
- `user_id` نفس هوية `orders.user_id` اليوم — بلا تغيير في `khalilService.findOrCreateCustomerByPhone` (`ADR-009`).

### 2.4 `merchant_suborders`

```sql
create table merchant_suborders (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null references customer_orders(id),  -- الحقل الجديد الوحيد فعلياً
  user_id uuid not null references users(id),        -- نفس orders.user_id — يبقى Drop-in كاملاً
  tenant_id uuid not null references merchants(id),  -- نفس orders.tenant_id، بلا تغيير
  status text not null default 'pending',            -- نفس orders.status — بلا تغيير
  settlement_model text not null                      -- جديد — راجع §7.3 للتبرير الكامل
    check (settlement_model in ('driver_fronted','reef_collected')),
  payment_method text not null default 'cash_on_delivery',
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table merchant_suborders
  add constraint merchant_suborders_status_check
  check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'));
  -- ⚠️ نفس القائمة السبعة حرفياً من ORDER_STATUSES (src/core/modules/orders/types.ts) — لا حالة جديدة،
  -- لا حالة محذوفة. أي تعديل مستقبلي على هذه القائمة يبدأ من types.ts أولاً (نفس قاعدة specs/orders/README.md).
alter table merchant_suborders enable row level security;
-- بلا أي policy — نفس نمط orders (ADR-009)، وصول حصري عبر service_role
create index merchant_suborders_customer_order_id_idx on merchant_suborders (customer_order_id);
create index merchant_suborders_tenant_id_idx on merchant_suborders (tenant_id);
```

**`status` يعيد استخدام `ORDER_TRANSITIONS`/`ORDER_TRANSITION_ACTORS` من `src/core/modules/orders/types.ts` حرفياً بلا أي تعديل** — نفس القيم السبع، نفس مصفوفة الانتقالات، نفس مصفوفة الفاعلين (`merchant_owner`/`merchant_manager`/`employee`/`platform_admin`). `assertActorCanAccessOrder` يعمل على صف `merchant_suborders` دون أي تعديل بنيوي — فقط اسم الجدول المستهدف في `*.repository.ts` يتغيّر (تفصيل تنفيذي، خارج هذا التصميم).

### 2.5 `merchant_suborder_items` (مرآة `order_items`)

```sql
create table merchant_suborder_items (
  id uuid primary key default gen_random_uuid(),
  merchant_suborder_id uuid not null references merchant_suborders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  selection jsonb not null default '{}'::jsonb,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  created_at timestamptz not null default now()
);
alter table merchant_suborder_items enable row level security;
create index merchant_suborder_items_suborder_id_idx on merchant_suborder_items (merchant_suborder_id);
```

نسخة طبق الأصل من `order_items` (نفس الأعمدة، نفس منطق التجميد `unit_price_snapshot`، `ADR-009`) — `order_id` استُبدل بـ`merchant_suborder_id` فقط.

### 2.6 `merchant_suborder_status_history` (مرآة `order_status_history`)

```sql
create table merchant_suborder_status_history (
  id uuid primary key default gen_random_uuid(),
  merchant_suborder_id uuid not null references merchant_suborders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_role text not null,
  actor_id uuid references users(id),
  note text,
  created_at timestamptz not null default now(),
  -- ⚠️ جديد، غير موجود على order_status_history اليوم — قرار معتمَد من المؤسس، راجع §4 و§10.1 بند 5
  constraint merchant_suborder_status_history_cancel_note_check
    check (to_status <> 'cancelled' or note is not null)
);
alter table merchant_suborder_status_history
  add constraint merchant_suborder_status_history_to_status_check
    check (to_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  add constraint merchant_suborder_status_history_from_status_check
    check (from_status is null or from_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  add constraint merchant_suborder_status_history_actor_role_check
    check (actor_role in ('platform_admin','merchant_owner','merchant_manager','employee','customer','system'));
alter table merchant_suborder_status_history enable row level security;
create index merchant_suborder_status_history_suborder_id_idx on merchant_suborder_status_history (merchant_suborder_id);
```

نفس بنية `order_status_history` (`ADR-010`) حرفياً، بإضافة واحدة فقط: قيد `note is not null` عند `to_status = 'cancelled'` — يخدم متطلب الإلغاء الجزئي المحاسبي (§4). **هذا قيد جديد لم يكن موجوداً على `order_status_history`** — **قرار معتمَد صراحة من المؤسس (§10.1 بند 5)**: سبب الإلغاء إلزامي دوماً على `merchant_suborder_status_history`، لا حسماً صامتاً ولا امتداداً تلقائياً لنمط `order_status_history` القديم (الذي يبقى بلا هذا القيد، بلا تغيير).

---

## 3. State Derivation Rules لـ `overall_status`

`overall_status` **ليس عموداً مخزَّناً** — دالة خدمة (`CustomerOrderService.getOverallStatus(customerOrderId)` أو ما يعادلها، تفصيل تسمية للتنفيذ) تقرأ `merchant_suborders.status` حياً في كل استدعاء، تماماً كما `CatalogService.calculatePrice()` يُحسَب حياً بدل تخزين سعر في `cart_items` (`ADR-008`). **لا كتابة مباشرة على هذا الحقل من أي فاعل أو Server Action — لأنه لا عمود إطلاقاً ليُكتَب.**

القيم الممكنة: نفس السبع قيم من `OrderStatus` (`pending`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`) — لا مفردات جديدة، تجنباً لقاموس حالات موازٍ.

**قاعدة الاشتقاق (Phase 3 — بلا `delivery_jobs` بعد، راجع ملاحظة التوسّع أسفل الجدول):**

| الشرط (يُفحَص بالترتيب، أول تطابق يفوز) | `overall_status` |
|---|---|
| كل `merchant_suborders` التابعة لهذا `customer_order` بحالة `cancelled` | `cancelled` |
| يوجد `merchant_suborder` واحد على الأقل غير ملغاة، **وكلها** (غير الملغاة) بحالة `delivered` | `delivered` |
| يوجد `merchant_suborder` واحدة على الأقل (غير ملغاة) بحالة `pending` | `pending` |
| وإلا، يوجد واحدة على الأقل بحالة `confirmed` | `confirmed` |
| وإلا، يوجد واحدة على الأقل بحالة `preparing` | `preparing` |
| وإلا، يوجد واحدة على الأقل بحالة `ready` | `ready` |
| وإلا (الباقي `out_for_delivery`، والبقية `delivered`) | `out_for_delivery` |

**المنطق:** "أضعف حلقة" (Weakest Link) بين التجار غير الملغاة — الطلب ككل لا يتقدّم في نظر العميل أسرع من أبطأ تاجر لم يُلغَ بعد. صفوف `cancelled` تُستبعَد من الحساب (لا تُبطئ البقية ولا تُسرِّعه) إلا إذا كانت **كل** الصفوف ملغاة، حيث يصبح `overall_status = cancelled` هو الانعكاس الصحيح الوحيد. هذا يحقق مباشرة قاعدة §1.1: "إلغاء suborder واحد لا يُلغي الطلب كله."

**ملاحظة توسّع صريحة لـ Phase 4 (`delivery_jobs`، §7 أدناه) — غير مُقرَّرة هنا:** بعد بناء `delivery_jobs`، يصبح مطروحاً أن يتفوّق `delivery_jobs.status` (لا `merchant_suborders.status` الفردية) على مقطع `out_for_delivery`/`delivered` تحديداً في هذا الاشتقاق — لأن التوصيل عملية واحدة موحَّدة عبر التجار المُجمَّعين، لا عملية منفصلة لكل تاجر. **هذا القرار مؤجَّل عمداً لتصميم Phase 4 نفسه** (راجع §10.2 بند 1 — يبقى مفتوحاً صراحةً) — القاعدة أعلاه صحيحة وكافية لـ Phase 3 وحدها (يجب أن تعمل `customer_orders`/`merchant_suborders` بشكل مستقل قبل وجود `delivery_jobs` أصلاً، وفق تسلسل Phase 3 → Phase 4 في خطة التنفيذ).

**"القيمة المتبقية" (`remaining_total`) — قيمة مُشتَقة أخرى، بنفس آلية `overall_status`:**
```
remaining_total = SUM(merchant_suborders.total) WHERE customer_order_id = X AND status <> 'cancelled'
```
غير مخزَّنة، تُحسَب حياً — تُستهلَك في §4.

---

## 4. الإلغاء الجزئي

**لا أعمدة جديدة على `merchant_suborders` نفسه مطلوبة.** كل عنصر يطلبه §1.1 (القيمة الأصلية، السبب، من ألغى، الوقت، القيمة المتبقية) موجود فعلاً أو مُشتَق:

| العنصر المطلوب | المصدر |
|---|---|
| القيمة الأصلية | `merchant_suborders.total` — **لا يُعدَّل أبداً بعد الإنشاء**، حتى عند الإلغاء (يبقى مجمَّداً، نفس فلسفة `unit_price_snapshot`) — القيمة الأصلية محفوظة تلقائياً بعدم لمسها إطلاقاً |
| السبب | `merchant_suborder_status_history.note` — **إلزامي** عند `to_status = 'cancelled'` (قيد `CHECK` جديد، §2.6) |
| من ألغى | `merchant_suborder_status_history.actor_id` + `actor_role` — موجودان فعلاً، بلا تغيير |
| الوقت | `merchant_suborder_status_history.created_at` — موجود فعلاً |
| القيمة المتبقية | `remaining_total` المُشتَقة (§3) — تُعاد حسابها حياً بعد كل إلغاء، لا تُخزَّن |

**الأثر المحاسبي (COD، بلا استرجاع مالي فعلي):** بما أن الدفع COD، "الأثر المحاسبي" هنا هو الأثر السلوكي/الدفتري فقط — `merchant_suborder` المُلغاة **لا تُحذَف** (بلا `DELETE` مطلقاً على هذا الجدول، نفس نمط بقية جداول Orders)، تبقى ظاهرة في `merchant_suborder_status_history` كسجل دائم ضمن تاريخ `customer_order`، ولا تُحتسَب في `remaining_total` ولا في `merchant_ledger_entries` المستقبلي (TASK-11 — راجع §7.3 لكيفية استهلاك `settlement_model` هناك).

**استرجاع المخزون (Inventory Restore) عند الإلغاء — تحقُّق حي من الكود أولاً، ثم القرار:**

فحص مباشر لـ`src/core/modules/orders/orders.service.ts` (لا افتراضاً) يُظهر أن استرجاع المخزون الموجود فعلياً اليوم (`InventoryService.release()` → `InventoryRepository.restore()`) **مُستدعًى في مكان واحد فقط**: داخل `performCheckout()`، كتعويض عند فشل خطوة **لاحقة لحجز مخزون ناجح ضمن نفس محاولة Checkout** (مثال: نجح حجز صنفين ثم فشل الدفع/إنشاء الطلب — يُعاد الصنفان فوراً). **هذا المسار لا علاقة له بإلغاء طلب مكتمل الإنشاء لاحقاً** — `transitionStatus()` (الدالة التي تنفّذ أي انتقال `* → cancelled` على طلب موجود فعلاً بعد نجاح Checkout) **لا تستدعي `InventoryService.release()` إطلاقاً اليوم**. بعبارة أخرى: **لا يوجد حالياً أي استرجاع مخزون عند إلغاء طلب `orders` قائم بعد إنشائه (تاجر يُلغي طلباً مؤكَّداً مثلاً) — هذه فجوة قائمة فعلاً في النظام الحالي**، لا افتراضاً وهمياً.

**القرار المعتمَد:** الآلية الذرّية نفسها (`InventoryRepository.restore(productId, quantity)`، غير مُعدَّلة، بلا أي منطق جديد على مستوى المخزون) تُستدعى الآن لكل صف في `merchant_suborder_items` عند نجاح انتقال `merchant_suborder` إلى `cancelled` — **وهذا يُغلِق الفجوة أعلاه للمسار الجديد تحديداً** (وصل جديد بين `transitionStatus()`/إلغاء `merchant_suborder` واستدعاء `restore()` لكل بند، لم يكن موجوداً في `orders` القديم). بما أن الجداول القديمة (`orders`/`order_items`) تتوقف عن استقبال صفوف جديدة بعد نقطة التحويل (§8) ولا تُستقبَل عليها إلغاءات مستقبلية أصلاً، الفجوة القديمة تصبح غير ذات أثر عملياً بدل أن تحتاج إصلاحاً رجعياً منفصلاً عليها.

**انتقال الحالة نفسه (`* → cancelled`) بلا تغيير على `ORDER_TRANSITIONS`/`ORDER_TRANSITION_ACTORS`** — نفس الفاعلين المخوَّلين اليوم (`merchant_owner`/`merchant_manager`/`employee`/`platform_admin`)، نفس القيد (من أي حالة غير نهائية). **لا صلاحية إلغاء للعميل نفسه** — هذا امتداد مباشر لسؤال مفتوح قائم أصلاً (`specs/orders/README.md` → Open Question 2)، لم يُحسم هنا، لا علاقة مباشرة له بالتصميم متعدد التجار.

---

## 5. `Delivery Quote`

```sql
create table delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null unique references customer_orders(id),  -- علاقة 1:1
  fee numeric(10,2) not null check (fee >= 0),
  pickup_point_count int not null check (pickup_point_count >= 1),
  consolidated boolean not null default false,
  computed_by text not null check (computed_by in ('manual','simple_rule')),
  created_at timestamptz not null default now()
);
alter table delivery_quotes enable row level security;
-- بلا أي policy — FINANCIAL، نفس النمط 2
```

- **لا خوارزمية حساب هنا** — `fee` قيمة نهائية فقط، تُدخَل يدوياً (`computed_by = 'manual'`) أو بقاعدة V1 بسيطة غير مُصمَّمة في هذه الوثيقة (`computed_by = 'simple_rule'`، تفاصيلها خارج النطاق). القيمة `'algorithm'` **محجوزة اسمياً لمستقبل غير مبني** — لا تُضاف لقائمة `CHECK` الآن (لا حاجة فعلية اليوم، تمنع الانطباع بأن خوارزمية حقيقية موجودة).
- `pickup_point_count`/`consolidated` بيانات وصفية لتفسير كيفية اشتقاق `fee` لاحقاً (تدقيق/تصحيح أخطاء) — **ليست مُدخَلات لحساب فعلي مبني هنا**.
- علاقة 1:1 مع `customer_order` (`UNIQUE`) — عرض واحد نهائي فقط لكل طلب في V1، لا نظام عروض متعددة/إعادة تسعير.
- عند Checkout، قيمة `delivery_quotes.fee` **تُجمَّد** في `customer_orders.delivery_fee_snapshot` (§2.3) — نفس نمط تجميد `unit_price_snapshot`، لا قراءة حية لاحقة لـ`delivery_quotes` عند عرض الطلب.
- **قرار معتمَد من المؤسس صراحة:** `delivery_fee_snapshot` يبقى **ثابتاً بعد أي إلغاء جزئي**، بلا إعادة حساب، حتى لو قلّ عدد التجار الفعليين المتبقين في `customer_order` (مثال: طلب لثلاثة تجار برسم توصيل مُجمَّع واحد، أُلغي أحدهم لاحقاً — رسم التوصيل المُجمَّد لا يتغيّر). نفس فلسفة تجميد `subtotal_snapshot`/`total_snapshot` (§2.3) بالضبط — لا حقل في `customer_orders` يُعاد حسابه بعد الإنشاء تحت أي ظرف، الإلغاء الجزئي يُعبَّر عنه حصراً عبر `remaining_total` المُشتَقة (§3/§4)، لا عبر تعديل أي Snapshot مجمَّد.

---

## 6. `merchant_staff`

```sql
create table merchant_staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references merchants(id),
  user_id uuid not null references users(id),  -- ⚠️ نفس جدول users الموحَّد — لا هوية منفصلة (§1.4)
  role text not null check (role in ('staff')),  -- قيمة واحدة فقط في V1 — راجع الملاحظة أسفل الجدول
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint merchant_staff_tenant_user_unique unique (tenant_id, user_id)
);
alter table merchant_staff enable row level security;
create index merchant_staff_tenant_id_idx on merchant_staff (tenant_id);
-- بلا أي policy — AUTH_SECRET/TENANT_PRIVATE، النمط 2
```

**قرار معتمَد من المؤسس (§10.1 بند 1):** **لا** يُنشأ صف `merchant_staff` بدور `owner` إطلاقاً — `merchants.owner_id`/`users.role = 'merchant_owner'` يبقيان المصدر الرسمي الوحيد لصلاحية `owner`، بلا تغيير. `merchant_staff` مقتصر فعلياً وبنيوياً على صفوف `'staff'` فقط في V1 — لذلك `role` أعلاه أصبح قيداً بقيمة واحدة (`CHECK (role in ('staff'))`) بدل `('owner','staff')` في المسودة السابقة، والفهرس الجزئي `merchant_staff_one_owner_per_tenant_uidx` (كان مصمَّماً لضمان مالك واحد فقط لكل تاجر) **أُزيل بالكامل** — كان سيبقى قيداً ميتاً لا يُفعَّل أبداً بما أن لا صف `owner` يُنشأ أصلاً. عمود `role` أُبقي (بدل حذفه) عمداً كنقطة توسّع مستقبلية آمنة (`CHECK` يتّسع لاحقاً بقيمة إضافية بلا تغيير اسم العمود، إن احتاج المؤسس تدرّج صلاحية أدق من "دوران فقط" يوماً ما) — لا استخدام فعلي لهذا التوسّع في V1.

**ملاحظة فهرسة (`merchant_staff_tenant_id_idx`):** بنفس ملاحظة `drivers.office_id` أعلاه — القيد الفريد المركَّب `merchant_staff_tenant_user_unique (tenant_id, user_id)` يُغطّي تقنياً استعلامات `WHERE tenant_id = ...` وحدها بالفعل (`tenant_id` هو العمود الأول). يُضاف الفهرس المنفصل هنا استجابة للطلب الصريح لوضوح التوثيق، لا لحاجة أداء غائبة فعلياً.

### 6.1 الدوران، بدقة

- **`owner`:** كل الصلاحيات — مطابق تماماً لما يملكه `merchants.owner_id` اليوم (لا صلاحية إضافية، لا صلاحية منقوصة).
- **`staff`:** يرى طلبات تاجره، يغيّر حالة `merchant_suborder` عبر دورة التجهيز فقط (`pending→confirmed→preparing→ready`، بموجب `ORDER_TRANSITIONS` القائمة بلا تعديل) — **لا** تعديل عمولة، **لا** تعديل بيانات الشركة، **لا** إضافة مستخدمين آخرين. القيد الأخير (لا يضيف موظفين) يعني: لا صف `merchant_staff` جديد يُنشَأ إلا بفعل `owner` (تفصيل تخويل تنفيذي، خارج هذه الوثيقة).

### 6.2 مطابقة صريحة مع `users.role` الموجود (حرج — راجع §0 بند 6)

`users.role` يحمل اليوم (`docs/DATABASE.md §3`) القيم: `platform_admin`, `merchant_owner`, `merchant_manager`, `employee`, `customer` — القيمتان `merchant_manager`/`employee` **موجودتان في القيد فعلياً لكن بلا أي مستهلك كود** (التقرير الهندسي §12: "pure schema placeholders"). `merchant_staff.role` **مفهوم مختلف تماماً**، محلي لنطاق التاجر (صلاحية دقيقة داخل تاجر واحد)، لا نسخة مكررة من `users.role` العالمي (تصريح هوية/دخول عبر النظام كله). **الفرق موضَّح صراحة هنا لتفادي الالتباس:**

- `users.role` — يبقى **العالمي**، يُستهلَك في `sessions.role`/`OrderActorRole`/`ORDER_TRANSITION_ACTORS` (آلة حالة الطلب نفسها، بلا تعديل).
- `merchant_staff.role` — **محلي**، يُستهلَك مستقبلاً في واجهة بوابة التاجر فقط (مثال: إخفاء زر "تعديل السعر" عن `staff`)، لا في `transitionStatus()` نفسها.
- **الربط المعتمَد بينهما:** عضو `merchant_staff` بدور `'staff'` يحمل `users.role = 'employee'` — **إعادة استخدام القيمة الموجودة فعلاً وغير المُستهلَكة اليوم**، بدل اختراع قيمة جديدة تتعارض مع `users.role` القائم (يحقق مباشرة تحذير §0 بند 6: "لا تخترع أسماء تتعارض مع الموجود"). القيمة `merchant_manager` **تبقى غير مُستهلَكة بهذا التصميم** — محجوزة لتدرّج صلاحية مستقبلي محتمل، خارج نطاق V1 المبسَّط (دوران فقط). هذا يعني أن `ORDER_TRANSITION_ACTORS` (التي تتضمن `'employee'` أصلاً ضمن `MERCHANT_OR_ADMIN`) **تعمل بلا أي تعديل** لحظة إنشاء أول عضو `staff` فعلي.
- **`owner` لا يحصل على صف `merchant_staff` — قرار معتمَد نهائياً (§10.1 بند 1، كان `OPEN_QUESTION` قبل هذه المراجعة).** `merchants.owner_id`/`users.role = 'merchant_owner'` يبقيان المصدر الرسمي **الوحيد** لصلاحية `owner`، بلا تغيير وبلا صف مقابل في `merchant_staff`. الجدول مقتصر بنيوياً على صفوف `'staff'` فقط (`role` أصبح `CHECK (role in ('staff'))`، §6 أعلاه) — لا "عرض فريق موحَّد يشمل المالك" في V1؛ أي واجهة مستقبلية تحتاج عرض المالك ضمن "فريق التاجر" تجمع بين `merchants.owner_id` و`merchant_staff` كمصدرين منفصلين عند العرض، لا مصدراً واحداً.

### 6.3 سجل تدقيق تحديثات الحالة من موظف

"كل تحديث حالة `suborder` من موظف يُسجَّل باسمه" — **مُحقَّق بالفعل بلا أي إضافة**: `merchant_suborder_status_history.actor_id`/`actor_role` (§2.6) يُسجِّلان هذا تلقائياً لأي فاعل، موظفاً كان أو مالكاً — لا حاجة لآلية Audit منفصلة (يطابق "سطر Audit بسيط، لا نظام كامل" في §1.2).

---

## 7. مكتب الدليفري المبسَّط

### 7.1 العلاقة الهرمية (شركة ← سائقون)

```sql
create table delivery_offices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),  -- نفس نمط merchants.owner_id حرفياً
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table delivery_offices enable row level security;
-- بلا أي policy — النمط 2 (نفس merchants)

create table drivers (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references delivery_offices(id),
  user_id uuid not null references users(id),  -- ⚠️ نفس جدول users الموحَّد (§1.4)
  is_active boolean not null default true,      -- عضوية نشطة، لا "متاح الآن" لحظياً — راجع §9
  created_at timestamptz not null default now(),
  constraint drivers_office_user_unique unique (office_id, user_id)
);
alter table drivers enable row level security;
create index drivers_office_id_idx on drivers (office_id);
```

**ملاحظة فهرسة:** `drivers_office_id_idx` مطلوب صراحة (تعديل المؤسس بعد المراجعة). تقنياً، القيد الفريد المركَّب `drivers_office_user_unique (office_id, user_id)` يُغطّي بالفعل استعلامات `WHERE office_id = ...` وحدها (لأن `office_id` هو العمود الأول في الفهرس المركَّب الذي يُنشئه Postgres تلقائياً خلف أي `UNIQUE` مركَّب) — فهرس منفصل هنا تقنياً زائد (Redundant) لا يضيف قدرة استعلام جديدة. يُضاف رغم ذلك بناءً على الطلب الصريح، لوضوح النية التوثيقية لا لحاجة أداء فعلية غائبة.

**التبرير:** نفس شكل `merchants.owner_id`/`users.role` بالضبط، كما يطلب `DIWAN_VISION.md → Addendum 4(ب)` حرفياً ("نفس شكل علاقة merchants.owner_id/users.role الحالي من حيث المبدأ، لا نمط جديد مخترَع"). سلسبيل تتعاقد مع الشركة (`delivery_offices`) كجهة واحدة (`owner_id`) — لا مع كل سائق فردياً، تماماً كما وثّق ذلك الـAddendum.

**`users.role` يحتاج قيمة جديدة فعلياً — `'driver'`:** خلافاً لـ`merchant_staff` (حيث أُعيد استخدام `'employee'` الموجودة)، لا قيمة قائمة في `users.role` تصف سائقاً. هذه إضافة **حقيقية وضرورية** لقيد `CHECK` على `users.role` (`ALTER TABLE ... ADD ... CHECK` جديد يشمل القيم القديمة + `'driver'` — إضافي بحت، لا يكسر أي صف قائم). لا تعارض تسمية — `'driver'` غير مُستخدَمة لأي معنى آخر في المشروع اليوم.

### 7.2 `delivery_jobs`

```sql
create table delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null references customer_orders(id),  -- نطاق واحد لكل عميل، لا تجميع عبر عملاء — قرار معتمَد (§10.1 بند 4)
  office_id uuid references delivery_offices(id),   -- nullable حتى الإسناد
  driver_id uuid references drivers(id),             -- nullable حتى الإسناد اليدوي
  status text not null default 'ready_for_pickup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table delivery_jobs
  add constraint delivery_jobs_status_check
  check (status in ('ready_for_pickup','driver_assigned','picking_up','out_for_delivery','delivered','failed'));
alter table delivery_jobs enable row level security;
create index delivery_jobs_customer_order_id_idx on delivery_jobs (customer_order_id);

create table delivery_job_suborders (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references delivery_jobs(id) on delete cascade,
  merchant_suborder_id uuid not null references merchant_suborders(id),
  constraint delivery_job_suborders_unique unique (delivery_job_id, merchant_suborder_id)
);
alter table delivery_job_suborders enable row level security;
create index delivery_job_suborders_merchant_suborder_id_idx on delivery_job_suborders (merchant_suborder_id);
```

`delivery_jobs_customer_order_id_idx` ضروري فعلياً (لا فهرس مركَّب يُغطّيه ضمنياً) — يُستهلَك في أي استعلام "هل لهذا الطلب رحلة توصيل بالفعل؟" عند محاولة إنشاء `delivery_job` جديد. `delivery_job_suborders_merchant_suborder_id_idx` ضروري أيضاً: القيد الفريد المركَّب `(delivery_job_id, merchant_suborder_id)` يُغطّي `delivery_job_id` وحده فقط (العمود الأول)، لا `merchant_suborder_id` وحده — والاستعلام العكسي ("أي `delivery_job` يخدم هذا الـ`merchant_suborder` بالذات؟") يحتاج فهرساً مستقلاً فعلياً، بخلاف حالة `drivers.office_id` أعلاه.

**⚠️ تحذير تسمية صريح — القيمتان `'out_for_delivery'`/`'delivered'` في `delivery_jobs.status` تتطابقان لفظياً مع قيمتين في `merchant_suborders.status`، لكنهما عمودان/جدولان منفصلان تماماً بلا أي FK مباشر بينهما على مستوى القيمة نفسها.** `delivery_jobs.status` يتتبّع **رحلة التوصيل الفعلية** (مندوب واحد، جولة استلام/تسليم واحدة، قد تُجمِّع أكثر من `merchant_suborder`)؛ `merchant_suborders.status` يتتبّع **دورة تجهيز التاجر** (قابلة للتغيير من طرف التاجر وحده، بلا معرفة بوجود سائق من الأساس). **العلاقة بين الاثنين (هل تقدّم `delivery_jobs.status` يُحدِّث `merchant_suborders.status` تلقائياً؟) `OPEN_QUESTION` صريح — §10.2 بند 1.**

**آلية إنشاء `delivery_jobs` تلقائياً (طابور بسيط، بلا خوارزمية):** صف `delivery_jobs` جديد (`status='ready_for_pickup'`) يُنشَأ آلياً بالضبط في اللحظة التي يصل فيها `overall_status` المُشتَق (§3) لحالة "كل `merchant_suborders` غير الملغاة بحالة `ready`" — نفس شرط الاشتقاق المُعرَّف أصلاً، لا منطق جديد موازٍ. **دمج كل `merchant_suborders` غير الملغاة في `delivery_job` واحد بشكل افتراضي (تجميع كامل تلقائي)** — لا تقسيم ذكي، مطابقاً لِـ"لا خوارزمية توزيع" (§1.3). الجدول (`delivery_job_suborders`، علاقة Many-to-Many حقيقية لا مصفوفة JSONB — نفس نمط `post_products`، `ADR-021`) يسمح بنياً بتقسيم يدوي مستقبلي بلا إعادة تصميم، **لكن هذا التقسيم نفسه غير مبني هنا** (`ما لا نبنيه الآن`، §9).

**الإسناد يدوي بالكامل:** `office_id`/`driver_id` يبقيان `null` حتى فعل إداري صريح (لمسة زر) يعيّنهما — **لا عرض تلقائي لعدة سائقين مرشَّحين، لا خوارزمية ترشيح**.

### 7.3 `settlement_model` — الموقع المعماري والتبرير

**القرار: `settlement_model` عمود على `merchant_suborders` (§2.4)، **ليس** على `delivery_jobs`، وهو **بيانات مستقلة لا مُشتَقة**.**

**لماذا `merchant_suborders` لا `delivery_jobs`:**
1. **من يملك الحقيقة التشغيلية:** `settlement_model` يصف **علاقة مالية تعاقدية بين ريف والتاجر تحديداً** (هل ريف تثق بهذا التاجر بما يكفي ليستلم السائق تحصيله كاملاً دون تسليمه لمكتب ريف، أم لا) — قرار تجاري على مستوى التاجر، لا على مستوى رحلة توصيل بعينها أو سائق بعينه.
2. **حجة حاسمة: `delivery_job` واحد قد يُجمِّع `merchant_suborders` من أكثر من تاجر (§7.2)، وكل تاجر قد يملك `settlement_model` مختلفاً عن الآخر في نفس رحلة السائق الواحدة.** لو وُضع الحقل على `delivery_jobs` (قيمة واحدة لكل الرحلة)، يستحيل تمثيل حالة واقعية شائعة: سائق واحد يستلم من تاجرين، أحدهما "يُسلِّم تحصيله" (fronted) والآخر "يُسلِّم لريف" (collected)، في نفس الجولة. وضعه على `merchant_suborders` يحل هذا بنيوياً — السائق (أو تطبيقه لاحقاً) يقرأ `settlement_model` لكل `merchant_suborder` ضمن `delivery_job_suborders` على حدة.
3. **ليس مُشتَقاً:** لا يوجد عمود آخر في النظام يمكن اشتقاق هذه القيمة منه حياً (بخلاف `overall_status`) — هو قرار عمل مُدخَل مسبقاً، لا نتيجة حساب.

**مصدر القيمة — معتمَد (§10.1 بند 3، كان `OPEN_QUESTION` قبل هذه المراجعة):** عمود جديد `merchants.default_settlement_model` (`nullable`, إضافة `ADD COLUMN` آمنة على جدول حي، نفس نمط `ADR-018`/`ADR-019`) يُحدَّد لكل تاجر عند تفعيله، ثم يُنسَخ (يُجمَّد) في `merchant_suborders.settlement_model` لحظة إنشاء كل `suborder` — نفس نمط تجميد `unit_price_snapshot`. ربطه المستقبلي المحتمل بمفهوم درجات الثقة (`TrustTier`، `CONSTITUTION §29.2`) يبقى تصميماً غير مبني هنا، خارج نطاق V1.

### 7.4 كيف يُستهلَك `settlement_model` في `merchant_ledger_entries` المستقبلي (TASK-11) بلا إعادة تصميم

`merchant_ledger_entries` (مذكور في التقرير §11، `PROPOSED` صراحة، **غير مُصمَّم بالتفصيل هنا**) يُتوقَّع أن يُملأ عند وصول `merchant_suborder` لحالة `delivered` نهائية. `settlement_model` **يُغيِّر سلوك منطق الملء، لا شكل الجدول نفسه**:

```
عند merchant_suborder.status → 'delivered':
  إن settlement_model = 'reef_collected':
      يُكتَب صفّان: (صافي التاجر) + (عمولة المنصة) — نفس نموذج §11 في التقرير الأصلي
  إن settlement_model = 'driver_fronted':
      يُكتَب صف واحد فقط: (عمولة المنصة) — التاجر استلم صافيه فعلياً من السائق وقت التسليم مباشرة،
      لا "تسوية" من ريف له لاحقاً
```

`merchant_ledger_entries.type` (`sale | commission | adjustment | payout`، من التقرير §11) **يكفي بشكله الحالي المقترَح** لتمثيل الفرق — لا عمود جديد على الدفتر نفسه، فقط فرع منطقي في الخدمة التي تملأه لاحقاً (TASK-11).

---

## 8. مسار الهجرة من الوضع الحالي

1. **إنشاء الجداول الجديدة بالكامل** (§2, §5, §6, §7) — `CREATE TABLE` بحت، صفر `ALTER` على أي جدول يحمل بيانات حية اليوم، **باستثناءين إضافيين صغيرين وآمنين فقط**:
   - `ALTER TABLE users` — توسيع قيد `role` ليشمل `'driver'` (إضافي، القيم القديمة لا تتأثر).
   - `ALTER TABLE merchants ADD COLUMN default_settlement_model` (`nullable`).
2. **RLS:** كل جدول جديد يُقفَل بالكامل (النمط 2) بلا أي `policy` — وصول حصري عبر `service_role`، مطابقاً لتصنيف `FINANCIAL`/`TENANT_PRIVATE`/`AUTH_SECRET` لكل جدول (مفصَّل أعلاه بجانب كل تعريف).
3. **تحويل مسار Checkout (تفصيل TASK-12، غير مُنفَّذ هنا):** `orders.service.ts.checkout()` يتحوّل من "رفض أي سلة بأكثر من `tenant_id`" (`ADR-009`) إلى "تجميع بنود السلة حسب `tenant_id`، إنشاء `customer_order` واحد + `merchant_suborder` واحدة أو أكثر". **هذا ينطبق على كل عملية Checkout بعد التحويل، تاجراً واحداً كان أم أكثر** — لا مسارين دائمين (لا "قديم لتاجر واحد" + "جديد لعدة تجار" إلى الأبد)، تفادياً لبناء نظامين متوازيين بشكل دائم.
4. **الجداول القديمة (`orders`/`order_items`/`order_status_history`) تتوقف عن استقبال صفوف جديدة بعد نقطة التحويل** — تبقى للقراءة التاريخية فقط (طلبات موجودة فعلاً قبل التحويل، بما فيها حسابات الاختبار الحية الموثَّقة في `docs/DATABASE.md §3`). **قرار معتمَد من المؤسس (§10.1 بند 2): لا `Migration` بيانات إطلاقاً من الجداول القديمة للجديدة** — تبقى مؤرشفة بشكلها الحالي للأبد، بلا أي سكربت هجرة.
5. **رابط تتبّع العميل الضيف (`/order/[id]`)** يحتاج قراراً لاحقاً هل يشير لـ`customer_order.id` أم يبقى مزدوجاً — تفصيل تنفيذي لـTASK-12، غير محسوم هنا.
6. **بوابة الإغلاق (من خطة التنفيذ الرئيسية):** اختبار تكامل جديد يماثل اختبار الرفض القديم لـ`ADR-009` لكن يُثبت النجاح بدل الرفض — يبقى شرط TASK-12، لا جزءاً من هذه الوثيقة.

---

## 9. ما لا نبنيه الآن (صراحةً)

- خوارزمية توزيع/ترشيح سائقين، Driver Match Score، Fair Matching Engine (`CONSTITUTION §29.3`) — أي تسجيل نقاط أو ترجيح تلقائي للسائقين.
- تتبّع موقع/حضور السائق اللحظي (Real-time Presence) — `drivers.is_active` عضوية فقط، لا "متاح الآن".
- تطبيق سائق منفصل معقّد أو خرائط تفاعلية.
- تقسيم/فصل ذكي لـ`delivery_job_suborders` (خوارزمية تجميع/فصل حسب المسار) — البنية (`delivery_job_suborders`) تسمح به لاحقاً، لا تُنفِّذه.
- تجميع `delivery_jobs` عبر أكثر من `customer_order` (سوق برق المفتوح، `CONSTITUTION §28.2`) — خارج نطاق V1 صراحة (خطة التنفيذ الرئيسية §6).
- `merchant_ledger_entries` بتصميمها الكامل (TASK-11) — فقط استهلاكها لـ`settlement_model` وُضِّح هنا (§7.4).
- صلاحيات أدق من `owner`/`staff` (لا تدرّج، لا صلاحيات مخصَّصة لكل موظف) — ولا تفعيل `merchant_manager` في `users.role`.
- واجهة تبديل الشخصية الكاملة أو عالم "أعمال" في `worlds` (`DIWAN_VISION.md`) — شركة الدليفري هنا كيان `delivery_offices` مستقل قائم بذاته، **لا** `user_persona` فعلية كما تصف الرؤية بعيدة المدى (`Addendum 4ب`) — ذلك يبقى `VISIONARY`، غير مبني.
- خوارزمية حساب فعلية لـ`Delivery Quote.fee` (`computed_by = 'simple_rule'` مذكورة اسمياً فقط، غير مُصمَّمة).
- حسم Addendum 5 (الفرع مقابل Tenant منفصل، `DIWAN_VISION.md`) — يبقى `OPEN_QUESTION` هناك كما هو.
- أي `Migration` بيانات فعلية لطلبات `orders` القديمة إلى الشكل الجديد.

---

## 10. القرارات المعتمَدة والأسئلة المتبقية

> راجعة 2026-09-15: المؤسس اعتمد التصميم من حيث المبدأ وحسم خمسة من الأسئلة السبعة المفتوحة أصلاً في هذا القسم صراحة. البنود أدناه مُعاد تنظيمها بناءً على ذلك — §10.1 قرارات نهائية (لم تعد أسئلة)، §10.2 يبقى مفتوحاً صراحةً.

### 10.1 قرارات معتمَدة (كانت أسئلة مفتوحة، حُسمت في هذه المراجعة)

1. **مصدر صلاحية `owner` (كان بند 1):** **لا** يُنشأ صف `merchant_staff(role='owner')`. `merchants.owner_id`/`users.role='merchant_owner'` يبقيان المصدر الرسمي الوحيد لصلاحية `owner`. `merchant_staff` مقتصر فعلياً وبنيوياً على صفوف `'staff'` فقط في V1 (§6، §6.2) — الفهرس الجزئي `merchant_staff_one_owner_per_tenant_uidx` المقترَح سابقاً **أُزيل** من التصميم (كان سيبقى قيداً ميتاً).
2. **هجرة البيانات القديمة (كان بند 3):** **لا هجرة بيانات إطلاقاً.** الجداول القديمة (`orders`/`order_items`/`order_status_history`) تبقى للقراءة التاريخية فقط بعد نقطة التحويل (§8 بند 4)، بلا أي سكربت هجرة لشكل `merchant_suborders` الجديد.
3. **مصدر `settlement_model` (كان بند 4):** معتمَد كما اقتُرح — `merchants.default_settlement_model` (عمود جديد، `nullable`) هو المصدر، يُجمَّد في `merchant_suborders.settlement_model` وقت إنشاء كل `suborder` (§7.3).
4. **نطاق `delivery_job` (كان بند 5):** معتمَد كما صُمِّم — `delivery_job` واحد يخدم `customer_order` واحداً فقط، بلا تجميع رحلات عبر عملاء مختلفين (§7.2).
5. **إلزامية `note` عند الإلغاء (كان بند 6):** معتمَد — قيد `note is not null` عند `to_status = 'cancelled'` على `merchant_suborder_status_history` يبقى كما صُمِّم؛ سبب الإلغاء إلزامي دوماً لهذا الجدول تحديداً (§2.6، §4). **لا يُطبَّق بأثر رجعي على `order_status_history` القديم** — ذلك الجدول يبقى بلا هذا القيد، بلا تغيير.

### 10.2 أسئلة تبقى مفتوحة صراحةً (لمرحلة لاحقة)

1. **(كان بند 2) بعد بناء `delivery_jobs` (Phase 4)، من يملك مقطع `out_for_delivery`/`delivered` في اشتقاق `overall_status`: `merchant_suborders.status` (كما اليوم، دون تعديل) أم `delivery_jobs.status`؟** وهل تقدّم `delivery_jobs.status` يُحدِّث `merchant_suborders.status` تلقائياً (وبأي `actorRole` — يتطلب إضافة على `ORDER_TRANSITION_ACTORS` لم تُصمَّم هنا)، أم يبقى الانتقال يدوياً من التاجر/الإدارة كما اليوم بلا علاقة؟ — هذا امتداد مباشر لسؤال مفتوح قائم أصلاً (`specs/orders/README.md` → Open Question 1)، الآن أكثر تحديداً بعد تصميم `delivery_jobs` (§3، §7.2). **قرار تصميم Phase 4 نفسها — لا يُحسم هنا صراحةً بطلب المؤسس.**
2. **(كان بند 7) Addendum 5 (`DIWAN_VISION.md`) — الفرع مقابل Tenant منفصل** — إن رغب تاجر واحد مستقبلاً بتشغيل أكثر من "فرع" كـ`merchant_suborders` منفصلة ضمن نفس `customer_order` (بدل تاجر واحد فعلي)، هذا التصميم لا يحسم تلك العلاقة — يبقى `OPEN_QUESTION` في مصدره الأصلي (`DIWAN_VISION.md → Addendum 5`) كما هو، غير مؤثر على هذا التصميم، مذكور هنا فقط للربط المرجعي.

---

*نهاية الوثيقة — راجع §7 من `AGENTS.md` (STOP CONDITION أعلى هذه المهمة) قبل أي خطوة تالية.*
