---
title: سجل القرارات المعمارية (Decision Log / ADR Index)
status: ACTIVE
version: 1.11
last_updated: 2026-09-04
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف
---

# سجل القرارات المعمارية (ADRs)

---

## ADR-001
```
Title: اعتماد Core + Domains (Modular Monolith) بدل Microservices
Status: ACCEPTED
Date: (ضمن جلسات بناء الدستور، قبل 2026-09-01)
Decision: بناء تطبيق واحد بحدود نطاقات صارمة داخلياً، مع سجل أحداث مركزي مستقبلي، بدل خدمات مصغّرة منفصلة شبكياً.
Context: فريق واحد (المؤسس + Claude)، حاجة للسرعة والبساطة في المرحلة الأولى.
Alternatives: Microservices من البداية
Why: تعقيد التوزيع (network calls, distributed transactions) يبطئ الوصول لأول عميل حقيقي دون فائدة فعلية بحجم الفريق الحالي.
Consequences: حدود النطاقات يجب أن تُحترَم بصرامة الآن لتبقى إمكانية الفصل لاحقاً مفتوحة.
Related Documents: docs/ARCHITECTURE.md §1
```

## ADR-002
```
Title: TypeScript + Next.js + Supabase كمكدس المرحلة الأولى، Rust/Elixir مؤجَّلان
Status: ACCEPTED
Date: (ضمن جلسات بناء الدستور)
Decision: كل الكود الحالي TypeScript. Rust للأداء/أمان الذاكرة مؤجَّل لـ Phase 2 (نضج تيسير). Elixir/Erlang (BEAM) مؤجَّل لـ Phase 3 (موثوقية QNX لنبض).
Context: المؤسس غير مبرمج، ميزانية محدودة، حاجة لبناء سريع بأقل تعقيد ممكن.
Alternatives: البدء بـ Rust أو Elixir مباشرة نظراً لأهداف الموثوقية بعيدة المدى
Why: تعقيد تعلّم لغة جديدة الآن يبطئ الوصول لأول عميل حقيقي دون مبرر — لا حاجة فعلية للأداء/الموثوقية القصوى في مرحلة Vertical Slice.
Consequences: يجب عدم افتراض أن اختيار TypeScript يلغي الخطة المستقبلية — أي أداة تنفيذ يجب أن تعرف هذا (راجع AGENTS.md).
Related Documents: SALSABIL_CONSTITUTION.md §27.2, docs/ARCHITECTURE.md §6
```

## ADR-003
```
Title: Claude Pro + Claude Code بدل Cursor Pro
Status: ACCEPTED
Date: (ضمن جلسات بناء الدستور)
Decision: استخدام Claude Pro ($20/شهر، يشمل Claude Code) كأداة التنفيذ اليومية، بدل Cursor Pro.
Context: ميزانية 20 دولار فقط بلا هامش إضافي، حاجة لأداة متسقة مع الجهة المخططة للمعمارية (Claude نفسه).
Alternatives: Cursor Pro (بحصة نقدية $20 لاستخدام نماذج قوية، ~225 طلب Sonnet تقريباً)
Why: مخاطرة نفاد حصة Cursor النقدية خلال مشروع مكثف (نواة + 3 بوابات) على ميزانية بلا هامش أعلى من مخاطرة سقف Claude Pro الزمني المتجدد.
Consequences: —
Related Documents: SALSABIL_CONSTITUTION.md §22
```

## ADR-004
```
Title: خيارات المنتج المرنة عبر JSONB بدل أعمدة ثابتة أو EAV كامل
Status: ACCEPTED
Date: 2026-08-31 (اليوم 3 من خطة الـ14 يوماً)
Decision: عمود products.options من نوع JSONB، مع فرض الشكل الصارم (SizeOption/AddonOption) على مستوى TypeScript فقط، لا على مستوى قاعدة البيانات.
Context: بناء محرك المنتج يوم 3، الحاجة لدعم دواجن بأحجام ولحوم بإضافات وبقالة بسيطة في نفس الجدول دون Migration جديد لكل نوع.
Alternatives: (أ) أعمدة ثابتة لكل حالة محتملة، (ب) EAV كامل (جدول خاصية منفصل)
Why: (أ) ينهار لأول منتج مختلف الشكل. (ب) معقد وبطيء للاستعلام، يخالف مبدأ "لا تبني ERP الآن".
Consequences: يتطلب انضباطاً صارماً في TypeScript لمنع بيانات JSONB غير متسقة الشكل — لا حماية بنيوية من قاعدة البيانات نفسها.
Related Documents: docs/PRODUCT_ENGINE.md §2, docs/DATABASE.md §3
```

## ADR-005
```
Title: توثيق قاعدة اتجاه الاعتماد (Dependency Direction) صراحة
Status: ACCEPTED (كانت PROPOSED منذ 2026-09-01 — اعتُمدت فعلياً عند طلب المؤسس فرضها آلياً، اليوم 9، راجع ADR-011)
Date: 2026-09-01 (اقتراح) → 2026-09-02 (اعتماد فعلي)
Decision: توثيق رسمي لقاعدة: components → service → repository → supabase-client (اتجاه واحد فقط، لا عكس).
Context: هذه القاعدة مُطبَّقة فعلياً في الكود (khalil، catalog) لكنها لم تُكتب كقاعدة صريحة في أي مكان قبل الآن — استُنتجت من النمط الفعلي (INFERRED) أثناء بناء docs/ARCHITECTURE.md.
Alternatives: تركها ضمنية (خطر: قد ينتهكها Claude Code مستقبلاً دون قاعدة مكتوبة يستشهد بها)
Why: توضيح صريح يمنع أي انحراف مستقبلي، ويتوافق مع طلب المؤسس بعدم ترك أي قاعدة "مفهومة ضمنياً" فقط. اعتُمدت رسمياً حين طلب المؤسس بناء فاحص آلي (dependency-cruiser) يفرضها — طلب الفرض الآلي هو اعتماد ضمني للقاعدة نفسها.
Consequences: لا شيء سلبي متوقَّع — توثيق لواقع قائم فعلاً. أصبحت الآن مفروضة آلياً لا توثيقية فقط — راجع ADR-011.
Related Documents: docs/ARCHITECTURE.md §3, §3.1، ADR-011
```

## ADR-006 (⚠️ مُعاد بناؤه — يحتاج تحقق المؤسس، راجع الملاحظة أدناه)
```
Title: طابع ريف المدينة البصري الفعلي — Glass Morphism + أخضر/برتقالي في واجهة Storefront (Next.js 16)
Status: IMPLEMENTED (حسب تقرير المؤسس)
Date: 2026-09-01 (اليوم 4-5 من خطة الـ14 يوماً)
Decision: بناء واجهة متجر ريف المدينة (Reef City Storefront) بـ Next.js 16، معتمدة القيم الموروثة من CONSTITUTION §21: أخضر أساسي #2D6A4F، برتقالي ثانوي #F4845F، بطابع Glass Morphism/iOS.
Context: تنفيذ اليوم الرابع (بوابة التاجر) والخامس (واجهة العميل) عبر Claude Code، commit 2de9345.
Alternatives: تأجيل حسم الألوان الدقيقة لما بعد اليوم 7 كما كان مخطَّطاً أصلاً في docs/UI_UX_SYSTEM.md §2 (الوضع قبل هذا القرار)
Why: البدء الفعلي بواجهة ريف تطلّب قيماً حقيقية الآن، فاعتُمدت قيم §21 المرجعية كما هي بدل اختراع قيم جديدة.
Consequences: هذه القيم أصبحت الآن IMPLEMENTED في الكود لا PROPOSED فقط — أي تعديل عليها لاحقاً "تغيير كود قائم" لا "حسم أول". راجع docs/UI_UX_SYSTEM.md §2 و§8.4 (قسم ريف).
Related Documents: docs/UI_UX_SYSTEM.md §2, §8.4، SALSABIL_CONSTITUTION.md §21

⚠️ ملاحظة توثيقية (Documentation Debt): المؤسس أشار في محادثة 2026-09-01 إلى أن قرار الألوان هذا سُجِّل مسبقاً كـ"ADR-006" أثناء عمل Claude Code على اليوم 4-5. لم يكن هذا الـ ADR موجوداً في نسخة docs/DECISIONS.md الخاصة بهذا المشروع (Claude Project) قبل هذا التحديث — تمت إعادة بنائه هنا من وصف المؤسس الموجز فقط، لا من نص ADR الأصلي (إن وُجد داخل المستودع نفسه). **يُرجى مطابقته مع أي ADR-006 فعلي داخل الكود/المستودع وتصحيح أي تفصيل مختلف هنا.** هذا مثال حي على فجوة مزامنة بين "ما يسجّله Claude Code داخل المستودع" و"ما يظهر في Project Knowledge" — يستحق قاعدة مزامنة صريحة مستقبلاً.
```

## ADR-007 (PROPOSED — يحتاج موافقة المؤسس)
```
Title: معمارية CSS Variables ثنائية الطبقة (Primitive + Semantic) للثيمات متعددة العوالم
Status: PROPOSED
Date: 2026-09-01
Decision المقترح: اعتماد طبقتين من الـ Design Tokens — (1) Primitive Tokens خام خاصة بكل عالم، غير مستخدمة مباشرة في أي مكوّن، و(2) Semantic Tokens (--background, --primary, --secondary, --accent, --muted, --border...) هي وحدها ما يستهلكه /src/components. كل عالم يُفعَّل عبر سمة data-world="<slug>" على جذر القسم المعني، تُعيد تعريف الطبقة الثانية فقط. التخصيص المستقبلي لكل مستأجر (Tenant) يُبنى لاحقاً فوق نفس الآلية عبر عمود JSONB (theme_overrides)، بنفس نمط ADR-004، لا كآلية منفصلة.
Context: طلب المؤسس صراحة "انعدام الهارد كود اللوني" في /src/components، مع ست عوالم/منظومات فرعية (ريف، أسراب، نبض، نور الدين، تكوين، بيان) بهويات بصرية مختلفة نفسياً ووظيفياً، بالإضافة لثيم ديوان الأساسي (لافندر/أرجواني ملكي)، وجاهزية لحقن أي ثيم مستقبلي لكل مستأجر.
Alternatives: (أ) نسخ مكوّنات منفصلة لكل عالم — يخالف "لا نبني الشيء نفسه مرتين" (CONSTITUTION §4 بند 8). (ب) تلوين مباشر (Inline hex) داخل كل مكوّن حسب متغيّر شرطي في JS — يعيد إدخال الهاردكود المرفوض من الباب الخلفي ويصعب اختباره. (ج) ملفات Tailwind config منفصلة بالكامل لكل عالم — يضاعف حجم الحزمة (Bundle) دون داعٍ ولا يدعم التخصيص لحظياً لكل مستأجر.
Why: الطبقتان تفصلان "ما هو اللون الخام لهذا العالم" عن "ما يستهلكه المكوّن"، فتحافظان على حياد المكوّنات الكامل (§4 بند 8 من الدستور) وتفتحان الباب لتخصيص لحظي (Runtime) لكل مستأجر دون Build جديد — نفس فلسفة الخلايا الجذعية (§4، §8) مطبَّقة على طبقة الواجهة بدل طبقة البيانات فقط.
Consequences: يتطلب انضباطاً صارماً بعدم كتابة أي قيمة Hex مباشرة داخل /src/components (قابل للتحقق آلياً عبر بحث نصي في CI مستقبلاً). التخصيص لكل مستأجر (JSONB) غير مبني بعد — بنية تحتية جاهزة فقط، لا تُفعَّل قبل وجود جدول merchants/stores فعلي (راجع DOMAIN_MAP.md → Tenant/Authorization).
Related Documents: docs/UI_UX_SYSTEM.md §8، docs/ARCHITECTURE.md §2 (هيكل src/components)، docs/DOMAIN_MAP.md → Tenant/Authorization، ADR-004 (سابقة JSONB)
```

## ADR-008
```
Title: هوية سلة الزائر عبر session_token + حماية الكتابة عبر service_role
Status: ACCEPTED
Date: 2026-09-01 (اليوم 7 من خطة الـ14 يوماً، CART-001)
Decision: (أ) carts.user_id و carts.session_token — أحدهما فقط غير NULL (CHECK صريح). لا تسجيل دخول حقيقي بعد، فسلة الزائر تُعرَّف عبر session_token عشوائي (crypto.randomUUID()) في cookie httpOnly.
          (ب) RLS على carts/cart_items مفعَّل بلا أي policy لـanon/authenticated (قفل كامل، مثل merchants) — كل الوصول عبر عميل Supabase جديد بمفتاح service_role (src/core/kernel/database/supabase-admin-client.ts)، خادم فقط، لا يُستورَد أبداً في Client Component (حزمة server-only كحارس بناء).
Context: بناء أول نطاق يكتب بيانات "عميل" (Cart) قبل وجود نظام دخول حقيقي مربوط بـ Supabase Auth. RLS مسموح لـanon لا يوفّر حماية حقيقية لأن anon key نفسه علني، ولا فرق بين زائر يملك session_token صحيح وآخر يحاول تخمينه — هذا يخالف SECURITY.md قاعدة 3 (كل mutation يتطلب مصادقة).
Alternatives: (أ) تأجيل السلة حتى بناء تسجيل الدخول — يوقف التقدّم على الخطة بلا داعٍ. (ب) RLS مفتوح لـanon معتمداً على صعوبة تخمين session_token فقط — وسمناها غير كافية، تخالف SECURITY.md صراحة.
Why: قرار المؤسس المباشر في هذه المحادثة (سؤالان صريحان، راجع سجل المحادثة) بعد عرض كلا الخيارين مع تبعاتهما الأمنية.
Consequences: يتطلب SUPABASE_SERVICE_ROLE_KEY في .env.local (سر خادم فقط، أضافه المؤسس). أي نطاق مستقبلي يكتب بيانات بلا مصادقة حقيقية (مثل Orders قبل بناء تسجيل الدخول) يجب أن يتبع نفس النمط، لا نمط RLS-مفتوح-لـanon.
Related Documents: docs/DATABASE.md §3 (carts, cart_items)، docs/SECURITY.md قاعدة 3، specs/identity/SPEC.md (فجوة تسجيل الدخول الأصلية)
```

---

## ADR-009
```
Title: Checkout — طلب واحد بلا تقسيم تجار، وإنشاء/بحث مستخدم بالهاتف عبر service_role
Status: ACCEPTED
Date: 2026-09-02 (اليوم 8 من خطة الـ14 يوماً، CHECKOUT-001)
Decision: (أ) تحويل السلة إلى طلب واحد بعمود tenant_id واحد إلزامي على orders، بلا منطق تقسيم لكل تاجر — مع رفض صريح (لا صامت) لأي سلة تحتوي أكثر من tenant_id مميّز.
          (ب) عند Checkout، البحث عن مستخدم بالهاتف أو إنشاؤه (دور customer دائماً) عبر service_role، إضافة إلى khalil.repository.ts/khalil.service.ts، لا نطاق منفصل.
          (ج) order_items.unit_price_snapshot يُحسَب من CatalogService.calculatePrice() في لحظة إنشاء الطلب فقط، ثم يُجمَّد للأبد — عكس تصميم cart_items تماماً (الذي لا يخزّن سعراً إطلاقاً).
Context: بناء أول جسر بين Cart (اليوم 7) وOrders. تحقَّقت مباشرة من Supabase الحي (لا من التوثيق) وقت التخطيط: جدول products يحتوي منتجاً واحداً من تاجر واحد فقط — رياضياً يستحيل اليوم وجود سلة متعددة التجار. كما اكتُشف أن khalil.repository.ts الحالي (findUserByPhone/findUserById) يستخدم العميل العام (مفتاح anon)، وسياسة RLS الوحيدة على users (auth.uid() = id) لا تنطبق أبداً بلا مصادقة حقيقية — أي أن هاتين الدالتين لا تعملان فعلياً، وإن كانتا غير مستخدَمتين في أي مسار فلا انحدار وقع.
Alternatives: (أ) بناء منطق تقسيم الطلب لعدة تجار الآن استباقياً — رُفض: لا بيانات حقيقية تبرره اليوم، ويضيف تعقيداً غير قابل للاختبار الفعلي. (ب) نطاق Users/Customers منفصل عن Khalil لإنشاء المستخدم — رُفض: يكرر ملكية جدول users الموجودة أصلاً في Khalil، يخالف "لا تكرار نطاق قائم" (AGENTS.md بند 3). (ج) تخزين سعر ثابت في cart_items بدل حسابه حياً في orders فقط — رُفض: يخالف القيد الصريح غير القابل للتفاوض في موجّه CHECKOUT-001 نفسه.
Why: الحل الأبسط والمتحقَّق من صحته ببيانات حقيقية دائماً أفضل من بناء تعميم لا دليل عليه بعد (فلسفة Vertical Slice، ADR-002). الرفض الصريح لتعدد التجار (بدل تجاهله) يمنع طلباً خاطئاً صامتاً لاحقاً عند إضافة تاجر ثانٍ فعلياً.
Consequences: تقسيم الطلب لكل تاجر PROPOSED ومؤجَّل — يُبنى فقط عند وجود تاجر ثانٍ حقيقي (راجع docs/DOMAIN_MAP.md → Orders). findOrCreateCustomerByPhone حل جزئي فقط لسؤال "من يملك حق إنشاء users" (docs/SECURITY.md) — لا يحل تسجيل الدخول الحقيقي أو تسجيل التاجر. لا معاملة قاعدة بيانات ذرية حقيقية بين orders وorder_items — تعويض بحذف الطلب عند فشل إدراج البنود، لا RPC حقيقي (تحسين مستقبلي موثَّق).
Related Documents: docs/DATABASE.md §3 (orders, order_items)، docs/DOMAIN_MAP.md → Orders/Payments، docs/SECURITY.md §5/§7/§8، docs/BUSINESS_RULES.md BR-016
```

---

## ADR-010
```
Title: آلة حالات الطلب الكاملة (7 قيم، بينها cancelled غير مذكورة حرفياً في CONSTITUTION §8) + قفل service_role على order_status_history
Status: ACCEPTED
Date: 2026-09-02 (اليوم 9 من خطة الـ14 يوماً، ORDERS-002)
Decision: (أ) orders.status يحمل 7 قيم (pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled)، مفروضة بـCHECK constraint حي على orders — يحسم القيد الذي أُجِّل عمداً في ADR-009.
          (ب) إضافة delivered وcancelled كحالتين نهائيتين — لا انتقال منهما إطلاقاً. cancelled مسموحة من أي حالة غير نهائية (pending/confirmed/preparing/ready/out_for_delivery)، لا من pending فقط.
          (ج) جدول order_status_history جديد — سجل تدقيق كامل (from_status, to_status, actor_role, actor_id, note)، بـCHECK constraints مطابقة لقيم الحالة/الدور، RLS مقفول بالكامل بلا أي policy — وصول حصري عبر service_role (نفس نمط ADR-008/ADR-009).
          (د) تحقق مزدوج في OrdersService.transitionStatus(): الانتقال مسموح في ORDER_TRANSITIONS؟ ثم الفاعل (actorRole) مخوَّل في ORDER_TRANSITION_ACTORS؟ — كلا الجدولين مصدر حقيقة برمجي وحيد في types.ts.
Context: اليوم 8 (CHECKOUT-001) أنشأ الطلب بحالة pending ثابتة فقط، بلا أي CHECK على status عمداً (ADR-009 أجّل القرار لهذا اليوم). BR-009 (عدالة المسؤولية المادية، ACCEPTED منذ محادثة 2026-09-01) تفترض صراحة وجود order_status_history لتحديد الطرف المقصر آلياً — كانت تنتظر هذا الجدول بالذات.
Alternatives: (أ) الاقتصار حرفياً على المسار الستة في CONSTITUTION §8 بلا cancelled — رُفض: يخالف BR-009 المعتمدة فعلاً التي تفترض إلغاءً ممكناً، ويترك النظام بلا مخرج لطلب فشل قبل التسليم. (ب) السماح بـcancelled من pending فقط (قبل تأكيد التاجر) — رُفض: لا يعكس واقع تشغيلي حقيقي (نفاد مخزون أثناء preparing، فشل توصيل أثناء ready، إلخ). (ج) trigger قاعدة بيانات لتحديث updated_at تلقائياً بدل تحديثه يدوياً في الكود — رُفض مؤقتاً: لا جدول حالي في المشروع يستخدم trigger، يكسر الاتساق مع النمط القائم بلا حاجة فعلية الآن.
Why: قرار المؤسس المباشر في هذه المحادثة — عرض التصميم وآلة الحالات ومصفوفة الفاعلين قبل التنفيذ، ووافق عليها صراحة ("التصميم ومصفوفة الانتقالات ممتازة ومتوافقة تماماً") قبل تطبيق الهجرة يدوياً عبر Supabase SQL Editor.
Consequences: ready→out_for_delivery وout_for_delivery→delivered مُخوَّلتان مؤقتاً لأدوار التاجر/الإدارة فقط (لا نطاق برق/مندوب توصيل مبني بعد) — يحتاج actorRole جديداً أو نطاقاً منفصلاً عند بناء التوصيل الفعلي. customer مستبعد من كل الانتقالات حالياً (بما فيها cancelled) لعدم وجود مصادقة حقيقية تُثبت ملكية الطلب — راجع specs/orders/README.md → Open Questions.
Related Documents: docs/DATABASE.md §3 (order_status_history)، docs/DOMAIN_MAP.md → Orders، docs/BUSINESS_RULES.md → BR-009، specs/orders/README.md، ADR-008، ADR-009
```

---

## ADR-011
```
Title: حماية معمارية حتمية (Deterministic Guardrails) — Husky + dependency-cruiser، وخفض typescript إلى ^6.x
Status: ACCEPTED
Date: 2026-09-02 (اليوم 9، قبل بدء اليوم 10 مباشرة)
Decision: (أ) Husky لخطافات Git: pre-commit يشغّل typecheck + arch:check + test:unit (سريع، بلا شبكة)؛ pre-push يشغّل مجموعة الاختبارات الكاملة (يشمل تكامل حي ضد Supabase).
          (ب) dependency-cruiser (`.dependency-cruiser.cjs`) يفرض 6 قواعد تُترجم آلياً قاعدة اتجاه الاعتماد في ADR-005 وقاعدة الوصول الحصري لـkhalil.repository.ts في ADR-009 — راجع docs/ARCHITECTURE.md §3.1 للقائمة الكاملة. كل قاعدة مُتحقَّق منها فعلياً بحقن مخالفة مؤقتة (استيراد متقاطع، وصول مباشر لعميل قاعدة البيانات من واجهة، إلخ) والتأكد من رفضها، ثم التراجع عنها، قبل اعتماد الإعداد.
          (ج) خفض typescript من ^7.0.2 إلى ^6.0.3 — قرار تقني منفصل اضطراري، ليس هدفاً بذاته.
Context: طلب المؤسس صراحة إضافة "شريحة حماية معمارية حتمية" قبل بدء اليوم 10، لمنع أي هلوسة أو تآكل معماري مستقبلاً — لا تعتمد على انتباه أداة الذكاء الاصطناعي وحدها. أثناء التنفيذ: dependency-cruiser 18.2.0 (أحدث إصدار متاح وقت الكتابة) يعلن صراحة عن مدى توافق typescript >=2.0.0 <7.0.0؛ التحقق العملي (`depcruise src`) أكّد فشلاً كاملاً وصامتاً (0 ملفات مفحوصة، لا رسالة خطأ توقف التنفيذ) مع typescript@^7.0.2 المثبَّت في المشروع منذ اليوم 0 (كان "الأحدث" وقت `npm install typescript`، لا قراراً معمارياً مقصوداً — لا ADR سابق يذكر TS7 تحديداً).
Alternatives: (أ) الإبقاء على typescript@7 وقبول أداة معطَّلة فعلياً (فشل صامت بلا اكتشاف مخالفات) — رُفض: يناقض الهدف من الطلب نفسه (حماية حتمية لا وهمية). (ب) التحول لـESLint + eslint-plugin-boundaries بدل dependency-cruiser لتفادي مس نسخة TypeScript — خيار مطروح على المؤسس صراحة، لم يُختر (يتطلب تأسيس منظومة ESLint كاملة غير موجودة إطلاقاً في المشروع، نطاق أكبر من المطلوب). (ج) تثبيت نسخة TypeScript ثانية منعزلة لِـdependency-cruiser فقط (عبر workspace/nested node_modules) — رُفض: تعقيد بنيوي غير مبرَّر لمشروع بحجم Vertical Slice حالي، يخالف "الحد الأدنى من الكود لتحقيق المطلوب" (AGENTS.md بند 7).
Why: قرار المؤسس المباشر — عُرضت الخيارات الثلاثة صراحة (خفض TS، التحول لـESLint، الإبقاء على TS7 وتأجيل الفحص) عبر سؤال مباشر، واختار المؤسس خفض typescript كأبسط حل يحل المشكلة من جذرها.
Consequences: `npx tsc --noEmit` ومجموعة الاختبارات الـ30 بالكامل أُعيد التحقق منهما بعد الخفض — بلا أي خطأ جديد أو تغيّر سلوك. Next.js لا يعلن peerDependency صريحاً على typescript (تحقَّق منه بالبحث في package.json الخاص به) — لا تعارض متوقَّع. أي رفع مستقبلي لـtypescript إلى 7+ يجب أن يعيد فحص توافق dependency-cruiser أولاً (أو الانتقال لبديل) قبل الترقية، وإلا يعود الفاحص للفشل الصامت.
Related Documents: docs/ARCHITECTURE.md §3.1, ADR-005, ADR-009, .dependency-cruiser.cjs, .husky/pre-commit, .husky/pre-push, AGENTS.md بند 9
```

---

## ADR-012
```
Title: طلبات التاجر — جلسة حقيقية مصغّرة بالهاتف بلا كلمة مرور (sessions)، قفل merchants بالكامل، وعزل مستأجرين في transitionStatus
Status: ACCEPTED
Date: 2026-09-02 (اليوم 10 من خطة الـ14 يوماً)
Decision: (أ) جدول sessions جديد (token, user_id, tenant_id nullable, role, expires_at) — كان CONCEPTUAL منذ اليوم 2. تسجيل دخول تاجر عبر MerchantService.loginOwnerByPhone(phone): بحث بالهاتف الشخصي لمالك التاجر (role=merchant_owner في users، لا merchants.phone) عبر KhalilService.findUserByPhone (جديد، بلا إنشاء تلقائي — عكس findOrCreateCustomerByPhone)، ثم التحقق من وجود merchants.owner_id مطابق ونشط، ثم KhalilService.createSession — يُفعِّل لأول مرة Session/canAccessTenant الموجودين في khalil منذ اليوم 4 بلا أي مستهلك فعلي حتى الآن. الرمز (token) عشوائي فقط في cookie httpOnly (نفس نمط cart-session.ts، ADR-008) — tenantId/role لا يصلان العميل أبداً، يُقرآن من قاعدة البيانات في كل طلب عبر MerchantService.validateSessionToken.
          (ب) حذف سياسة القراءة العامة على merchants ("Merchants are viewable by everyone") — اكتُشفت أثناء تخطيط اليوم 10 أنها تكشف phone/owner_id لأي anon بلا أي مستهلك فعلي واحد في الكود (النطاق دُفن منذ اليوم 4). merchants الآن مقفول بالكامل، نفس نمط carts/orders، وصول حصري عبر service_role — merchant.repository.ts تحوَّل من anon إلى service_role (كان create() تحديداً معطَّلاً صامتاً من الأساس، نفس نمط اكتشاف ADR-009 مع khalil).
          (ج) TransitionOrderStatusInput.tenantId جديد (اختياري في النوع، إلزامي فعلياً بالتحقق البرمجي لأدوار merchant_owner/merchant_manager/employee) — orders.service.ts.transitionStatus() يرفض أي تاجر يحاول تغيير حالة طلب لا يخص tenantId جلسته، قبل حتى فحص صحة الانتقال نفسه.
          (د) دمج canAccessTenant المكرَّرة — كانت موجودة بنسختين مختلفتين (khalilService بمعامل tenantId مباشر، merchantService بمعامل Merchant كامل)، كلتاهما بلا أي مستدعٍ فعلياً. أُبقي على نسخة khalilService (Session نطاق خليل)، حُذفت نسخة merchantService.
Context: اليوم 9 بنى دورة حياة الطلب الكاملة لكن بلا أي واجهة تاجر فعلية تستخدمها. طلب المؤسس صراحة "جلسة حقيقية مصغّرة" بدل تاجر واحد مُثبَّت في الكود (خيار أضعف) أو Supabase Auth كاملة (نطاق أكبر بكثير من "الميزة القادمة المخطط لها بدقة"، CONSTITUTION §1). تحقُّق حي أثناء التخطيط (لا من التوثيق) كشف مشكلتين حقيقيتين غير موثَّقتين سابقاً: قراءة merchants العامة، وغياب فحص عزل المستأجرين في transitionStatus من اليوم 9.
Alternatives: (أ) تاجر واحد مُثبَّت بلا تسجيل دخول إطلاقاً — رُفض صراحة من المؤسس: يفتح مساحة أكبر لتغيير حالة طلبات حقيقية بلا أي حماية هوية، عكس فلسفة الحماية الحتمية المبنية اليوم 9.5 مباشرة. (ب) Supabase Auth كاملة أولاً — رُفض: نطاق أكبر بكثير من طلبات التاجر تحديداً، يخالف مبدأ Vertical Slice. (ج) تقييد قراءة merchants لأعمدة علنية عبر view بدل حذف السياسة بالكامل — رُفض: لا حاجة فعلية للقراءة العامة أصلاً (صفر مستهلكين)، القفل الكامل أبسط وأكثر أماناً بلا تضحية بميزة فعلية.
Why: قرار المؤسس المباشر (اختيار صريح من 3 خيارات معروضة). القفل الكامل لـmerchants وإضافة عزل المستأجرين كلاهما لم يُطلَب صراحة بالتفصيل لكنهما امتداد مباشر ضروري لنفس القرار — أي جلسة تاجر حقيقية بلا هذين الإصلاحين تبقى شكلية فقط (تسجيل دخول حقيقي فوق ثغرتين حقيقيتين).
Consequences: تسجيل الدخول بلا كلمة مرور يبقى ثغرة معروفة — أي طرف يعرف هاتف تاجر نشط يستطيع انتحاله بالكامل (لا OTP، لا تحقق ثانٍ). مقبول مؤقتاً لتاجر تجريبي واحد فقط، **يجب** إغلاقه قبل تسجيل تاجر ثانٍ حقيقي (راجع specs/merchant/SPEC.md → Open Questions). مدة الجلسة (7 أيام) وTTL بلا قرار مؤسس رسمي — TODO صريح، نفس نمط BR-016. ready→out_for_delivery وout_for_delivery→delivered لا تزالان مُخوَّلتين لأدوار التاجر/الإدارة مؤقتاً (لا نطاق برق/مندوب — قرار ADR-010 لم يتغيّر).
Related Documents: docs/DATABASE.md §3 (sessions)، §6 (RLS)، docs/DOMAIN_MAP.md → Merchant/Orders/Khalil، specs/merchant/SPEC.md، ADR-005 (اتجاه الاعتماد)، ADR-009، ADR-010
```

---

## ADR-013
```
Title: لوحة الإدارة الأساسية — نطاق admin جديد (تجميع لا جدول)، جلسة platform_admin مصغّرة بكوكي مستقل، تفعيل/تعطيل تاجر، سجل تدقيق عام من order_status_history
Status: ACCEPTED
Date: 2026-09-02 (اليوم 11 من خطة الـ14 يوماً)
Decision: (أ) نطاق جديد src/core/modules/admin/ — لا جدول خاص به، يجمّع قراءات/عمليات عبر Merchant وOrders تماماً كما orders.service.ts ينسّق cart/catalog/inventory/khalil. AdminService.loginByPhone(phone) — نفس نمط MerchantService.loginOwnerByPhone حرفياً: khalilService.findUserByPhone → تحقق role === 'platform_admin' → khalilService.createSession(tenantId: null).
          (ب) admin-session.ts — كوكي httpOnly مستقل تماماً (sb_admin_session لا sb_merchant_session)، مع فحص إضافي غير موجود في merchant-session.ts: getAdminSession() يتحقق صراحة أن session.role === 'platform_admin' بعد validateSessionToken. هذا الفحص ضروري تحديداً للإدارة لأن tenantId فيها null دائماً بتصميم — فحص "tenantId موجود؟" الذي يحمي merchant-session.ts ضمنياً (جلسات غير التاجر لها tenantId: null أيضاً فتُرفض تلقائياً) لا ينطبق هنا؛ الفحص الصريح هو البديل المكافئ الوحيد.
          (ج) merchantRepository.findAll()/setActiveStatus() (+ تغليف رقيق في merchantService)، ordersRepository.findAll()/findAllStatusHistory() (+ تغليف رقيق في ordersService: getAllOrders()، getRecentStatusHistory()) — كلها تُستدعى من AdminService/Server Actions مباشرة عبر service.ts الأخرى، لا عبر الوصول لـrepository.ts نطاق آخر (يحترم القاعدة المفروضة آلياً في .dependency-cruiser.cjs).
          (د) src/app/admin/dashboard/ — صفحة واحدة (لا مسارات متعددة) تجمع ثلاثة أقسام: التجار (قائمة + زر تفعيل/تعطيل)، كل الطلبات (قائمة + أزرار انتقال حالة عبر مكوّن OrderRow المُعمَّم من اليوم 10)، سجل التدقيق (آخر 50 قيداً من order_status_history، بلا جدول جديد).
          (ه) OrderRow.tsx (كان MerchantOrderRow.tsx) — عُمِّم بقبول onTransition كـ prop بدل استيراد Server Action محدَّد، يُعاد استخدامه من بوابتي التاجر والإدارة بنفس المكوّن حرفياً.
          (و) مستخدم platform_admin تجريبي أول (هاتف 01000000001) أُنشئ يدوياً عبر service_role — لا واجهة "Bootstrap Admin" تلقائية (نفس نمط تسجيل التاجر اليدوي، خارج نطاق اليوم).
Context: اليوم 10 بنى بوابة تاجر تعمل حياً لكن بلا أي رؤية مركزية عبر كل التجار/الطلبات — لوحة الإدارة الأساسية هي الخطوة الطبيعية الأخيرة لإكمال "البوابات الثلاث" (CONSTITUTION §5/§8). تحقُّق حي قبل التنفيذ: لا مستخدم platform_admin موجود، لا طلبات في القاعدة (نُظِّفت بعد اختبارات سابقة).
Alternatives: (أ) audit_log عام كامل اليوم بدل الاكتفاء بـorder_status_history — رُفض صراحة من المؤسس: يخالف "لا نبني أكثر من الميزة القادمة المخطط لها بدقة"، audit_log العام مخطَّط دستورياً لليوم 12 (يوم الأمان) تحديداً. (ب) عرض طلبات فقط بلا تحكم بالحالة للإدارة — رُفض: platform_admin مخوَّل فعلياً بكل انتقال منذ اليوم 9 (ORDER_TRANSITION_ACTORS)، منع الواجهة من استخدام صلاحية موجودة أصلاً تعقيد بلا فائدة أمنية حقيقية. (ج) صفحات منفصلة لكل قسم إداري (/admin/merchants، /admin/orders) — رُفض لصالح صفحة "لوحة" واحدة: الحجم الحالي (تاجر واحد، طلبات قليلة) لا يبرر تعدد المسارات، "لوحة إدارة أساسية" تعني حرفياً شاشة واحدة عند هذا الحجم.
Why: قرار المؤسس المباشر — عرض الخطة الكاملة (الهوية، العمليات، الاختبارات) وحصل على موافقة صريحة على كل بند مع محددات هندسية دقيقة (حظر التوسع خارج تفعيل/تعطيل التاجر، ترحيل audit_log العام لليوم 12).
Consequences: إجراء تفعيل/تعطيل التاجر نفسه **لا يُسجَّل** في أي سجل تدقيق اليوم (لا audit_log عام بعد) — فجوة معروفة، موثَّقة صراحة، مؤجَّلة لليوم 12 بقرار مباشر لا سهواً. لا manager/employee في لوحة الإدارة (تطابق نفس فجوة الأدوار في specs/merchant/SPEC.md). تسجيل دخول الإدارة بلا كلمة مرور — نفس خطر ADR-012 بالضبط، أشد حساسية هنا (صلاحيات platform_admin أوسع من merchant_owner)، يُحدَّث Open Questions في specs/admin/SPEC.md.
Related Documents: docs/DATABASE.md، docs/DOMAIN_MAP.md → Admin/Merchant/Orders، specs/admin/SPEC.md (جديد)، specs/merchant/SPEC.md، specs/orders/README.md، ADR-009، ADR-010، ADR-012
```

---

## ADR-014
```
Title: يوم الأمان الكامل والرقابة — audit_log عام، إصلاح IDOR في السلة، تحقق مدخلات (zod)، Rate Limiting على الدخول
Status: ACCEPTED
Date: 2026-09-02 (اليوم 12 من خطة الـ14 يوماً، §23/§26 — "غير قابل للحذف")
Decision: (أ) جدول audit_log عام جديد (id, actor_id, actor_role, action, entity_type, entity_id, metadata jsonb,
          created_at) — نفس عائلة order_status_history لكن خارج نطاق طلب واحد. RLS مقفول بالكامل بلا أي policy،
          نفس نمط merchants/orders/sessions (service_role حصراً). نطاق التطبيق الفعلي اليوم فقط (لا أكثر): تفعيل/
          تعطيل التاجر (AdminService.setMerchantActiveStatus، الفجوة المذكورة حرفياً في ADR-013) ومحاولات دخول
          التاجر/الإدارة نجاحاً وفشلاً (MerchantService.loginOwnerByPhone/AdminService.loginByPhone).
          (ب) مراجعة RLS شاملة على الجداول الـ11 القائمة — النتيجة: لا إعادة بناء معمارية، الأنماط الحالية (قفل
          service_role الكامل / قراءة عامة / قراءة الذات) صحيحة ومقصودة. إصلاحان فقط: توثيق أن سياسة users
          (auth.uid()=id) معطَّلة عملياً (لا Supabase Auth حقيقية بعد، auth.uid() لا يُطابِق شيئاً — فشل آمن لا
          خطر)، وتأكيد أن "سياسات كتابة مفقودة" على categories/products/inventory ليست خطراً فعلياً لأن لا كود
          كتابة عليها إطلاقاً اليوم.
          (ج) إصلاح IDOR فعلي وحيد: cartService.removeItem (src/core/modules/cart/cart.service.ts) كان يحذف
          itemId بلا تحقق انتمائه لـcartId — أُصلِح بنفس نمط updateItemQuantity المجاور (فحص ملكية عبر findItems
          قبل الحذف).
          (د) zod مكتبة تحقق جديدة (لا مكتبة كانت مثبَّتة) — schemas مشتركة (هاتف مصري، uuid) في
          src/core/kernel/validation/schemas.ts، ومخططات مخصَّصة بجانب كل Server Action حساس (checkout, merchant/
          orders, admin/dashboard, login×2). دفاع إضافي (Defense-in-depth) في transitionOrderAction: تأكيد صريح
          أن دور الجلسة ضمن أدوار التاجر، لا الاعتماد الضمني وحده على "فقط أدوار التاجر تملك tenantId".
          (ه) Rate Limiting بعدّاد في-الذاكرة (src/core/kernel/security/rate-limit.ts) — نطاق محدود صراحة لمساري
          الدخول فقط (loginMerchantAction/loginAdminAction)، 5 محاولات فاشلة/15 دقيقة لكل رقم هاتف، مفاتيح منفصلة
          merchant:<phone>/admin:<phone>.
Context: اليوم 11 (ADR-013) ترك ثلاث فجوات موثَّقة صراحة كمؤجَّلة عمداً لهذا اليوم بالذات: audit_log عام (لا كود
          كتابة على categories/products/inventory بعد)، تفعيل/تعطيل تاجر بلا سجل، ودخول بلا كلمة مرور لكل من
          التاجر والإدارة (خطر أعلى للإدارة). استكشاف حي شامل قبل التخطيط (لا افتراضات) أكَّد أن كل حماية IDOR/عزل
          مستأجرين في المشروع تعيش 100% في كود TypeScript (service.ts) لا في RLS — service_role يتجاوز RLS دائماً
          على الجداول الخاصة، فأي إصلاح أمني حقيقي هنا كود تطبيق لا SQL.
Alternatives: (أ) استبدال الدخول بلا كلمة مرور بكلمة مرور/OTP/Supabase Auth كاملة اليوم — رُفض صراحة: نطاق أكبر
          بكثير من يوم أمان واحد، قرار مؤسس منفصل موثَّق مسبقاً في specs/merchant/SPEC.md و specs/admin/SPEC.md
          كـOpen Question مستقل. (ب) دمج audit_log مع order_status_history في جدول واحد — رُفض: order_status_history
          مبني وموثَّق ويعمل حياً منذ اليوم 9، لا حاجة فعلية لدمجه، الفصل يطابق تصنيف docs/DATABASE.md §4 الأصلي
          (تدقيق طلب مقابل تدقيق عام). (ج) Redis/بنية تحتية خارجية لـRate Limiting بدل عدّاد في-الذاكرة — رُفض:
          نطاق أكبر من Vertical Slice حالي (خادم واحد، تاجر تجريبي واحد)، القيد (لا ينجو من إعادة تشغيل الخادم)
          موثَّق صراحة كمقبول مؤقتاً لا مخفياً. (د) تأسيس أداة Migrations رسمية اليوم بدل SQL يدوي عبر
          Supabase SQL Editor — رُفض: نطاق أوسع من يوم أمان، مرشَّح صريح لليوم 13 بدلاً من ذلك (docs/SECURITY.md
          OPEN_QUESTIONS بند 8 الجديد).
Why: قرار المؤسس المباشر — عرض مواصفة اليوم الكاملة (audit_log، مراجعة RLS، تأمين Server Actions، اختبارات أمنية
          سلبية) قبل أي تعديل كود أو قاعدة بيانات، ووافق صراحة على الخطة المعمارية بالكامل بما فيها رقم Rate
          Limiting المقترح (5 محاولات/15 دقيقة) قبل التنفيذ.
Consequences: audit_log جديد بلا نظام Migrations رسمي — SQL يُضاف إلى docs/DATABASE.md وينتظر تنفيذاً يدوياً عبر
          Supabase SQL Editor من المؤسس قبل أن تنجح اختبارات التكامل الجديدة التي تعتمد عليه (نفس عُرف كل الجداول
          العشرة السابقة، لا استثناء). عدّاد Rate Limiting في-الذاكرة لا يصمد أمام إعادة تشغيل الخادم أو نسخ
          Serverless متعددة — يجب إعادة تقييمه (Redis/DB) قبل إنتاج حقيقي متعدد الخوادم. getOrderWithItems/
          getStatusHistory في orders.service.ts تبقيان بلا فحص تاجر داخلي (فخ كامن موثَّق بتعليق تحذيري في الكود
          نفسه، لا مستهلك فعلي لهما اليوم). استبدال الدخول بلا كلمة مرور يبقى قراراً مؤسس منفصل غير محسوم.
Related Documents: docs/DATABASE.md §3 (audit_log)، §6 (RLS)، docs/SECURITY.md §5/§9/§12/§15،
          src/core/modules/audit/، src/core/kernel/validation/schemas.ts، src/core/kernel/security/rate-limit.ts،
          ADR-008، ADR-009، ADR-010، ADR-012، ADR-013، specs/admin/SPEC.md، specs/merchant/SPEC.md
```

---

## ADR-015
```
Title: نموذج الهوية المرحلي (Phased Identity Model) — زائر بلا توثيق أولاً، هوية وطنية موحَّدة عند الخدمات المتقدمة
Status: ACCEPTED (Phase 1: يعكس الواقع الحالي فعلياً — لا كود جديد. Phase 2: PROPOSED/CONCEPTUAL — لم يُبنَ)
Date: 2026-09-02 (اليوم 12، قرار تكميلي بعد ADR-014)
Decision: (أ) Phase 1 (الحالية): زائر يتصفّح ويشتري كعميل عادي بلا أي توثيق هوية — مطابق تماماً لما هو IMPLEMENTED
          فعلياً اليوم: هوية سلة الزائر عبر carts.session_token (عمود مستقل تماماً عن جدول users، ADR-008)، ولا
          صف users يُنشَأ إطلاقاً حتى لحظة Checkout (khalilService.findOrCreateCustomerByPhone، ADR-009) — عندها
          فقط يُطلَب رقم الهاتف. **تصحيح على النص المقترح أصلاً:** users.phone يبقى كما هو IMPLEMENTED منذ اليوم 2
          — `not null unique` لا nullable — لأن "الزائر بلا توثيق" مُحقَّق فعلياً اليوم عبر عدم إنشاء صف users من
          الأساس، لا عبر السماح بصف users بلا هاتف. لا حاجة لتخفيف القيد الحالي لتحقيق نفس الهدف.
          (ب) Phase 2 (مستقبلية، PROPOSED): عمودان جديدان على users — `national_id text unique` و
          `is_verified boolean not null default false` — كلاهما CONCEPTUAL، **لا يوجدان في الجدول اليوم إطلاقاً**
          (تحقَّق منه حياً: لا أثر لهما في المخطط الفعلي ولا في أي كود). يُطلَب توثيقهما إجبارياً (`national_id`
          فريد + `is_verified = true`) فقط عند طلب المستخدم الانضمام كتاجر، أو برنامج شركاء النجاح، أو استخدام
          محفظة تيسير — لا لأي تصفح/شراء عادي. البناء الفعلي (ALTER TABLE + منطق تحقق) مؤجَّل لبدء تلك الميزة
          تحديداً، لا اليوم.
Context: طلب المؤسس توثيق التسلسل الزمني للهوية قبل commit اليوم 12 النهائي، لضمان أن قرار "متى تُطلَب الهوية
          الوطنية" مسجَّل بوضوح كإطار حاكم لأي عمل مستقبلي على التاجر/شركاء النجاح/تيسير، بدل تركه ضمنياً. المراجعة
          الحية لجدول users الفعلي (docs/DATABASE.md §3) قبل الكتابة كشفت أن الصياغة المقترحة أصلاً تصف phone
          كـnullable بينما هو NOT NULL فعلياً، وتفترض وجود national_id/is_verified بقيم افتراضية بينما العمودان
          غير موجودين إطلاقاً — صُحِّحت الصياغة لتطابق الواقع الحي، نفس انضباط كل ADR سابق في هذا الملف (لا توثيق
          لحالة غير مُتحقَّق منها حياً).
Alternatives: (أ) تعديل users.phone إلى nullable فعلياً اليوم لدعم "صف زائر" صريح بلا هاتف — رُفض: يغيّر قيداً
          حياً يعتمد عليه تسجيل الدخول (merchant/admin) وCheckout بلا أي حاجة فعلية، بينما الهدف نفسه (زائر بلا
          توثيق) محقَّق بالفعل عبر التصميم القائم (لا صف users للزائر أصلاً). (ب) بناء national_id/is_verified
          كأعمدة فعلية اليوم تحسّباً للمستقبل — رُفض: يخالف "لا نبني أكثر من الميزة القادمة المخطط لها بدقة"، لا
          مستهلك فعلي لهما قبل بدء نطاق تاجر/شركاء النجاح/تيسير تحديداً.
Why: قرار المؤسس المباشر بتوثيق التسلسل المرحلي كإطار حاكم. تصحيح الصياغة (phone/الأعمدة غير الموجودة) قرار
          توثيقي بحت بناءً على أدلة حية من المخطط الفعلي، لا تغييراً في نية المؤسس — الهدف المعلَن (زائر بلا
          توثيق أولاً، هوية موحَّدة عند الخدمات المتقدمة) محفوظ بالكامل، فقط الوصف التقني صُحِّح ليطابق التنفيذ
          القائم.
Consequences: لا تغيير SQL أو كود اليوم — Phase 1 توثيق لواقع قائم، Phase 2 التزام مستقبلي بلا تنفيذ. أي بناء
          مستقبلي لنطاق تاجر جديد/شركاء النجاح/تيسير يجب أن يراجع هذا الـADR أولاً لتحديد نقطة إجبار توثيق الهوية
          الوطنية بدل ارتجالها حينها. `docs/DATABASE.md` §4 يضيف `national_id`/`is_verified` كأعمدة CONCEPTUAL على
          `users` — لا جدول منفصل.
Related Documents: docs/DATABASE.md §3 (users)، §4 (CONCEPTUAL)، ADR-008 (carts.session_token)، ADR-009
          (findOrCreateCustomerByPhone)، ADR-012/ADR-013 (تسجيل دخول بالهاتف)، ADR-014
```

---

## ADR-016
```
Title: القطعة الرأسية الحرجة للواجهة الأمامية (الأيام 14-16) — proxy.ts، فصل قراءة/إنشاء هوية
          السلة، ورابط UUID كتفويض لتتبّع الطلب الضيفي
Status: ACCEPTED
Date: 2026-09-03 (الأيام 14-16، بعد تدقيق UI-FRONTEND-AUDIT-001 وموافقة صريحة على نطاق
          UI-FRONTEND-PHASE-001 — ثلاثة فجوات حرجة فقط لإتمام "أول بيع حقيقي"، بلا أكثر)
Decision: (أ) src/proxy.ts (لا middleware.ts) يضمن وجود كوكي sb_cart_session قبل وصول الطلب
          لصفحتي /cart و/checkout حصراً (matcher مقصور عليهما)، لأن الصفحتين تقرآن هوية السلة
          أثناء عرض RSC مباشرة (لا عبر Server Action من نقرة عميل) وNext.js يمنع كتابة الكوكيز في
          ذلك السياق — كان هذا يُسقِط الصفحتين بخطأ 500 حقيقي لأي زائر يدخلهما مباشرة بلا تفاعل
          سابق (مُكتشَف حياً في UI-FRONTEND-AUDIT-001، لم يظهر في أي تحقق Playwright سابق لأن كل
          تلك الجلسات اتبعت مساراً سعيداً يضيف منتجاً للسلة أولاً). اسم الملف/الدالة "proxy" لا
          "middleware" عمداً — Next.js 16.0.0 أهمل اصطلاح "middleware" رسمياً وأعاد تسميته "proxy"
          (تحقُّق حي من node_modules/next/dist/docs/.../file-conventions/proxy.md قبل الكتابة، لا
          اعتماداً على معرفة تدريب سابقة — راجع AGENTS.md "This is NOT the Next.js you know").
          آلية الكوكي: استنساخ Headers الطلب + حقن قيمة session_token الجديدة في ترويسة Cookie ثم
          NextResponse.next({ request: { headers } }) لإتاحتها لعرض RSC لنفس الجولة، مع
          response.cookies.set() منفصلة لتثبيتها في المتصفح — النمط الموثَّق رسمياً في ملف proxy.md
          نفسه لا اجتهاداً.
          (ب) فصل صريح بين "ضمان وجود هوية السلة" (getCartIdentity، تكتب كوكي عند الحاجة —
          Server Actions الحقيقية فقط) و"قراءة هوية السلة الحالية بلا إنشاء" (كوكي:
          getExistingCartSessionToken؛ سلة: cartService.getItemCountForSession) — الأخيرتان
          للـHeader الجديد (يظهر في كل صفحات (reef)) حصراً. اكتُشف حياً أثناء التخطيط: لو استدعى
          الـHeader getOrCreateCart كصفحتَي /cart/checkout بالضبط، يتسابق الاثنان (RSC تُحلّل
          مكوّنات مستقلة بالتوازي في نفس الجولة) على إدراج نفس session_token الجديد في carts
          (عمود UNIQUE)، فيفشل الخاسر بخطأ قيد فريد (23505) — لم يُصلَح بمعالجة الخطأ بعد وقوعه
          (retry-on-conflict) بل بتجنّبه من الجذر: الـHeader لا يُنشئ سلة إطلاقاً، لأن "لا سلة بعد
          لهذا التوكن" يعني حرفياً "صفر عناصر" ولا حاجة فعلية للإنشاء لمجرد عرض عدّاد.
          (ج) صفحة /order/[id] (تتبّع طلب لعميل ضيف بلا حساب/تسجيل دخول، بقرار صريح خارج نطاق
          هذه المرحلة) تعتمد معرّف الطلب (orders.id، UUID عشوائي gen_random_uuid()) بحد ذاته
          كآلية تفويض — رابط حامل (Bearer Link)، نفس نمط "رقم تتبّع شحنة" في أي خدمة توصيل
          حقيقية. دالة جديدة ordersService.getOrderForCustomerView(orderId) (لا استخدام
          getOrderWithItems الحالية) بلا أي فحص تاجر/جلسة، وتخفيف أثر إضافي متعمَّد: تعرض الحالة
          والعناصر والإجمالي فقط — لا عنوان التوصيل ولا هاتف/اسم العميل — لتقليل الضرر لو تسرَّب
          الرابط لطرف غير مقصود. راجع docs/SECURITY.md §16 للتفصيل الأمني الكامل والتباين الصريح
          مع ثغرة IDOR المُصلَحة في ADR-014.
Context: تدقيق UI-FRONTEND-AUDIT-001 (فحص حي لا افتراضي لكل واجهات src/app/) كشف فجوتين حرجتين
          تمنعان "أول بيع حقيقي" (خطأ 500 حي في /cart و/checkout عند الدخول المباشر، وغياب أي
          Header/Navigation) وفجوة ثالثة (لا صفحة لتتبّع الطلب بعد الشراء — يُنسى رقم الطلب فور
          تحديث الصفحة). المؤسس اعتمد نطاقاً محدوداً صراحة (UI-FRONTEND-PHASE-001): هذه الثلاث
          فقط، بترتيب محدَّد، اختبار كامل (Vitest + Playwright حي) بعد كل بند قبل الانتقال للتالي
          — بقية فجوات التدقيق (تسجيل دخول عميل، إدارة منتجات التاجر، لوحات إحصائيات، إنشاء
          تاجر/إدارة عبر واجهة) أُجِّلت عمداً لـ Phase 2، خارج نطاق هذا الـADR كلياً.
Alternatives: (أ) تحويل CartPage/CheckoutPage لـClient Components تستدعي Server Action لجلب
          الهوية بدل proxy — رُفض: يفقد SSR الحالي، يضيف جولة شبكة إضافية قبل ظهور المحتوى (أسوأ
          أداء بالضبط عند أهم صفحتين للتحويل)، وحجم تغيير أكبر بلا داعٍ فعلي مقابل ملف proxy واحد.
          (ب) توسيع matcher الخاص بـ proxy.ts ليغطي كل صفحات (reef) بدل الاكتفاء بـ/cart و/checkout
          — رُفض: يفرض كتابة كوكي تتبّع على كل زائر حتى لو لم يلمس السلة إطلاقاً، بلا حاجة فعلية
          (عدّاد الـHeader يُحل بالقراءة فقط، لا بضمان الوجود). (ج) معالجة سباق الـHeader بمعالجة
          خطأ 23505 وإعادة القراءة (retry-on-conflict) في cartRepository.createCartForSession —
          بديل صحيح تقنياً لكنه أُهمِل لصالح تجنّب السباق من جذره (الـHeader لا يكتب إطلاقاً)، أبسط
          وأقل عرضة لأخطاء مستقبلية. (د) صفحة تتبّع الطلب تتطلب تسجيل دخول/حساب عميل — رُفض صراحة
          في نطاق UI-FRONTEND-PHASE-001 (Phase 2 لاحقة). (هـ) عرض عنوان التوصيل وهاتف العميل في
          صفحة التتبّع (نفس بيانات Checkout) — رُفض: يوسّع أثر تسرّب الرابط بلا داعٍ، الحالة/
          العناصر/الإجمالي كافية لغرض "تتبّع الطلب".
Why: قرار المؤسس المباشر — اعتماد خطة UI-FRONTEND-PHASE-001 الكاملة بلا تعديل (تحديد النطاق
          الثلاثي، ترتيب التنفيذ، إلزام اختبار حي بعد كل بند)، مع تنويه صريح على جودة استباق سباق
          الـHeader قبل وقوعه والتحقق من proxy.ts حياً بدل الاعتماد على معرفة قديمة عن Next.js.
Consequences: proxy.ts مقصور على /cart و/checkout فقط — أي صفحة عميل مستقبلية تحتاج ضمان وجود
          هوية السلة أثناء عرض RSC مباشرة (لا عبر Server Action) يجب أن تُضاف لمصفوفة matcher
          صراحة، لا ترثها تلقائياً. getItemCountForSession لا تُنشئ سلة أبداً — زائر بكوكي منتهي/
          محذوف يرى عدّاداً بصفر حتى يتفاعل مع السلة فعلياً (سلوك متعمَّد، لا خلل). صفحة /order/[id]
          بلا أي تحديد معدل (Rate Limiting) أو انتهاء صلاحية على القراءة — أي حامل للرابط يستطيع
          الاستعلام عنه بلا حد، مقبول الآن (نفس نمط أرقام تتبّع الشحن العامة) لكنه OPEN_QUESTION
          صريح مُضاف لـ docs/SECURITY.md لإعادة تقييمه قبل حجم بيانات إنتاجي حقيقي. CheckoutForm لم
          يعد يعرض حالة تأكيد داخلية — التنقّل لـ/order/[id] إلزامي بعد نجاح الطلب.
Related Documents: docs/DATABASE.md §3 (carts، session_token)، docs/SECURITY.md §16 (جديد)، ADR-008
          (تصميم كوكي السلة الأصلي)، ADR-012 (نمط كوكي الجلسة المشابه)، ADR-014 (خط الأساس
          للتفويض/IDOR، نقطة التباين الصريحة مع (ج) أعلاه)، docs/ROADMAP.md (الأيام 14-16)،
          src/proxy.ts، src/core/modules/cart/cart-session.ts، src/core/modules/cart/cart.service.ts،
          src/core/modules/orders/orders.service.ts، src/app/(reef)/order/[id]/page.tsx،
          src/components/Header.tsx
```

---

## ADR-017
```
Title: تجهيز الإنتاج والإطلاق الحي (الأيام 17-18) — سكربتات المخطط/البذرة كأول خطوة Migrations،
          فصل أرقام staging، وسكربت تجربة الشراء كتحقُّق صندوق أسود لا امتياز خاص
Status: ACCEPTED
Date: 2026-09-03 (الأيام 17-18، PRODUCTION-PREP-001/002 وDAY-18-LIVE-LAUNCH)
Decision: (أ) scripts/schema-setup.sql (جديد) يُعيد بناء المخطط الكامل (12 جدولاً) بترتيب Foreign
          Keys صارم كملف SQL واحد قابل للصق في مشروع Supabase جديد فارغ — أول خطوة فعلية نحو نظام
          Migrations رسمي (الفجوة الموثَّقة كـOPEN_QUESTION منذ اليوم 12، docs/SECURITY.md،
          docs/DATABASE.md §8)، لا نظام Migrations كامل بحد ذاته (لا Supabase CLI migrations، لا
          تتبع نُسخ مخطط). حيث لا نص SQL أصلي محفوظ في هذا المستودع (RLS الفعلية على
          categories/products/inventory، شكل جدول merchants الكامل) وُسم كل بلوك صراحة
          "⚠️ إعادة بناء (INFERRED)" — مطابقة للسلوك الموثَّق حياً في docs/DATABASE.md لا ادّعاء نقل
          حرفي لما لم يُتحقَّق منه.
          (ب) scripts/seed-test-accounts.sql (منفصل عمداً عن ملف المخطط) يزرع تاجراً/منتجاً/إدارة
          تجريبيين لبيئة staging عبر مفاتيح طبيعية (phone/slug/name، لا UUIDs يدوية) — idempotent،
          يعمل بلا تعديل على أي مشروع Supabase جديد. أرقام الهاتف: 01099999990 (تاجر)/01099999991
          (إدارة) — مختلفة عمداً عن أرقام dev المحلي (01000000000/01000000001) بقرار مؤسس مباشر
          نهائي (بعد نسخة أولى أبقت عليها للتطابق مع ملفات الاختبار، ثم غُيِّرت صراحة) لمنع خلط
          بصري بين البيئتين. وُثِّق صراحة أن اختبارات التكامل الحية في هذا المستودع لا تلمس حسابات
          staging إطلاقاً — تعمل حصراً ضد dev المحلي عبر .env.local، فلا تعارض بين الرقمين طالما
          هذا الفصل قائم.
          (ج) scripts/test-first-real-purchase.e2e.ts (اليوم 18) — سكربت Playwright مستقل (لا
          @playwright/test غير مثبَّتة؛ playwright الأساسية + tsx الموجودتان أصلاً) يحاكي رحلة عميل
          مجهول كاملة صندوق أسود بالكامل (لا مفاتيح Supabase، لا service_role، بلا أي امتياز لا
          يملكه عميل حقيقي) — التحقق من /order/[id] كرابط دائم يتم بفتحه من سياق متصفح ثانٍ بلا
          كوكيز، لا بقراءة قاعدة البيانات مباشرة. لم يُشغَّل ضد staging فعلياً (راجع Consequences).
Context: الأيام 14-16 (ADR-016) أغلقت الفجوات الحرجة في الواجهة الأمامية. الخطوة الطبيعية التالية
          نشر بيئة staging.reefam.com حقيقية منفصلة عن بيانات dev المحلي — يتطلب مخططاً وبيانات
          تجريبية قابلين لإعادة الإنشاء بلا نسخ يدوي عبر SQL Editor في كل مرة (نفس المخاطرة
          الموثَّقة في docs/DATABASE.md §8 منذ اليوم 12)، ثم تحقُّقاً حياً (لا افتراضياً) من أن
          البيئة المنشورة فعلياً تعمل بنفس الكود المدفوع قبل تسليم "أول شراء حقيقي" للمؤسس.
Alternatives: (أ) الاكتفاء بتوثيق نصي لخطوات SQL بدل ملف SQL واحد قابل للتشغيل مباشرة — رُفض:
          يفشل بالضبط في تحقيق الهدف المعلَن (خطوة فعلية نحو Migrations، لا توثيق إضافي فقط).
          (ب) الإبقاء على أرقام dev المحلي في seed-test-accounts.sql لتفادي أي احتمال خلط لاحق —
          رُفض بقرار مؤسس مباشر نهائي بعد عرض المفاضلة (الفصل البصري بين البيئتين أهم من توفير لمس
          محتمل غير ضروري لملفات اختبار لن تُشغَّل ضد staging أصلاً). (ج) تشغيل سكربت تجربة الشراء
          فعلياً ضد staging للتحقق منه قبل التسليم — رُفض: لا مفاتيح Supabase لتلك البيئة متاحة
          لتنظيف الطلب التجريبي الناتج بعده، وتشغيله كان سيُنشئ طلباً يزاحم أول شراء حقيقي ينوي
          المؤسس القيام به بنفسه كمحطة ذات معنى — تحقُّق بدلاً منه ضد dev المحلي (قابل للتنظيف
          الكامل عبر service_role)، وتحقُّق حي منفصل (قراءة فقط: حالة HTTP، محتوى الصفحة، نجاح
          تسجيلَي دخول التاجر/الإدارة) مباشرة على staging بلا كتابة أي بيانات عميل وهمية هناك.
Why: قرار المؤسس المباشر — اعتماد نطاق PRODUCTION-PREP-001/002 وDAY-18-LIVE-LAUNCH الكاملين بما
          فيها القرار النهائي الصريح حول أرقام هاتف staging بعد نسخة أولى مختلفة.
Consequences: لا نظام Migrations رسمي كامل بعد (Supabase CLI أو مكافئه) — يبقى OPEN_QUESTION، الآن
          بخطوة أولى عملية بدل توثيق نظري فقط. scripts/test-first-real-purchase.e2e.ts **لم يُشغَّل
          فعلياً ضد staging.reefam.com** — تحقُّقه محصور بتشغيلين ناجحين ضد dev المحلي (11/11 كل
          مرة) بالإضافة لفحوصات حية منفصلة مباشرة على staging (لا 500 على /cart، تسجيلا دخول
          ناجحان). لا ادّعاء في أي وثيقة بأن "أول شراء حقيقي" حدث فعلياً — الإرشادات اليدوية
          سُلِّمت للمؤسس، تنفيذها الفعلي فعل بشري خارج ما يستطيع الكود توثيق اكتماله. راجع
          docs/ROADMAP.md → "ملاحظة دقة صريحة" أعلى جدول الأيام لنفس التمييز موثَّقاً هناك أيضاً.
Related Documents: docs/DATABASE.md §8 (Migrations)، docs/SECURITY.md OPEN_QUESTIONS بند 8،
          docs/ROADMAP.md (الأيام 17-18)، docs/CHANGELOG.md (الأيام 17-18)، ADR-016 (السياق
          المباشر السابق)، scripts/schema-setup.sql، scripts/seed-test-accounts.sql،
          scripts/test-first-real-purchase.e2e.ts، .env.example
```

---

## ADR-018
```
Title: اليوم 19 — أول تنفيذ فعلي لِـ Context Engine: worlds/user_personas بصف individuals وحيد،
          فهرسان جزئيان بدل UNIQUE كامل، وDDL يدوي (لا اتصال Postgres مباشر لـClaude Code)
Status: ACCEPTED
Date: 2026-09-04 (اليوم 19، بعد حسم بوابة RFC في CONFLICT-006)
Decision: (أ) جدولا `worlds`/`user_personas` جديدان (`docs/DATABASE.md §3` للـSQL الكامل) — `worlds` بلا أي
          `UNIQUE` على المحتوى غير `slug`، صف واحد فقط مزروع اليوم (`individuals`). `user_personas` **بلا**
          `UNIQUE` كامل على `(user_id, world_id)` — يسمح نظرياً بأكثر من شخصية غير افتراضية لنفس المستخدم في
          نفس العالم (تحسّباً لعوالم "أعمال" مستقبلية: مستخدم يدير متجرين منفصلين كشخصيتين مختلفتين). القيدان
          الفعليان اثنان فقط، كلاهما فهرس جزئي (`WHERE is_default = true`) لا `UNIQUE` عمودي كامل:
          `user_personas_default_per_world_uidx` (`user_id, world_id`) و`user_personas_one_default_uidx`
          (`user_id` وحده — القيد الحاكم فعلياً اليوم بعالم واحد فقط).
          (ب) `sessions.active_persona_id uuid references user_personas(id)` — عمود جديد `nullable` على جدول
          `sessions` القائم (اليوم 10، `ADR-012`)، بلا أي مستهلك كود بعد.
          (ج) RLS: قفل كامل بلا أي `policy` على الجدولين — نفس النمط 2 (`merchants`/`orders`/`carts`/`audit_log`)،
          بتأكيد صريح من المؤسس أن كلا الجدولين بيانات حساسة (صلاحيات + هوية شخصية) لا تحتمل قراءة عامة.
          (د) Backfill: صف `user_personas` افتراضي واحد لكل `users.role = 'customer'` كانوا موجودين فعلياً وقت
          التنفيذ (5 مستخدمين) — لا التاجر التجريبي (`merchant_owner`)، لا حساب `platform_admin` — بقرار مؤسس
          مباشر (`CONFLICT-006`، بند 3).
          (هـ) **تنفيذ DDL يدوي عبر Supabase SQL Editor** (`scripts/day19-context-engine-schema.sql`) — اكتُشف
          حياً أثناء التخطيط أن هذا المشروع لا يملك اتصال Postgres مباشر (لا `DATABASE_URL`، لا حزمة `pg`) —
          فقط `@supabase/supabase-js` عبر PostgREST (`service_role`/`anon`)، الذي ينفّذ DML (`INSERT`/`SELECT`/
          `UPDATE`/`DELETE`) على جداول قائمة لكن **لا** DDL (`CREATE TABLE`/`ALTER TABLE`/`CREATE INDEX`). هذا
          ليس استثناءً — نفس نمط كل Migration سابق في هذا المستودع (`ADR-008` حتى `ADR-017`) طُبِّق يدوياً عبر
          SQL Editor أيضاً؛ Claude Code صاغ الـSQL وتحقَّق حياً قبل/بعد، لم يُنفِّذ DDL مباشرة في أي يوم سابق.
          (و) Seed/Backfill/تحقُّق حي كلها DML بحت، نُفِّذت مباشرة عبر `scripts/day19-context-engine-seed-and-
          verify.ts` (`service_role`) بلا أي خطوة يدوية إضافية — بما فيها إنشاء عالم مؤقت لاختبار الفهرس الجزئي
          الثاني (شخصية افتراضية ثانية لنفس المستخدم عبر عالم آخر)، حُذف فوراً ضمن نفس تشغيل السكربت.
Context: `CONFLICT-006` حسم بوابة RFC (`ideas/CONTEXTUAL_WORLDS_RFC.md`) لكن دون تفاصيل SQL دقيقة مسترجَعة من
          جلسة سابقة مفقودة — فقط ملخص المؤسس (`worlds` بصف `individuals`، `user_personas` بفهرسين جزئيين،
          `sessions.active_persona_id nullable`). صُمِّم شكل الفهرسين الجزئيين هنا من الصفر (`⚠️ إعادة بناء
          (INFERRED)`، لا استرجاع نص مفقود)، مبرَّراً هندسياً لا مخموناً عشوائياً — راجع Alternatives أدناه.
Alternatives: (أ) `UNIQUE` كامل على `(user_id, world_id)` بدل فهرس جزئي مشروط بـ`is_default` — رُفض: يمنع
          مسبقاً أي مستخدم من امتلاك أكثر من شخصية في نفس العالم، افتراض تقييدي لا يوجد دليل عليه اليوم (لا
          عالم "أعمال" مبني بعد أصلاً)، يخالف "لا نبني قيداً لا حاجة فعلية له" (نفس منهج `ADR-009` مع تقسيم
          الطلب). (ب) فهرس جزئي واحد فقط (`user_id` عالمياً) بلا الفهرس الثاني على `(user_id, world_id)` — رُفض:
          يجعل أي تخفيف مستقبلي للقاعدة (السماح بشخصية افتراضية واحدة لكل عالم بدل واحدة عالمياً) يتطلب Migration
          جديدة لإضافة فهرس لم يكن موجوداً، بدل حذف الفهرس الأضيق فقط والإبقاء على الأوسع الموجود سلفاً. (ج)
          محاولة اتصال Postgres مباشر (حزمة `pg` + `DATABASE_URL`) لتنفيذ DDL آلياً بدل SQL Editor يدوي — رُفض:
          تغيير في المكدس التقني (يضيف اعتماداً جديداً، سر بيئة جديد) يتجاوز نطاق "Migration واحدة"، ويخالف نمط
          كل يوم سابق في هذا المستودع بلا مبرر فعلي (اليوم اليدوي يعمل، بلا مخاطرة إضافية). (د) Backfill لكل
          أدوار `users` (بما فيها `merchant_owner`/`platform_admin`) — رُفض صراحة بقرار مؤسس مباشر (`CONFLICT-006`).
Why: قرار المؤسس المباشر — تأكيد صريح على نمط RLS (النمط 2، بلا استثناء) والخطوات الخمس بالترتيب (إنشاء، RLS،
          seed، backfill، تحقُّق حي بمحاولات فاشلة متعمَّدة) قبل التنفيذ. تصميم الفهرسين الجزئيين وقرار DDL اليدوي
          قرارات هندسية اتُّخذت أثناء التنفيذ بناءً على تحقُّق حي (غياب اتصال Postgres مباشر)، لا افتراضاً مسبقاً.
Consequences: `worlds`/`user_personas`/`sessions.active_persona_id` بيانات حية على Supabase الآن (`IMPLEMENTED`)
          لكن **بلا أي مستهلك كود** — لا `types.ts`، لا `khalil.repository.ts`/`khalil.service.ts` يقرأ/يكتب هذه
          الجداول بعد (مؤجَّل لليوم 20 صراحة بقرار المؤسس). لا واجهة تبديل شخصية، لا تكيّف محركات نواة — هذه
          الـMigration بنية تحتية دنيا فقط، تماماً كما وثَّق `docs/DIWAN_VISION.md → "الحالة الحالية مقابل الرؤية"`.
          `scripts/day19-context-engine-schema.sql` ليس جزءاً من `scripts/schema-setup.sql` (تأسيس مشروع جديد من
          الصفر) — أي بيئة `staging`/إنتاج مستقبلية تحتاج تطبيق كلا الملفين بالترتيب، لا الاكتفاء بالأول (فجوة
          موثَّقة، لم تُغلَق اليوم — خارج نطاق اليوم 19).
Related Documents: docs/DATABASE.md §3 (worlds, user_personas, sessions)، docs/DOMAIN_MAP.md → خليل، CONFLICT-006،
          docs/DIWAN_VISION.md، ideas/CONTEXTUAL_WORLDS_RFC.md، ADR-010 (منهجية التحقُّق الحي)، ADR-012 (نمط
          الجلسات)، scripts/day19-context-engine-schema.sql، scripts/day19-context-engine-seed-and-verify.ts
```

---

## سجل التعارضات (CONFLICT LOG)

### CONFLICT-001
```
بين: SALSABIL_CONSTITUTION.md §2/§7 (خليل/بيان/حكيم/برق/تيسير كـ"عوالم") مقابل §6 (نفس الخمسة كـ"محركات نواة")
الوصف: نفس الكيانات الخمسة موجودة بدورين مختلفين في مكانين مختلفين من الدستور نفسه — راجع docs/DOMAIN_MAP.md → OPEN_QUESTION-001 للتفصيل الكامل
التأثير: يحدد تصميم الشاشة الرئيسية لديوان (هل لهذه الخمسة أيقونات مستقلة؟)
يحتاج قراراً من: المؤسس
الحالة: OPEN

⚠️ تحديث 2026-09-01 (إشارة جزئية، لا حسم كامل): في محادثة "04 — UI/UX & Design Engine"، طلب المؤسس صراحة تصميم لوحة ألوان ورمز مستقلين لـ"بيان" ضمن قائمة موحّدة مع ريف/أسراب/نبض/نور الدين/تكوين (كل هذه "عوالم" بلا خلاف). هذا مؤشر FOUNDER_DECISION جزئي بأن بيان ستُعامَل بصرياً كعالم له هوية مستقلة (راجع docs/UI_UX_SYSTEM.md §8.4 وADR-007). **هذا لا يحسم وضع خليل/حكيم/برق/تيسير الأربعة الباقين** — لا يزالون بلا قرار صريح. السؤال الأصلي يبقى OPEN حتى تأكيد منفصل من المؤسس بخصوص الأربعة الباقين تحديداً.
```

### CONFLICT-002
```
بين: عنوان SALSABIL_CONSTITUTION.md ("النسخة 1.2") مقابل السطر الختامي في نهاية نفس الملف ("نهاية الوثيقة — النسخة 1.0")
الوصف: خطأ توثيقي بسيط — السطر الختامي لم يُحدَّث عند رفع رقم الإصدار من 1.0 إلى 1.2. تم التحقق من وجوده في نسخة Project Knowledge الفعلية أيضاً.
التأثير: لا تأثير وظيفي، لكنه يخالف مبدأ الاتساق الداخلي للدستور
يحتاج قراراً من: المؤسس (تصحيح بسيط، لكن هذا الملف لا يُعدَّل الدستور تلقائياً حسب القاعدة الصارمة المتفق عليها)
الحالة: OPEN — يُقترح تضمينه كتصحيح صغير عند أي تحديث رسمي قادم للدستور
```

### CONFLICT-003
```
بين: ملفين منفصلين في Project Knowledge بنفس المحتوى — "دستور_سلسبيل_ديوان_الوثيقة_المرجعية.md" و"SALSABIL_CONSTITUTION.md"
الوصف: تم رصد الاثنين أثناء التحقق من نسخة v1.2 (project_knowledge_search أعاد نفس المحتوى مرتين تحت اسمين مختلفين)
التأثير: يخالف مبدأ "Single Source of Truth" — قد يسبب التباساً مستقبلياً حول أيهما "الأصلي"
يحتاج قراراً من: المؤسس — يُقترح حذف أحد الملفين من Project Knowledge والإبقاء على واحد فقط
الحالة: OPEN
```

### CONFLICT-004
```
بين: docs/ROADMAP.md (يظهر اليوم 4 كـ NEXT واليوم 5 كـ PLANNED قبل هذا التحديث) مقابل تقرير المؤسس المباشر في محادثة 2026-09-01 ("اكتمل اليوم الرابع والخامس عبر Claude Code، commit 2de9345")
الوصف: docs/ROADMAP.md كان متأخراً عن الواقع الفعلي في المستودع — دَين توثيقي كلاسيكي (راجع docs/DOCUMENTATION_RULES.md §10)
التأثير: أي قراءة لـ ROADMAP.md وحده كانت ستعطي صورة حالة خاطئة عن تقدّم المشروع
يحتاج قراراً من: — تم التصحيح مباشرة في نفس هذا التحديث (docs/ROADMAP.md، اليوم 4 وَ5 → DONE) بصفته تتبعاً حياً وليس قراراً استراتيجياً يحتاج موافقة منفصلة
الحالة: RESOLVED — يُرجى فقط تأكيد أن commit 2de9345 يطابق فعلاً نطاق اليومين 4 و5 كما هو موصوف في §23 من الدستور
```

> **ملاحظة (اليوم 6):** كان هذا الرقم (CONFLICT-004) مستخدَماً سابقاً لتعارض مختلف تماماً (ملفات مرجع سريع مكررة في جذر المستودع — ARCHITECTURE.md, DATABASE.md, DOMAIN_MAP.md, ROADMAP.md, SECURITY.md)، حُسم فعلياً بحذف تلك الملفات (راجع `docs/CHANGELOG.md` بتاريخ 2026-09-01، commit إزالة الملفات المكررة). السجل الأصلي لذلك القرار استُبدل هنا بمحتوى مختلف أثناء تحديث خارجي على `docs/DECISIONS.md` — القرار نفسه لا يزال سارياً وموثَّقاً في CHANGELOG وGit، فقط سجل الـ ADR/CONFLICT الأصلي فُقد من هذا الملف تحديداً. يستحق قاعدة مزامنة أوضح مستقبلاً — لا حاجة لإجراء إضافي الآن.

### CONFLICT-005
```
بين: docs/UI_UX_SYSTEM.md §8.2 (افتراض أن shadcn/ui قد تكون مثبّتة، بناءً على وجود مجلد src/components/ui/) مقابل الواقع الفعلي في المستودع
الوصف: تحقَّق منه فعلياً اليوم 6 كما طلب موجّه المهمة: لا components.json في جذر المستودع، src/components/ui/ فارغ تماماً (لا ملفات)، لا class-variance-authority/clsx/tailwind-merge مثبَّتة، لا استخدام cn()/cva في أي مكان بالكود. shadcn/ui غير مثبّتة إطلاقاً.
التأثير: استُخدم مسار الاحتياط الموثَّق مسبقاً في موجّه اليوم 6 — أسماء المتغيرات الدلالية بادئة --sb- بصيغة Hex مباشرة، بدل الأسماء غير المسبوقة بصيغة HSL التي تتوقعها shadcn. لا حاجة لإعادة تسمية لاحقاً إلا إذا تقرر تثبيت shadcn/ui فعلياً — حينها يلزم تعديل globals.css وtheme-registry.ts معاً.
يحتاج قراراً من: — لا قرار معلَّق؛ المسار كان محدَّداً سلفاً في التوجيه لهذه الحالة بالذات. مسجَّل هنا للتوثيق فقط كما طلب موجّه اليوم 6 صراحة.
الحالة: RESOLVED
```

### CONFLICT-006
```
بين: ideas/CONTEXTUAL_WORLDS_RFC.md ("تنويه إلزامي — لا تنفيذ في المرحلة الحالية... أي تنفيذ فعلي لهذه الرؤية
          يتطلب قراراً صريحاً ومنفصلاً من المؤسس بعد استقرار النواة الحالية بالكامل") مقابل طلب المؤسس المباشر
          ببدء تنفيذ Context Engine فعلياً (اليوم 19: جداول `worlds`/`user_personas` على Supabase، RLS، seed،
          backfill)
الوصف: RFC العوالم السياقية (commit `3b12f5c`) اشترط صراحة بوابة قرار مؤسس منفصلة قبل أي كتابة كود أو تعديل
          هيكلي مرتبط بها، لأنه صيغ كـ"مسودة معمارية استراتيجية... غير مُجدولة ضمن Phase 1 ولا Phase 2 الحالية".
          رسالة المؤسس بتاريخ 2026-09-04 (بعد نقل المستودع من OneDrive لهارد محلي) تُعلن هذه البوابة **محسومة** —
          استناداً لِـ docs/ROADMAP.md السطر 23 الذي يسمّي المحطة القادمة صراحة: "Phase 2 Preparation (Contextual
          Worlds & Ecosystem Scaling)" — أي أن Phase 2 نفسها، بحسب خارطة الطريق الحية، هي مرحلة بناء هذه الرؤية،
          لا مرحلة مؤجَّلة إلى ما بعدها.
          **⚠️ فجوة استمرارية موثَّقة صراحة (لا إخفاء لها، بنفس منهج تحفُّظ ADR-006):** الجلسة التي أنتجت "الأسئلة
          الأربعة" المُشار إليها في رسالة المؤسس، وكذلك "الخطة السابقة" التفصيلية لتنفيذ اليوم 19 (تصميم دقيق
          لجدولي `worlds`/`user_personas`، الفهرسان الجزئيان، `sessions.active_persona_id`)، **فُقدت فعلياً قبل
          نقل المشروع** — لا أثر لها في هذا المستودع (لا commit، لا ملف في `ideas/`، لا ذاكرة جلسة سابقة). القرارات
          الأربعة المُدرجة هنا (بوابة RFC محسومة؛ تسمية `worlds`/`user_personas`؛ Backfill لصفوف `customer` الحالية
          فقط دون التاجر التجريبي أو حساب الإدارة؛ عالم الأطفال خارج النطاق كلياً بلا صف اليوم) **مُسجَّلة هنا كما
          نقلها المؤسس في رسالته فقط** — لا كتحقُّق مستقل من نص أصلي مفقود. أي تفصيل تقني إضافي من "الخطة السابقة"
          غير المذكور صراحة في رسالة المؤسس (شكل SQL الدقيق للفهرسين الجزئيين، إلخ) سيُعاد بناؤه من الصفر عند
          تنفيذ اليوم 19 فعلياً، لا استرجاعاً لنص مفقود — سيُوسَم أي إعادة بناء كهذه `⚠️ إعادة بناء (INFERRED)`
          بنفس نمط `scripts/schema-setup.sql` (`ADR-017`).
التأثير: يفتح الباب أمام كتابة كود/مخطط فعلي لأول مرة تحت مظلة Context Engine (جدولا `worlds`/`user_personas`)،
          بعد أن كانت الوثيقة بأكملها بحدود تصورية بحتة منذ إضافتها. لا يُغيِّر شيئاً في RFC نفسها كنص — التنفيذ
          الفعلي يُوثَّق بـADR منفصل عند اكتماله.
يحتاج قراراً من: — تم الحسم في هذا التحديث بصفته القرار المنفصل نفسه الذي اشترطه RFC؛ لا حاجة لموافقة إضافية على
          البوابة ذاتها. أي تفصيل تقني يتجاوز الأربعة المُدرجين أعلاه يبقى بحاجة تأكيد صريح إن ظهر تعارض عند التنفيذ.
الحالة: RESOLVED — التنفيذ الفعلي (اليوم 19) موثَّق في `ADR-018`
Related Documents: ideas/CONTEXTUAL_WORLDS_RFC.md، docs/DIWAN_VISION.md (جديد — الرؤية الأوسع مدى التي ينتمي
          إليها RFC العوالم السياقية كجزء تنفيذي أول منها فقط)، docs/DATABASE.md §3/§4، docs/DOMAIN_MAP.md → خليل،
          ADR-018 (التنفيذ الفعلي)
```