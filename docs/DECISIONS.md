---
title: سجل القرارات المعمارية (Decision Log / ADR Index)
status: ACTIVE
version: 1.38
authority: Security & Correctness (قسم DECISION DEBT REGISTRY) + Engineering Decision Log (باقي الملف)
last_updated: 2026-09-19
last_verified: 2026-09-14
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

⚠️ تعديل توضيحي (2026-09-05، لا استبدال — يُقرأ مع النص الأصلي أعلاه لا بدلاً منه):
توضيح صريح إضافي على Phase 2 (`national_id`): هذا الحقل، متى بُني، يُخزَّن **كاملاً (14 رقماً)** كمعرّف
داخلي فقط — لا يظهر أبداً في أي تجربة مستخدم يومية. الدخول والبحث عن المستخدم يبقيان دائماً برقم
الهاتف (نفس نمط `findUserByPhone`/`findOrCreateCustomerByPhone` القائم فعلياً اليوم)، لا بـ`national_id`
ولا بأي جزء منه، في أي مسار واجهة (عميل/تاجر/إدارة).
**تصحيح صريح على أي افتراض ضمني سابق باختصار `national_id` لآخر 6 أرقام منه (كمعرّف عرض مختصر
أو مفتاح بحث ثانوي):** هذا **مرفوض** — تصادم رياضي مؤكد عند نمو حقيقي في عدد المستخدمين
(10^6 احتمال فقط لآخر 6 أرقام؛ مواليد نفس المحافظة/الشهر تتشارك بادئات كثيرة من الرقم القومي
المصري، ما يرفع احتمال التصادم الفعلي أعلى من التوزيع العشوائي النظري لـ10^6). لا مبرر فعلي للاختصار
أصلاً — الحقل داخلي بحت (لا يُعرض للمستخدم، Phase 2 لم يُبنَ بعد)، فلا حاجة لصيغة "قصيرة يسهل تذكرها".
Related Documents (إضافية لهذا التعديل): docs/DATABASE.md §4 (national_id/is_verified، لا تزال
          CONCEPTUAL، لا تغيير بنيوي هنا)
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

## ADR-019
```
Title: اليوم 21 — ربط Context Engine بـservice.ts: ensureIndividualPersona عبر
          findOrCreateCustomerByPhone، واكتشاف/إصلاح تسرّب بيانات حي في 4 ملفات اختبار موجودة مسبقاً
Status: ACCEPTED
Date: 2026-09-04 (اليوم 21)
Decision: (أ) `KhalilService.ensureIndividualPersona(userId)` جديدة — تبحث عن عالم `individuals`
          (`findWorldBySlug`)، ثم عن شخصية المستخدم فيه (`findPersonaByUserAndWorld`)، تُنشئ واحدة
          افتراضية فقط عند عدم الوجود (`createPersona`، `isDefault: true`). ترمي خطأً صريحاً إن لم
          يوجد عالم `individuals` أصلاً (لا فشل صامت — نفس فلسفة كل فحص `if (error) throw error`
          في المشروع).
          (ب) `findOrCreateCustomerByPhone` (اليوم 8، `ADR-009`) مُعدَّلة الآن — بعد إيجاد/إنشاء
          المستخدم، تستدعي `ensureIndividualPersona(user.id)` قبل الإرجاع، لكل من العميل الموجود
          مسبقاً والعميل الجديد على حدٍّ سواء (دفاعي للأول: Backfill اليوم 19 يفترض تغطيته، لكن
          التحقق لا يكلّف شيئاً حقيقياً بفضل الفهرس الجزئي). التوقيع (`Promise<User>`) لم يتغيّر —
          `orders.service.ts.checkout` (المستدعي الوحيد) لم يحتَج أي تعديل.
          (ج) **⚠️ اكتُشف حياً أثناء التنفيذ (لا افتراضياً) تسرّب بيانات حقيقي** في أربعة ملفات
          اختبار قائمة مسبقاً: `orders.integration.test.ts` (موضعان)، `reef-city-journey.integration
          .test.ts`، `admin.integration.test.ts`. كلها تحذف صف `users` بعد الاختبار عبر
          `supabaseAdmin.from('users').delete()...` **بلا فحص `error`** — والآن، بما أن Checkout
          الحقيقي ينشئ صف `user_personas` أيضاً (بلا `on delete cascade` على `user_id`)، فشل حذف
          `users` بقيد مفتاح أجنبي (`23503`) **بصمت تام** (لا رمي، لا فشل اختبار ظاهر) — تحقَّقتُ
          حياً بتشغيل `orders.integration.test.ts` بعد الربط مباشرة: تسرَّب 8 صفوف `users`/
          `user_personas` حقيقية فعلياً على Supabase قبل ملاحظة المشكلة، نُظِّفت يدوياً بعد التأكد
          أنها من تشغيل الاختبار لا بيانات مؤسس حقيقية (بصمة `created_at` متطابقة زمنياً مع وقت
          التشغيل، بمعزل تام عن الخمسة عملاء الحقيقيين من Backfill اليوم 19).
          (د) الإصلاح: حذف `user_personas` بمفتاح `user_id` قبل حذف `users` في كل الأماكن الأربعة —
          لا تغيير في فلسفة "بلا فحص خطأ" القائمة أصلاً لكود التنظيف في هذا المشروع (نفس نمط باقي
          أسطر `afterAll` المجاورة)، فقط ترتيب الحذف الصحيح احتراماً لقيد FK جديد.
          (هـ) اختبار تكامل حي جديد في `orders.integration.test.ts` يثبت مباشرة أن **Checkout
          الحقيقي** (لا استدعاء `khalilService` منعزلاً) ينشئ `user`+`persona` معاً، بما فيه تحقُّق
          idempotency حي (Checkout ثانٍ بنفس الهاتف لا يُنشئ شخصية مكرَّرة — الفهرس الجزئي من
          `ADR-018` يعمل عملياً، لا نظرياً فقط). استدعى إعادة هيكلة `createdOrderId`/`createdUserId`
          المفردين في نفس الوصف (`describe`) إلى مصفوفات `orderIdsToClean`/`userIdsToClean` — متغير
          مفرد يُعاد تعيينه في اختبارين كان سيُسرِّب بيانات الاختبار الأول بصمت (نفس فئة الخلل في (ج)
          تماماً، لو لم يُلاحَظ الآن).
          (و) `orders.service.test.ts` (وحدة، يموّه `khalil.repository.ts`) احتاج تحديث كائن الـmock
          بإضافة `findWorldBySlug`/`findPersonaByUserAndWorld`/`createPersona` بقيم افتراضية — بلا
          ذلك، كل اختبار يمر عبر Checkout الحقيقي (غير المموَّه، لأن الـmock هنا على مستوى
          `repository` لا `service`) كان سيفشل بـ"is not a function" بلا علاقة بمنطق الطلبات المُختبَر
          فعلياً.
Context: طلب المؤسس ربط `service.ts` بالضبط بالدالتين المحدَّدتين + اختبار تكامل حي يثبت Checkout
          ينشئ user+persona معاً. عند تنفيذ الاختبار الحي فعلياً (لا افتراضاً) لأول مرة بعد الربط،
          ظهر الخلل في (ج) مباشرة كتسرّب بيانات حقيقي على Supabase — تحقُّق حي كشف ما كان سيبقى غير
          مكتشَف لو اكتُفي بقراءة الكود دون تشغيله فعلياً ضد قاعدة بيانات حقيقية.
Alternatives: (أ) `ON DELETE CASCADE` على `user_personas.user_id` بدل حذف يدوي مرتَّب في كل ملف
          اختبار — رُفض: يغيّر تعريف عمود FK فعلي في مخطط حي (`ADR-018`) لمجرد راحة كود اختبار، بلا
          مبرر لسلوك الإنتاج نفسه (حذف مستخدم حقيقي لا يجب أن يحذف شخصياته صامتاً في سياق تشغيلي —
          قرار حذف مستخدم كامل خارج نطاق اليوم 21 أصلاً). (ب) ترك التسرّبات الثمانية كما هي (بيانات
          اختبار غير ضارة على بيئة dev) — رُفض: يخالف انضباط "بيئة الاختبار نظيفة دائماً" المتَّبع في
          كل ملف اختبار سابق في هذا المشروع؛ التنظيف اليدوي فوري ورخيص، لا مبرر لتركها. (ج) تجاهل
          تحديث `orders.service.test.ts` والاكتفاء بالتحقق أن اختبارات التكامل تعمل — رُفض: كان سيترك
          اختبار وحدة قائم يفشل بخطأ مضلِّل ("is not a function") لا علاقة له بالتغيير الحقيقي، يخالف
          مبدأ ترك المجموعة الكاملة خضراء دائماً.
Why: قرار المؤسس المباشر بربط `service.ts`. اكتشاف وإصلاح التسرّب والـmock الناقص كلاهما نتيجة مباشرة
          لالتزام بند الدستور "تحقُّق حي لا افتراضي" (`SALSABIL_CONSTITUTION.md` §22-24) — لم يُطلَبا
          صراحة، لكن تركهما بلا إصلاح كان سيناقض جوهر طلب المؤسس نفسه ("اختبار تكامل حي يثبت...").
Consequences: أي دالة مستقبلية تُنشئ `user_personas` (لا `findOrCreateCustomerByPhone` وحدها) يجب أن
          يتذكر أي كود تنظيف/حذف مستخدمين مرتبط بها هذا الترتيب (`user_personas` قبل `users`) — خطر
          تكراره في ملفات اختبار مستقبلية يبقى قائماً ما لم يُضَف `ON DELETE CASCADE` صراحة لاحقاً
          بقرار مؤسس منفصل (راجع Alternatives أ). `ensureIndividualPersona` يُحمِّل الآن Checkout
          اعتماداً جديداً على وجود صف `worlds` بـslug `individuals` — إن حُذف هذا الصف يدوياً من
          Supabase مستقبلاً (لا مبرر لذلك اليوم)، **يتعطَّل Checkout بالكامل** لا شخصية المستخدم فقط
          (يرمي `ensureIndividualPersona` قبل أي إنشاء طلب). فجوة معروفة، مقبولة الآن لعالم واحد لا
          يُتوقَّع حذفه، غير مؤمَّنة دفاعياً (لا try/catch يُسقِط هذا التحقق بصمت — قرار متعمَّد: فشل
          صريح أفضل من نجاح Checkout بلا شخصية متسقة).
Related Documents: docs/DATABASE.md §3 (worlds/user_personas)، docs/DOMAIN_MAP.md → خليل، ADR-018،
          ADR-009 (findOrCreateCustomerByPhone الأصلية)، src/core/kernel/khalil/service.ts،
          src/core/kernel/khalil/service.test.ts، src/core/modules/orders/orders.integration.test.ts،
          src/core/modules/orders/orders.service.test.ts، src/core/e2e/reef-city-journey.integration
          .test.ts، src/core/modules/admin/admin.integration.test.ts
```

---

## ADR-020
```
Title: اليوم 22 (تمهيدي) — سياسة حذف صريحة على user_personas.user_id: ON DELETE RESTRICT لا
          CASCADE، معالجة الجذر لا الأعراض فقط بعد اكتشاف ADR-019
Status: ACCEPTED — طُبِّق ومُتحقَّق منه حياً (DDL يدوي عبر SQL Editor، نفس نمط اليوم 19)
Date: 2026-09-04 (اليوم 22)
Decision: `user_personas.user_id references users(id)` أصبحت صراحة `on delete restrict` — لا
          `cascade`. القيد الفعلي **لم يتغيّر سلوكياً** (الافتراضي السابق بلا `ON DELETE` صريح كان
          `NO ACTION`، يتصرف مطابقاً تماماً لـ`RESTRICT` هنا لأن القيد غير `DEFERRABLE`) — هذا توضيح
          نية صريحة موثَّق، لا إصلاح سلوك فعلي مختلف؛ القرار بتطبيقه فعلياً (بدل الاكتفاء بتوثيق ADR
          فقط) تُرِك لتقدير Claude التقني بتفويض صريح من المؤسس، واختير التطبيق لأن أي قارئ مستقبلي
          لملف `scripts/day19-context-engine-schema.sql` مباشرة (بلا رجوع لهذا الـADR) كان سيرى قيداً
          عارياً بلا أي إشارة لنية الحذف. راجع `scripts/day22-user-personas-fk-policy.sql` (منفصل
          عمداً عن `scripts/day19-context-engine-schema.sql` الأصلي، بطلب المؤسس صراحة — لا تُعدَّل
          ملفات Migration سابقة بعد تطبيقها).
          **تحقُّق حي (لا افتراضي) بعد التطبيق:** مستخدم اختباري مؤقت + شخصية في عالم `individuals` —
          محاولة حذف المستخدم مباشرة رُفضت فعلياً بكود `23503` بالضبط، المستخدم بقي موجوداً فعلياً بعد
          الرفض (لا نجاح صامت رغم رسالة خطأ)، ثم التنظيف الصحيح (الشخصية أولاً، فالمستخدم) نجح بلا أي
          أثر متبقٍ. القاعدة عادت لحالتها المستقرة تماماً بعد الاختبار: 5 عملاء / 5 شخصيات / عالم واحد.
Context: `ADR-019` (اليوم 21) أصلح **عرَض** المشكلة (ترتيب الحذف في 4 ملفات اختبار كان يفشل بصمت
          بقيد FK)، لكن لم يحسم **الجذر**: ما هي السياسة المقصودة فعلياً عند حذف مستخدم حقيقي له
          شخصيات؟ لا واجهة تحذف مستخدمين اليوم إطلاقاً (لا استعجال فعلي)، لكن ترك القيد بسلوك
          افتراضي ضمني غير مقصود (بدل قرار صريح موثَّق) يخالف انضباط هذا المستودع — كل قيد FK آخر في
          `scripts/day19-context-engine-schema.sql`/`scripts/schema-setup.sql` إما `on delete
          cascade` صريح (`cart_items.cart_id`, `order_items.order_id`, `order_status_history.
          order_id`) أو موثَّق بلا `ON DELETE` عمداً لسبب مذكور — لا قيد "منسي" بلا قرار.
Alternatives: (أ) **`ON DELETE CASCADE`** — حذف `users` يحذف شخصياته تلقائياً وصامتاً. **رُفض**: يخالف
          روح `SALSABIL_CONSTITUTION.md §4` بند 5 ("كل تحوّل... يُسجَّل في سجل تدقيق") — `worlds`/
          `user_personas` بيانات **هوية وصلاحيات** (`docs/DATABASE.md §4` تحذير التسمية، `ADR-018`)،
          لا بيانات مشتقة يمكن تحمّل فقدانها الصامت كـ`cart_items` عند حذف سلة (حيث `CASCADE` مبرَّر
          فعلاً لأن السلة والبنود كيان واحد منطقياً). فقدان شخصية مستخدم بصمت عند أي عملية حذف
          مستقبلية (بما فيها خطأ تشغيلي) بلا أي أثر — يناقض بالضبط الميزة التي بُنيت من أجلها هذه
          الجداول أصلاً (سياق هوية موثوق). (ب) ترك القيد بلا `ON DELETE` صريح كما هو (الوضع الحالي
          فعلياً) — رُفض: نفس النقد الذي طرحه المؤسس بالضبط — "سلوك افتراضي ضمني غير مقصود" لا يُعتبر
          قراراً معمارياً موثَّقاً، حتى لو كان سلوكه مطابقاً لـRESTRICT عملياً؛ صراحة النص التوثيقي جزء
          من قيمة القرار نفسه (يمنع مطوّراً مستقبلياً — بشرياً أو ذكاءً اصطناعياً — من افتراض
          `CASCADE` خطأً لعدم رؤية عكس ذلك مكتوباً). (ج) `ON DELETE SET NULL` — غير ممكن أصلاً:
          `user_personas.user_id` معرَّف `not null` (شخصية بلا مالك لا معنى لها) — رُفض بداهةً، غير
          مطروح فعلياً كخيار حقيقي.
Why: قرار المؤسس المباشر — طلب تقييماً صريحاً بين الخيارين مع تبرير، لا تنفيذاً بلا نقاش. الاختيار
          هنا (`RESTRICT`) امتداد مباشر لنمط قرارات سابقة في هذا المستودع تفضّل الفشل الصريح على
          النجاح الصامت (`ADR-009` رفض تعدد التجار صراحة بدل طلب خاطئ صامت، `ensureIndividualPersona`
          نفسها في `ADR-019` ترمي خطأً صريحاً بدل `try/catch` صامت).
Consequences: **لا تأثير تشغيلي فوري** — لا كود يحذف صفوف `users` اليوم (لا واجهة، لا Server Action).
          أي ميزة مستقبلية "حذف حساب مستخدم" **يجب** أن تتعامل صراحة مع `user_personas` أولاً (حذف
          شخصياته، أو نقلها، أو رفض الحذف كلياً وعرض ذلك للمستخدم كسبب واضح) — `RESTRICT` يفرض هذا
          القرار وقت الحاجة الفعلية، لا يسمح بتجاهله. **مرتبط مباشرة بـ`docs/DATABASE.md §7`
          (`OPEN_QUESTION`: Soft Delete مقابل Hard Delete للمستخدمين عموماً)** — هذا الـADR يحسم جزءاً
          ضيقاً منه فقط (سياسة FK الفنية لـ`user_personas` تحديداً)، **لا** يحسم السؤال الأشمل
          (Soft/Hard Delete لجدول `users` نفسه، أو لأي جدول آخر) الذي يبقى `OPEN_QUESTION` صراحة كما
          هو. لم يُلمَس `world_id` (لا `user_personas.world_id`، ولا `sessions.active_persona_id`) —
          خارج نطاق طلب المؤسس المحدَّد (`user_id` تحديداً)، ولا مبرر عملي اليوم (لا كود يحذف `worlds`
          أو `user_personas` إطلاقاً بعد) — قد يحتاج قراراً مشابهاً منفصلاً عند ظهور حاجة فعلية.
Related Documents: docs/DATABASE.md §3 (user_personas)، §7 (OPEN_QUESTION Soft/Hard Delete)، ADR-018،
          ADR-019، SALSABIL_CONSTITUTION.md §4 بند 5، scripts/day22-user-personas-fk-policy.sql
```

---

## ADR-021
```
Title: اليوم 23 — بيان (Bayan): أول تنفيذ فعلي لمحرك المحتوى (posts/post_media/post_products)،
          BAYAN-HOME-FEED-001
Status: ACCEPTED — طُبِّق ومُتحقَّق منه حياً (DDL يدوي عبر SQL Editor، نفس نمط الأيام 19/22)
Date: 2026-09-05 (اليوم 23)
Decision: (أ) ثلاثة جداول جديدة — `posts` (منشور واحد، `world_scope uuid references worlds(id)` إلزامي
          من اليوم الأول لكل جدول في هذه المهمة، `category_id references categories(id)`، `post_type`
          محصور بـ`CHECK` في `('post','reel','product_highlight','offer')`، `priority int` ترتيب يدوي
          فقط — لا خوارزمية توصية)، `post_media` (صور مرتَّبة لكل منشور، `link jsonb` بشكل Discriminated
          Union — `ProductLink | RecipeLink | NoLink` — مفروض TypeScript فقط لا قاعدة بيانات، نفس فلسفة
          `products.options`، `ADR-004`)، `post_products` (الرف الأفقي أسفل المنشور، مستقل عن روابط
          الصور الفردية).
          (ب) RLS — **النمط 1 (قراءة عامة)**، لا النمط 2 المقفول المستخدَم لـ`worlds`/`user_personas`
          (`ADR-018`): `posts` سياسة `is_published = true`؛ `post_media`/`post_products` سياسة `true`
          (قراءة كل الصفوف) لأنهما بلا عمود `is_published` خاص بهما — عزل "لا تُعرَض صور منشور مسودة"
          مُطبَّق في `bayan.service.ts` (طبقة التطبيق)، لا RLS، **نفس نمط عزل المستأجرين الموثَّق فعلياً
          في `orders.service.ts` (`ADR-012`) لا سابقة جديدة**. كتابة عبر `service_role` حصراً من لوحة
          الإدارة (اليوم 24) — لا سياسة كتابة لـ`anon` على أي من الثلاثة.
          (ج) `src/core/modules/bayan/` — يعكس شكل `src/core/modules/catalog/` حرفياً (`types.ts` +
          `bayan.repository.ts` + `bayan.service.ts`، كل كلاس بصيغة singleton مُصدَّر). المستودَع
          يستخدم **عميلين معاً**: `supabase` (anon) لدوال القراءة العامة (الخلاصة)، `supabaseAdmin`
          (service_role) لدوال الإدارة (تشمل قراءة المسودات + كل الكتابة) — نفس القاعدة الصريحة في
          `docs/ARCHITECTURE.md §3.1` ("اختيار العميل يُحسَم عند تصميم RLS، لا بعده").
          (د) `khalilService.listActiveWorlds()` — تمريرة رقيقة جديدة (إضافية بحتة، بلا لمس أي دالة
          قائمة) تكشف `khalilRepository.listActiveWorlds()` الموجودة أصلاً (اليوم 20) لأي نطاق خارج
          `kernel/khalil/` — أول مستهلك لها `bayan.service.ts.getIndividualsWorldId()`، والثاني المخطَّط
          له مبدّل العوالم في الواجهة (اليوم 29).
          (هـ) `BayanService.scaleRecipeQuantities()` — قياس خطي بسيط (`baseQuantity × familySize ÷
          baseFamilySize`، مقرَّب، بحد أدنى 1) لتحويل مكوّنات وصفة إلى كميات مقترحة عند تغيير عدد أفراد
          العائلة. لا حساب تغذوي حقيقي ولا اقتراح ذكي — حساب حسابي بحت، بانضباط "لا خوارزمية توصية
          حقيقية (حكيم)" المذكور صراحة في نطاق المهمة.
          (و) الوصفة (`RecipeLink`) مُخزَّنة **داخل** `post_media.link jsonb` مباشرة، لا في جدول
          `recipes` منفصل — لا حاجة فعلية اليوم لإعادة استخدام وصفة عبر أكثر من منشور واحد.
Context: Context Engine (خليل، الأيام 19-22) أُغلق. هذه أول مهمة تبني نطاقاً استهلاكياً حقيقياً فوقه
          (`bayan.service.ts` يستدعي `khalilService.listActiveWorlds()` مباشرة، نفس نمط
          `orders.service.ts` مع `khalilService`/`cartService`/`catalogService`). المؤسس اشترط صراحة أن
          يحمل كل جدول `world_scope` من اليوم الأول (بنفس انضباط `products.tenant_id` الاستباقي منذ
          اليوم 4)، رغم وجود صف واحد فقط (`individuals`) في `worlds` اليوم.
Alternatives: (أ) `world_scope` نص/enum حر (كما ورد حرفياً في موجّه المهمة) بدل FK حقيقي إلى
          `worlds(id)` — رُفض لصالح FK: يمنع بنيوياً أي إشارة لعالم غير موجود، ويطابق سابقة
          `user_personas.world_id` في `ADR-018` نفسها. مُوثَّق صراحة كانحراف طفيف عن نص الموجّه الحرفي،
          لا قراراً صامتاً. (ب) النمط 2 (قفل كامل، نفس `worlds`/`user_personas`) بدل النمط 1 لهذه
          الجداول — رُفض: `posts`/`post_media`/`post_products` محتوى عام يتصفحه أي زائر ريف اليوم بلا
          مصادقة (نفس فئة `products`/`categories`)، لا بيانات هوية/صلاحيات حساسة. (ج) جدول `recipes`
          منفصل قابل لإعادة الاستخدام عبر منشورات متعددة — رُفض حالياً، بلا مبرر تجاري فعلي اليوم؛ شكل
          `RecipeLink` المعزول في الكود يجعل الاستخراج لاحقاً غير مكلف إن ظهرت حاجة فعلية. (د) بادئة
          `bayan_` على أسماء الجداول (`bayan_posts`...) لتفادي عمومية اسم "posts" — رُفض لصالح مطابقة
          العُرف القائم فعلياً في هذا المستودع (`products`/`orders`/`merchants` بلا بادئة نطاق)؛ مُوثَّق
          كخيار قابل للنقاش لا حسماً نهائياً.
Why: قرار المؤسس المباشر (BAYAN-HOME-FEED-001، بعد Spec+Plan مُوافَق عليه صراحة عبر EnterPlanMode/
          ExitPlanMode) — تفاصيل `post_type`/إدخال الصور/تخزين تفضيل الثيم حُسمت عبر AskUserQuestion قبل
          أي كتابة كود. تصميم الفهرس/RLS/الشكل الداخلي لكل جدول قرارات هندسية اتُّخذت أثناء التنفيذ
          بانضباط نفس منهجية `ADR-018`/`ADR-020`.
Consequences: **تحقُّق حي (لا افتراضي) بعد التطبيق (8/8 نجحت):** منشور حقيقي بصورتين (رابط منتج + رابط
          وصفة) ومسودة حقيقية — `anon` قرأ المنشور المنشور بنجاح ولم يقرأ المسودة إطلاقاً (لا خطأ، صف
          فارغ فعلياً، يطابق سياسة `is_published = true`)؛ ثلاث محاولات إدراج فاشلة متعمَّدة رُفضت
          بالضبط بالأكواد المتوقَّعة (`23503` مرتين لِـ`world_scope`/`category_id`، `23514` لِـ
          `post_type`)؛ حذف المنشور المنشور حذف صوره وروابط منتجاته تلقائياً (`on delete cascade`) بلا
          أي صف يتيم متبقٍ. القاعدة عادت لصفر صفوف في الجداول الثلاثة بعد التنظيف الكامل. لا مستهلك
          واجهة بعد (لوحة الإدارة اليوم 24، الخلاصة نفسها الأيام 26-27) — بنية باك-إند مُختبَرة وحدياً
          بالكامل (103 اختباراً) ومُتحقَّق منها حياً الآن. `post_media`/`post_products` بلا حماية RLS جوهرية على مستوى الصف (سياسة `true`) —
          مقبول لأنه محتوى عام أصلاً بالتصميم، لا فجوة أمنية حقيقية طالما `posts.is_published` هو حارس
          الظهور الفعلي الوحيد المُطبَّق في طبقة الخدمة. أي دالة قراءة عامة مستقبلية على `post_media`/
          `post_products` **يجب** أن تمر عبر `bayan.service.ts` (الذي يستبعد صور/منتجات المسودات)، لا
          استعلاماً مباشراً على الجدولين — نفس تحذير `getOrderWithItems`/`getStatusHistory` في
          `ADR-014`.
Related Documents: docs/DATABASE.md §3 (posts/post_media/post_products)، docs/DOMAIN_MAP.md → بيان،
          ADR-004 (سابقة JSONB)، ADR-012 (سابقة عزل مستأجرين بطبقة تطبيق لا RLS)، ADR-018 (سابقة FK
          لـworld_id)، ADR-019 (سابقة استيراد service-to-service)، scripts/day23-bayan-schema.sql،
          scripts/day23-bayan-seed-and-verify.ts، src/core/modules/bayan/، src/core/kernel/khalil/service.ts
```

---

## ADR-022
```
Title: إصلاحات حرجة بعد التدقيق الشامل (CRITICAL-FIXES-FROM-AUDIT-001) — قفل Single-Flight
          لـIdempotency، خصم مخزون بالتزامن المتفائل (يحسم كتابة service_role الأولى على
          inventory)، تعويض تطبيقي لحدود المعاملة، وتوحيد عزل المستأجرين على القراءة التفصيلية
Status: ACCEPTED — طُبِّق ومُتحقَّق منه حياً (كود + اختبارات وحدة/تكامل حية + تحقُّق RLS حي مباشر،
          17/17 فحصاً نجح)
Date: 2026-09-05 (بعد FULL-ARCHITECTURE-SECURITY-AUDIT-001 مباشرة، نفس اليوم)
Decision: (أ) **Idempotency** — `Map<cartId, Promise<Order>>` في-الذاكرة (`inFlightCheckouts`،
          `orders.service.ts`) يُشارِك نفس الـ`Promise` قيد التنفيذ بين طلبين متزامنين فعليين لنفس
          السلة (`cart.id`)، فيحصلان على نفس نتيجة الطلب بالضبط بدل تنفيذ Checkout مرتين. حالة
          "إعادة محاولة حقيقية بعد نجاح سابق فعلي" (لا تزامن حقيقي) محمية أصلاً بسلوك قائم بلا
          حاجة لآلية إضافية: `clearCart()` في نهاية `checkout()` تُفرغ السلة، فإعادة محاولة لاحقة
          تُقابَل بخطأ "السلة فارغة" الواضح.
          (ب) **سباق المخزون (TOCTOU)** — `InventoryRepository.decrementIfAvailable()` تُستبدِل
          `isAvailable()` عند نقطة الاستهلاك الفعلية داخل `checkout()`: قراءة `quantity_available`
          ثم `UPDATE` واحد مشروط بمطابقة القيمة المقروءة بالضبط (Optimistic Concurrency) — كل
          `UPDATE` في Postgres ذرّي على مستوى الجملة نفسها لصف واحد، فلو عدَّل طرف آخر الصف بين
          القراءة والكتابة، شرط المطابقة يفشل (0 صفوف)، فتُعاد المحاولة بقراءة جديدة (حتى 3
          محاولات) بدل الكتابة فوق قيمة قديمة. **قرار جانبي يحسم `OPEN_QUESTION` موثَّق مسبقاً
          صراحة (`docs/SECURITY.md §5`, `docs/DATABASE.md §6`):** الكتابة (خصم/استرجاع) تمر عبر
          `supabaseAdmin` (`service_role`) لا `supabase` (`anon`) — أول كتابة فعلية على `inventory`
          في المشروع، تُحسَم بنفس نمط كل جدول آخر بلا سياسة كتابة `anon` موثَّقة (`merchants`/
          `carts`/`orders`): `service_role` يتجاوز RLS بالكامل، لا حاجة لسياسة `anon` جديدة على
          جدول النمط 1 (قراءة عامة) نفسه. القرار **يحسم `inventory` تحديداً فقط** — `categories`/
          `products`/`users` يبقون `OPEN_QUESTION` كما هم (لا كود كتابة عليهم بعد).
          (ج) **حدود المعاملة (Transaction Boundaries)** — لا معاملة DB ذرّية حقيقية تربط خصم
          المخزون بإنشاء الطلب (امتداد لنفس القيد الموثَّق أصلاً بين `orders`/`order_items` في
          `ADR-009`). استراتيجية تعويضية صريحة بدل معاملات موزَّعة كاملة: `reservations` تتبّع كل
          خصم نجح في المحاولة الحالية بالذات، وأي فشل لاحق (بند آخر غير متوفر، فشل دفع، فشل إنشاء
          الطلب/البنود) يُعيد كل ما خُصم فوراً عبر `inventoryService.release()` قبل رمي الخطأ
          الأصلي للمتصل — لا خطأ الاسترجاع نفسه لو حدث (فقدان مخزون صامت أخطر من رسالة غامضة).
          (د) **توحيد عزل المستأجرين على القراءة** — `getOrderWithItems`/`getStatusHistory`
          (`orders.service.ts`) كانتا بلا معامل "فاعل" إطلاقاً (فخّ كامن موثَّق منذ `ADR-014`، لا
          مستهلك فعلي وقت الإصلاح — تحقُّق مُعاد مباشرة قبل التعديل، لم يتغيّر). التوقيعان الآن
          يتطلبان `actor: OrderActorContext` (`{ role, tenantId? }`) إلزامياً في نوع TypeScript
          نفسه — أي استدعاء مستقبلي بلا سياق فاعل يفشل وقت الترجمة (compile error) لا وقت التشغيل
          فقط. دالة خاصة مشتركة جديدة `assertActorCanAccessOrder()` تُستهلَك الآن من ثلاث دوال معاً
          (`transitionStatus` أيضاً، لا نسختين منفصلتين من نفس منطق `TENANT_SCOPED_ACTOR_ROLES`).
Context: `FULL-ARCHITECTURE-SECURITY-AUDIT-001` (تدقيق شامل، نفس اليوم، تقرير منفصل لا ملف في
          المستودع) كشف خمس فجوات P0 بأدلة ملف+سطر مباشرة، لا انطباعاً: عدم وجود Idempotency على
          `checkout()`، سباق TOCTOU حقيقي على `inventory` (مُثبَت بيعاً مضاعفاً فعلياً قبل الإصلاح)،
          غياب حدود معاملة موثَّقة، `getOrderWithItems`/`getStatusHistory` بلا سياق فاعل، وتحقُّق
          حي غير مؤكَّد لـRLS (كان `UNKNOWN` صراحة في التدقيق لعدم توفر اتصال Supabase حي وقتها).
          كل بند من الأربعة (أ-د) طُبِّق بدورة صارمة: اختبار حي يُثبِت الفشل الفعلي **قبل** الإصلاح
          (بند أ: طلبان متزامنان فعليان أنتجا معرِّفَي طلب مختلفين حقيقياً؛ بند ب: طلبان متزامنان
          فعليان لعميلين مختلفين باعا القطعة الأخيرة نفسها معاً فعلياً؛ بند د: تحقُّق مباشر بحث
          شامل أن لا مستهلك موجود، لا اختباراً ديناميكياً لأن الفجوة غياب ميزة لا سباقاً زمنياً) —
          ثم إصلاح — ثم إعادة الاختبار نفسه لإثبات النتيجة الصحيحة. تسرَّب صف اختبار واحد حقيقي
          (طلب + مستخدم) إلى قاعدة بيانات dev أثناء عزل سيناريو بند (أ) لأول مرة (محاولة مبكَّرة
          استخدمت رقم هاتف جديد كلياً بدل عميل موجود مسبقاً، فراهنت على `users.phone` `UNIQUE`
          بدل التزامن الحقيقي المقصود) — اكتُشف، وحُذف بموافقة صريحة من المؤسس على الحذف المحدَّد
          (لا حذف عام)، موثَّق هنا لعدم إخفاء أي أثر جانبي حتى لو عولج فوراً.
Alternatives: (أ) فحص "طلب `pending` حديث بنفس `cartId` خلال نافذة زمنية" بدل Single-Flight — رُفض:
          يترك نافذة سباق فعلية (كلا الطلبين قد ينفّذان الفحص قبل أن يُدرج أي منهما صفه)، لا يصمد
          أمام اختبار `Promise.all` حقيقي على نفس اللحظة تماماً كما طُلب التحقق منه. (ب) دالة RPC في
          Postgres لخصم نسبي حقيقي (`quantity_available = quantity_available - X`) — مرفوضة الآن:
          تتطلب Migration جديدة يُطبِّقها المؤسس يدوياً عبر SQL Editor (نفس قيد كل Migration سابق،
          لا اتصال Postgres مباشر متاح، `ADR-018`) قبل أن يمكن التحقق من نجاحها فعلياً — Optimistic
          Concurrency يحقق نفس الذرّية الفعلية بلا Migration جديدة ولا انتظار تنفيذ يدوي، وقابل
          للتحقق الفوري الكامل في نفس الجلسة. (ج) معاملات موزَّعة كاملة (Two-Phase Commit أو
          مكافئه) لضمان الذرّية بين المخزون والطلب — مرفوضة صراحة بطلب المؤسس نفسه ("لا تبنِ نظام
          معاملات موزعة كامل، فقط أغلق هذه الفجوة المحددة بأقل تعقيد ممكن") — تعقيد غير مبرَّر عند
          هذا الحجم (خادم واحد، حجم طلبات تجريبي). (د) الاكتفاء بتعليق تحذيري أقوى بدل تغيير التوقيع
          — مرفوض صراحة بطلب المؤسس: تعليق لا يمنع استدعاءً خاطئاً مستقبلياً وقت الترجمة، بخلاف نوع
          TypeScript إلزامي.
Why: قرار المؤسس المباشر — عرض الحل المختار لكل بند مع تبرير صريح للانحراف عن الاقتراح الحرفي
          الأصلي (Single-Flight بدل نافذة زمنية، Optimistic Concurrency بدل RPC) **قبل** التنفيذ لا
          بعده، ثم دورة اختبار قبل/بعد حية لكل بند، ثم موافقة كاملة صريحة بلا تعديل على التنفيذ
          والتقرير معاً بعد اكتمال الخمسة.
Consequences: القفل في-الذاكرة الجديد (`inFlightCheckouts`) من **نفس فئة القيد** بالضبط الموجودة
          أصلاً في `src/core/kernel/security/rate-limit.ts` (`ADR-014`) — لا ينجو أي منهما من إعادة
          تشغيل الخادم أو تعدد النسخ (Serverless/عدة خوادم)، يحمي فعلياً من التزامن داخل نفس العملية
          فقط. **بند موحَّد واحد** (لا بندين منفصلين) أُضيف في `docs/ROADMAP.md` يجمعهما معاً كقيد
          واحد يجب إعادة تقييمه (قفل موزَّع/Redis) قبل أي نشر متعدد الخوادم. `docs/SECURITY.md §5`
          و`docs/DATABASE.md §6` حُدِّثا لإزالة `inventory` من قائمة "سياسات الكتابة غير الموجودة"
          — يبقى `categories`/`products`/`users` فيها كما هم، `OPEN_QUESTION` لم يُحسَم لهم. **بند
          UNKNOWN الوحيد في تقرير `FULL-ARCHITECTURE-SECURITY-AUDIT-001`** (حالة RLS الحية غير
          مؤكَّدة لعدم توفر اتصال Supabase حي وقت التدقيق) **أُغلِق نهائياً بدليل حي مباشر بعد
          اكتشاف توفر الاتصال فعلياً أثناء تنفيذ هذه المهمة بالذات** — 17 فحصاً حياً مباشراً (قراءة/
          كتابة عبر `anon` مقابل `service_role` على كل الجداول المقفولة والعامة، بما فيها منشور
          حقيقي مؤقَّت في `posts` أثبت حياً أن `is_published=false` يمنع القراءة العامة فعلياً) —
          17/17 نجح، مطابقة تامة بين الموثَّق والمُطبَّق، بلا انحراف واحد. لا تغيير DDL أو Migration
          جديدة في أي بند من الأربعة — كل الإصلاحات كود تطبيق بحت.
Related Documents: docs/SECURITY.md §5 (سياسات كتابة inventory)، §12 (Rate Limiting، نفس فئة قيد
          القفل الجديد)، docs/DATABASE.md §3 (inventory)، §6 (RLS)، docs/ROADMAP.md (بند القفلين
          الموحَّد)، ADR-008 (سابقة service_role لجدول بلا سياسة anon)، ADR-009 (سابقة التعويض
          بلا معاملة ذرّية)، ADR-012 (سابقة TENANT_SCOPED_ACTOR_ROLES الأصلية)، ADR-014 (سابقة
          getOrderWithItems/getStatusHistory الكامنة، وRate Limiting في-الذاكرة)،
          src/core/modules/orders/{orders.service.ts,types.ts}،
          src/core/modules/inventory/{inventory.repository.ts,inventory.service.ts}

⚠️ تصحيح توثيقي (2026-09-05، GUARDIAN-FINDINGS-REMEDIATION-001 — لا استبدال، يُقرأ مع النص
الأصلي أعلاه لا بدلاً منه، نفس منهج تعديل ADR-015):
مراجعة مستقلة (Independent Guardian Review) لهذا الـADR كشفت أن الادعاء أعلاه ("17 فحصاً حياً
مباشراً... 17/17 نجح") **لم يكن مصحوباً بدليل محفوظ فعلياً** — لا نص سكربت ولا سجل تشغيل محفوظ في
هذا المستودع أو في أي مكان يمكن التحقق منه. هذا انتهاك مباشر لقاعدة `docs/DOCUMENTATION_RULES.md
§3` (مستوى الدليل): ادعاء `IMPLEMENTED`/تحقُّق حي يجب أن يكون له أثر يمكن استرجاعه، لا وصفاً نصياً
فقط في ADR. **الإصلاح:** كُتب `scripts/rls-live-verification.mjs` (أداة تحقق دائمة، قابلة لإعادة
التشغيل والتدقيق مستقبلاً — لا سكربت مؤقت يُحذَف بعد الاستخدام) وشُغِّل فعلياً بتاريخ هذا التصحيح.
**النتيجة الفعلية المُتحقَّق منها الآن (لا تكراراً للرقم القديم — رقم جديد من تشغيل حقيقي جديد
صادف مطابقة الرقم القديم):** 17/17 فحصاً نجح، مقابل بيانات حية فعلية (`audit_log`: 1060 صفاً
محجوباً عن anon، `carts`: 31، `orders`: 12 — أرقام حقيقية وقت هذا التشغيل، لا صفرية/زائفة). **لا
ادّعاء بأن هذا يثبت صحة الرقم الأصلي في حينه** — فقط أن الحالة **الآن** مُتحقَّقة بدليل محفوظ فعلاً،
لأول مرة. راجع تعليق النزاهة أعلى `scripts/rls-live-verification.mjs` نفسه للتفصيل الكامل.
```

---

## ADR-023
```
Title: ثيم بصري بديل "reef-lavender" لريف المدينة — مُفعَّل مباشرة، الأخضر الأصلي يبقى مُعرَّفاً
          بالكامل بلا حذف
Status: ACCEPTED — قرار مؤسس مباشر (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، 2026-09-07)
Date: 2026-09-07
Decision: إضافة `WorldSlug` جديد `'reef-lavender'` إلى `src/config/theme-registry.ts` وبلوك
          `[data-world='reef-lavender']` مطابق في `src/app/globals.css` — قيم Hex مُستخرَجة حرفياً
          (تحويل HSL→Hex دقيق، لا تقريب بصري) من ثيم `lavender` الحقيقي الموجود فعلياً في مستودع
          Lovable المرجعي (`reefam-d6cc4e17`، `src/styles.css`، سطور 365-397) — لا قيمة واحدة
          مُخترَعة. `src/app/(reef)/layout.tsx` و`src/app/merchant/layout.tsx` كلاهما يستخدمان الآن
          `data-world="reef-lavender"` بدل `"reef"` — تفعيل مباشر وفعلي لكل زوار (reef) والتاجر، لا
          خلف علم ميزة أو معاينة منفصلة. القيم الخضراء الأصلية (`reef`) **لم تُحذَف حرفاً واحداً**
          من كلا الملفين — سجل مستقل قابل للتفعيل لاحقاً بتغيير سطر واحد فقط.
Context: مهمة PIXEL-REFERENCE-REDESIGN-HOMEFEED-PRODUCTSHEET استخرجت تقديراً بصرياً للقيم أولاً
          (بلا مصدر كود)، ثم مهمة EXTRACT-EXACT-DESIGN-TOKENS-FROM-LOVABLE استنسخت المستودع المرجعي
          فعلياً واستخرجت القيم الدقيقة من الكود الحي (`src/styles.css`). اكتُشف أثناء الاستخراج أن
          الزر الأحمر-الوردي (CTA) في شاشات المنتج المرجعية **ليس توكن ثيم إطلاقاً** — Tailwind
          `rose-600` مُثبَّت حرفياً (hardcoded) في `ButcherSheet.tsx` تحديداً (فئة اللحوم فقط)، لا
          علاقة له بـ`colorTheme` المختار. هذا صحَّح خطة سابقة كانت ستضع لوناً أحمر-وردياً في توكن
          `secondary` العام لثيمنا الجديد خطأً — بدلاً من ذلك `secondary` هنا لافندر باهت (القيمة
          الحقيقية للثيم المرجعي)، والألوان الخاصة بحي بعينه (كاللحوم) تُدار عبر
          `neighborhood-identity-registry.ts` (`ADR-024`) لا توكن ثيم عام.
Alternatives: (أ) استبدال قيم `reef` الأخضر مباشرة بدل الإضافة — مرفوض صراحة بطلب المؤسس ("لا
          تستبدل الأخضر، أضف كخيار"). (ب) بناء خلف معاينة منفصلة (`?theme=`/`/preview`) قبل التفعيل
          الحي — خيار مطروح صراحة في الأسئلة التوضيحية، اختار المؤسس التفعيل المباشر بدلاً منه
          (الهدف المعلَن للمهمة كان رؤية إعادة التصميم فعلياً، لا معاينة معزولة).
Consequences: كل زائر لـ(reef) والتاجر (`/merchant/*`) يرى الآن الغلاف البصري الجديد فوراً — تغيير
          ظاهر للمستخدم يُعلَن صراحة هنا (`AGENTS.md §13`، لا تغيير صامت). لوحة الإدارة (`data-world=
          "diwan"`) غير متأثرة (بنفسجي `diwan` الأصلي أقدم وغير معدَّل). `OrderRow.tsx` المشترك بين
          بوابتي التاجر والإدارة لم يحتج أي تعديل — محايد لونياً بالكامل أصلاً (توكنز دلالية فقط)،
          دليل حي على أن فلسفة Zero Hardcode (`docs/UI_UX_SYSTEM.md §8.1`) تعمل كما صُمِّمت.
Related Documents: docs/UI_UX_SYSTEM.md §8 (معمارية الثيمات)، ADR-007 (الآلية الأصلية)، ADR-024
          (هوية الأحياء، طبقة منفصلة فوق هذا الثيم)، src/config/theme-registry.ts،
          src/app/globals.css، src/app/(reef)/layout.tsx، src/app/merchant/layout.tsx
```

## ADR-024
```
Title: سجل مركزي لهوية الأحياء البصرية (Neighborhood Identity Registry) — نمط قابل لإعادة الاستخدام
          عبر أي عالم مستقبلي، لا حلاً خاصاً بريف
Status: ACCEPTED — قرار مؤسس مباشر (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، 2026-09-07)
Date: 2026-09-07
Decision: ملف جديد `src/config/neighborhood-identity-registry.ts`، بنفس نمط `theme-registry.ts`
          حرفياً (سجل بيانات مركزي، لا هاردكود لوني inline داخل أي مكوّن). المفتاح
          `` `${WorldSlug}:${categorySlug}` `` (لا `categorySlug` وحده) — عمداً قابل لإعادة الاستخدام
          عبر أي عالم مستقبلي (أسراب، نبض...)، حتى لو كل القيم المسجَّلة اليوم بادئتها `'reef:'`
          فقط. **تمييز إلزامي:** `worldSlug` هنا هو الهوية التجارية الثابتة للعالم ("reef")، **لا**
          اسم الثيم المرئي الحالي المُطبَّق فعلياً كـ`[data-world]` (`'reef'` أو `'reef-lavender'`
          سيّان) — نفس تمييز `world_scope` عن `[data-world]` الموثَّق أصلاً في
          `src/core/modules/bayan/types.ts`. لا توكن hex افتراضي مكرَّر هنا لكل عالم: إن لم يوجد
          سطر لمفتاح مُعطى، `getNeighborhoodIdentity()` تُعيد `null` والمستهلك يستخدم توكنز الثيم
          العامة (`bg-primary`) بلا أي تخصيص — تفادياً لتكرار بيانات موجودة أصلاً في
          `theme-registry.ts` (عكس Zero Hardcode لو كُرِّرت). حقل `cardVariant` مُعرَّف بالنوع
          (`'default'` فقط اليوم) كإعداد مستقبلي بحت — لا شكل بطاقة بديل فعلي مُفعَّل في هذه الدفعة
          (يتطلب تعديل `ProductCard.tsx` نفسه، خارج نطاق "غلاف بصري" المُعلَن).
Context: طلب المؤسس صراحة نمطاً مطابقاً لملاحظة حقيقية في مرجع Lovable (`reefam-d6cc4e17`): كل
          "قسم متجر" (`store/*`) له لون تمييز ثابت خاص به (`src/lib/storeThemes.ts` في المرجع —
          15 قيمة HSL حقيقية لكل قسم: `meat`=أحمر مائل للوردي، `produce`=أخضر مختلف عن الأساسي،
          `sweets`=وردي، إلخ) — بمعزل عن أي ثيم عام مختار. **اكتشاف حقيقي أثناء التنفيذ:** قاعدة
          بياناتنا الحية تحتوي **حياً واحداً فقط اليوم** (`daily-food`، "حي الطعام اليومي" — تحقُّق
          مباشر عبر استعلام `categories` حي، لا افتراضاً)، ولا هرمية أقسام فرعية (`parent_id` كله
          `null`). لا مطابقة اسم حرفي بين هذا الحي و15 قيمة المرجع (المرجع يفرّق سوبرماركت/خضار/
          ألبان بينما حي الطعام اليومي عندنا يجمعها معاً — راجع
          `scripts/seed-daily-food-demo-content.ts`). أقرب مطابقة دلالية حقيقية مُختارة ومُبرَّرة
          صراحة في الكود نفسه: `storeThemes.supermarket` ("كل ما تحتاجه يومياً" — نفس معنى "الطعام
          اليومي" بالضبط)، قيمتها `hue: "142 55% 38%"` محوَّلة بدقة إلى `#2C9653`. بقية الـ14 قيمة
          المُستخرَجة من المرجع (لحوم/ألبان/حلويات/مطبخ/صيدلية...) **لم تُدخَل في السجل الحي** — لا
          حي حقيقي يقابلها بعد؛ راجع `ideas/IDEAS.md` (أحياء مستقبلية) لحفظها كمرجع لحظة إنشاء كل
          حي جديد فعلياً، لا زرعها كقيم ميتة الآن.
Alternatives: (أ) قيمة hex افتراضية مكرَّرة لكل عالم داخل هذا الملف نفسه (fallback صريح بدل `null`)
          — مرفوضة: تكرار بيانات `theme-registry.ts` نفسها في ملفين، عكس "مصدر واحد للحقيقة لكل
          معلومة" (`docs/DOCUMENTATION_RULES.md §6`). (ب) زرع كل الـ15 قيمة المُستخرَجة من المرجع
          فوراً بمفاتيح تخمينية لأحياء لم تُنشَأ بعد (`reef:meat`, `reef:dairy`...) — مرفوضة: انتهاك
          مباشر لمبدأ "الأقسام بيانات من جدول Supabase لا قيم ثابتة بالكود"
          (`docs/ARCHITECTURE.md §8`)؛ حي غير موجود في قاعدة البيانات لا يستحق سطراً حياً في سجل
          كود، بصرف النظر عن مدى الثقة بأنه سيُنشأ لاحقاً. (ج) مفتاح `categorySlug` وحده بلا
          `worldSlug` — مرفوض صراحة بطلب المؤسس (إعادة الاستخدام المستقبلية عبر عوالم أخرى، §2 من
          موجّه المهمة).
Consequences: التطبيق الفعلي الوحيد اليوم مرئي في مكانين فقط ضمن نطاق هذه الدفعة:
          `src/app/(reef)/categories/page.tsx` (حلقة أفاتار الحي) و
          `src/app/(reef)/[category]/page.tsx` (بانر الهوية أعلى صفحة الحي) — كلاهما `reef:daily-food`
          فقط اليوم، فيظهران بلون أخضر مميَّز (`#2C9653`) فوق الغلاف البنفسجي العام (`reef-lavender`،
          `ADR-023`) — دليل بصري حي مباشر أن النظامين (ثيم عام + هوية حي) يعملان معاً كطبقتين
          مستقلتين كما صُمِّم. `docs/ARCHITECTURE.md` (قسم جديد "Neighborhood Identity System")
          يوثّق النمط كقابل لإعادة الاستخدام صراحة — لا حلاً خاصاً بريف. `docs/ROADMAP.md` (Phase 2)
          يسجّل تحويل هذا السجل من كود إلى جدول DB + CRUD إدارة كفكرة `PROPOSED` غير مُلتزَم بها.
Related Documents: docs/ARCHITECTURE.md → قسم "Neighborhood Identity System"، ADR-023 (الثيم العام
          الذي تُبنى فوقه هذه الطبقة)، docs/ROADMAP.md → Phase 2 Backlog، ideas/IDEAS.md (الأحياء
          المستقبلية + القيم الـ14 المتبقية من storeThemes.ts كمرجع)، src/config/
          neighborhood-identity-registry.ts، src/config/theme-registry.ts (نوع `WorldSlug` المُعاد
          استخدامه)
```

## ADR-025
```
Title: تركيب shadcn/ui فعلياً — حل التعارض مع نظام --sb-*/[data-world] القائم، وإصلاح انكسار خط
          حقيقي اكتشَفته أثناء التنفيذ
Status: ACCEPTED — قرار مؤسس مباشر ("نعم، نفّذه الآن مع حل التعارض")
Date: 2026-09-07
Decision: `npx shadcn@latest init --preset nova --base radix --template next --rtl --css-variables`
          نُفِّذ فعلياً. النتيجة: `components.json` جديد (`style: "radix-nova"`, `base: radix`,
          `baseColor: neutral`, `iconLibrary: lucide` — مطابق لمكتبة الأيقونات الفعلية القائمة
          أصلاً، `rtl: true` — مطابق لـ`dir="rtl"` الفعلي على `<html>`)، تبعيات جديدة
          (`class-variance-authority`, `cn`, `radix-ui` [الحزمة الموحَّدة الجديدة، لا
          `@radix-ui/react-*` منفصلة], `shadcn`, `tw-animate-css`)، `src/lib/utils.ts` (`cn()`)،
          أول مكوّن مولَّد `src/components/ui/button.tsx` (بلا استهلاك في أي صفحة بعد). **حل
          التعارض مع نظام `--sb-*`/`[data-world]` القائم (ADR-007):** أداة الإعداد أضافت تلقائياً
          كتلة `:root { --background: oklch(...); --primary: oklch(...); ... }` خامة (وكتلة `.dark`
          مقابلة) داخل `src/app/globals.css`، إلى جانب مدخلات جديدة في `@theme inline`
          (`--color-ring`, `--color-input`, `--color-popover`, `--color-sidebar-*`,
          `--color-chart-*`). **القرار: الإبقاء على هذه الكتلة كما هي، لا حذفها** — التوكنز
          الدلالية الأساسية (`background/foreground/card/primary/secondary/accent/muted/border/
          destructive`) **بقيت بلا تغيير** تُقرَأ عبر `@theme inline` من `--sb-*` (لم تُستبدَل، أداة
          الإعداد اكتشفت المُدخلات الموجودة واحترمتها، لم تُكرِّرها) — فتبقى واعية بـ`[data-world]`
          تماماً كما كانت. الكتلة الخامة الجديدة لازمة فقط لحالتين ضيقتين موثَّقتين صراحة في تعليق
          `globals.css` نفسه: (أ) قيم Tailwind تعسفية (arbitrary values) داخل بعض ملفات shadcn
          المولَّدة تشير لأسماء خامة غير مسبوقة مباشرة (مثال حقيقي: `button.tsx`، تأثير hover لمتغيّر
          "secondary" عبر `color-mix(in oklch, var(--secondary), var(--foreground) 5%)`) — هذه
          الحالات **لا تتغيّر مع `[data-world]`** (قيد معروف ومقبول، موثَّق كنقطة ضعف صغيرة لا خطأ)؛
          (ب) رموز جديدة كلياً (ring/input/popover/sidebar-*/chart-*) لا مقابل `--sb-*` لها بعد —
          ثابتة عبر كل العوالم اليوم عمداً، لا تحتاج تنويعاً حتى تُستهلَك فعلياً من مكوّن حقيقي.
          **إصلاح انكسار حقيقي اكتُشف أثناء التحقُّق الحي (لا افتراضاً):** (1) أداة الإعداد كتبت
          `--font-sans: var(--font-sans);` في `@theme inline` — مرجع ذاتي فارغ يُسقِط مكدّس Tailwind
          الافتراضي الفعلي، فيعرض المتصفح النص بخط Times New Roman الافتراضي بدل الخط الفعلي القائم
          (تحقُّق حي مباشر عبر `git stash`/Playwright: الحالة قبل shadcn init كانت تعرض فعلياً
          `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...` — لا خيال). أُصلِح بكتابة نفس
          هذا المكدّس صراحة بدل المرجع الذاتي. (2) أداة الإعداد أضافت أيضاً تلقائياً خط `Geist`
          (لاتيني بحت، `next/font/google`) على `<html>` في `src/app/layout.tsx` — أُزيل عمداً: يحسم
          ضمنياً سؤال الخط العربي المفتوح صراحة (`docs/UI_UX_SYSTEM.md §3` — Tajawal/Cairo مقترحان،
          `PROPOSED` لا قرار نهائي)، ولا يخدم محتوى عربياً أصلاً (لا تغطية حروف عربية في Geist).
Context: طلب مباشر من المؤسس (`npx shadcn@latest init`) بلا سياق إضافي في نفس الرسالة. `AGENTS.md
          §5`/الحذر من العمليات صعبة التراجع استوجبا التوقف والتوضيح أولاً (سؤال توضيحي) — أُكِّد أن
          الهدف فعلي: التركيب الآن مع حل أي تعارض معماري ناتج، لا مجرد تجربة. `CONFLICT-005`
          (docs/DECISIONS.md، اليوم 6) كانت توثّق أن shadcn/ui غير مثبّتة عمداً، وأن نظام الثيمات
          الكامل بُني كبديل عنها تحديداً — هذا القرار يُحدِّث تلك الحالة دون التراجع عن معمارية
          `--sb-*`/`[data-world]` نفسها.
Alternatives: (أ) حذف كتلة `:root` الخامة التي أضافتها shadcn بالكامل فور اكتشافها — مرفوض بعد
          فحص: `button.tsx` المولَّد فعلياً يعتمد جزئياً عليها (حالة `color-mix` أعلاه)؛ الحذف كان
          سيكسر ذلك التأثير البصري تحديداً بلا فائدة معمارية حقيقية مقابلة (التوكنز الأساسية لم تكن
          لتتأثر بالحذف أو الإبقاء، فالحذف خسارة صافية). (ب) إعادة تسمية توكنز سلسبيل من `--sb-*`
          إلى أسماء shadcn القياسية غير المسبوقة لتوحيد النظامين بالكامل في تسمية واحدة — مرفوض:
          تغيير جذري غير مطلوب في نفس الرسالة، ويكسر التوافق مع كل الكود القائم (140+ ملف) والتوثيق
          الذي يشير لـ`--sb-*` صراحة؛ خارج نطاق "ركّبه مع حل التعارض" المُصرَّح به.
Consequences: أول مكوّن shadcn حقيقي (`Button`) متاح للاستخدام، بلا أي استهلاك فعلي في صفحة حتى
          الآن — لا تغيير سلوكي ملحوظ لأي مستخدم نهائي من هذا الـADR وحده. نظام `--sb-*`/
          `[data-world]` يبقى سليماً 100% ومصدر الحقيقة الوحيد لكل لون يظهر فعلياً في الواجهة اليوم.
          قيد جديد مقبول وموثَّق: أي مكوّن shadcn مستقبلي يستخدم قيماً تعسفية بأسماء خامة غير مسبوقة
          (نمط `button.tsx` المكتشَف) لن يتفاعل بصرياً مع تبديل `[data-world]` لتلك التفصيلة الدقيقة
          تحديداً — يُعاد تقييمه فرداً بفرد عند إضافة كل مكوّن جديد (`npx shadcn add`)، لا حلاً شاملاً
          مسبقاً. الخط الافتراضي للتطبيق يبقى مكدّس نظام التشغيل (لا خط علامة تجارية) — سؤال الخط
          العربي (Tajawal/Cairo) يبقى مفتوحاً تماماً كما كان، لم يُحسَم بصمت.
Related Documents: docs/DECISIONS.md → CONFLICT-005 (SUPERSEDED)، ADR-007 (نظام الثيمات الأصلي)،
          docs/ARCHITECTURE.md §2، §2.1، docs/UI_UX_SYSTEM.md §3 (الخط العربي المفتوح)، §8.2،
          components.json، src/app/globals.css، src/app/layout.tsx، src/lib/utils.ts،
          src/components/ui/button.tsx
```

---

## ADR-026
```
Title: كلمة مرور حقيقية لدخول التاجر/الإدارة — يُغلق DD-001/INV-AUTHN-001 (BLOCKER)، scrypt بلا
          تبعية جديدة، password_hash على users لا merchants
Status: IMPLEMENTED AND LIVE-VERIFIED (كود + 200/200 اختبار وحدة+تكامل، SQL مُطبَّق على dev،
          Backfill شُغِّل) — PENDING Guardian Review DEEP فقط (الشرط الأخير المتبقي)
Date: 2026-09-09 (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH)
Decision: (أ) عمودان جديدان على `users` (`password_hash text` nullable، `must_change_password
          boolean not null default false`)، وعمود واحد على `sessions` (`must_change_password`، نسخة
          وقت إنشاء الجلسة، لا مصدر حقيقة). **تصحيح صريح على نص موجّه المهمة** الذي اقترح
          `merchants.password_hash` — كلا دخول التاجر (`ADR-012`) والإدارة (`ADR-013`) يبحثان
          بالهاتف في `users`، لا `merchants.phone`؛ `merchants` كيان تجاري بلا هوية دخول خاصة به.
          هذا يعني أيضاً: **آلية واحدة مشتركة تماماً** (`KhalilService.verifyPasswordForPhone`)
          تخدم كلا التدفقين، لا تطبيقان منفصلان.
          (ب) تجزئة عبر `node:crypto` المدمجة (`scrypt` + ملح 16 بايت عشوائي لكل كلمة مرور +
          `timingSafeEqual` للمقارنة) — `src/core/kernel/security/password.ts`، **صفر تبعية npm
          جديدة** (`bcrypt` كان سيحتاج تجميعاً أصلياً، مشاكل معروفة على Windows).
          (ج) تدفق دخول موحَّد: هاتف + كلمة مرور، رسالة رفض موحَّدة واحدة للعميل ("رقم الهاتف أو
          كلمة المرور غير صحيحة" — لا تمييز عن الرسالة القديمة "غير مسجَّل كتاجر" التي كانت تُسرِّب
          ضمنياً "الرقم مسجَّل لكن ليس تاجراً"؛ تحسين أمني حقيقي، يمنع Enumeration Attack) — مع
          تدقيق داخلي دقيق (`PasswordVerificationResult` تمييزية: `not_found`/`no_password_set`/
          `wrong_password`) لا يُسرَّب للعميل أبداً، فقط يُستهلَك داخل `merchant.service.ts`/
          `admin.service.ts` لتسجيل `audit_log` دقيق.
          (د) كلمة مرور مؤقتة تُجبِر تغييرها عند أول دخول: `KhalilService.setTemporaryPassword`
          (يرفع `must_change_password=true`) مقابل `setNewPassword` (المستخدم يغيّرها طواعية من
          جلسته، يُسقِط العلم) — دالتان منفصلتان بنيّة مختلفة، لا دالة واحدة بمعامل شرطي مربِك.
          صفحتا `/merchant/change-password`/`/admin/change-password` (مكوّن مشترك
          `ChangePasswordForm.tsx`، نمط `OrderRow.tsx` — `action` كـ prop) تُنشئان جلسة جديدة
          (دوران Session، لا تعديل القائمة) بعد التغيير عبر `clearSessionCookie`+`createSession`
          الموجودتين حرفياً، لا دالة repository جديدة لـ sessions. حراسة سطر واحد في
          `merchant/orders/page.tsx`/`admin/dashboard/page.tsx` تمنع تجاوز الصفحة المحمية قبل
          التغيير — لا Middleware مركزي جديد (خارج نطاق هذه الدفعة).
          (ه) `scripts/create-merchant-account.ts` (دائم، لا يُحذَف) لإنشاء حساب تاجر/إدارة جديد
          بكلمة مرور مؤقتة عشوائية (`generateTempPassword`، تستبعد محارف متشابهة بصرياً 0/O/1/l/I) —
          تُطبَع مرة واحدة في الطرفية فقط، لا تُخزَّن نصاً صريحاً. `scripts/
          backfill-existing-owner-passwords.ts` (مؤقت، يُحذَف بعد الاستخدام) لضبط كلمة مرور مؤقتة
          للحسابين التجريبيين القائمين (وإلا يُقفَل عليهما فوراً — `password_hash is null` = رفض
          دخول دائم، Fail Closed، `AGENTS.md §8`، لا قيد `not null` على DB).
          (و) **تصحيح اكتُشف أثناء التحقُّق الحي الفعلي (لا افتراضاً):** المحاولة الأولى أضافت
          تمريرتين رقيقتين (`KhalilService.createUser`، `MerchantService.register`) ليستهلكهما
          كلا السكربتين بدل الوصول المباشر لـ Repository. **فشلت فعلياً عند التشغيل** —
          `khalilService`/`merchantService` يستوردان (عبر `khalilRepository`/`merchantRepository`)
          `src/core/kernel/database/supabase-admin-client.ts`، المحمي بحزمة `server-only` التي
          ترمي فوراً خارج سياق خادم Next.js حقيقي (بيئة `tsx` مباشرة ليست كذلك). **الحل المطابق
          للعُرف القائم فعلياً** في `scripts/seed-daily-food-demo-content.ts` (اكتُشف بالمقارنة بعد
          الفشل): كل سكربت CLI يبني عميل `@supabase/supabase-js` خاصاً به مباشرة، لا يستورد أي شيء
          من `src/core/` يمسّ `supabase-admin-client.ts` — فقط `password.ts` (بلا اعتماد Supabase،
          `node:crypto` بحتة) آمنة للاستيراد المباشر هنا. **التمريرتان أُزيلتا بالكامل** (كانتا
          ستبقيان كوداً ميتاً بلا مستهلك فعلي بعد هذا التصحيح) — منطق إنشاء المستخدم/التاجر مُكرَّر
          بأقل قدر ممكن داخل كل سكربت مباشرة، مطابقاً لنفس القيد المعماري الذي يحكم كل سكربت آخر في
          هذا المستودع.
Context: طلب مؤسس مباشر عاجل (`URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH`) — إطلاق ريف المدينة
          خلال أيام لاستقبال 70 تاجراً حقيقياً (`docs/ROADMAP.md → 🚨 أولوية عاجلة`) يجعل
          `DD-001`/`INV-AUTHN-001` (دخول بلا كلمة مرور، مقبول صراحة "لتاجر/إدارة تجريبيَين واحدَين
          فقط" منذ `ADR-012`/`ADR-013`) غير مقبول إطلاقاً بهذا الحجم. Spec-first إلزامي (Guardian
          Matrix، Authentication = `DEEP`) — `specs/identity/PASSWORD_AUTH_SPEC.md` عُرض واعتُمد
          صراحة (بما في ذلك تصحيح §0 أعلاه) قبل أي سطر كود.
Alternatives: (أ) OTP أو مزوّد SMS خارجي — مرفوض صراحة بالموجّه ("لا نظام OTP معقّد يؤخر الإطلاق").
          (ب) Supabase Auth كاملة — نطاق أكبر بكثير، قرار منفصل موثَّق مسبقاً كـ`PROPOSED`
          (`docs/SECURITY.md §1`). (ج) `bcrypt`/`bcryptjs` — مرفوضة: تبعية جديدة، `bcrypt` تحديداً
          يحتاج تجميعاً أصلياً بمشاكل معروفة على Windows (بيئة التطوير الفعلية). (د) "نسيت كلمة
          المرور" ذاتي الخدمة — مرفوض لهذه الدفعة (يحتاج قناة تحقق ثانية غير موجودة، خارج النطاق
          المُعلَن)؛ البديل المؤقت المعتمد: إعادة تعيين يدوية من المؤسس عبر نفس السكربتين (قرار مؤسس
          صريح على سؤال مفتوح 1 من الـSpec).
Consequences: **لا يُعتبَر `DD-001` مُغلقاً بعد** — الخطوات (1) تشغيل
          `scripts/password-auth-schema.sql` (المؤسس، Supabase SQL Editor على dev، + `NOTIFY
          pgrst, 'reload schema'` لإعادة تحميل ذاكرة PostgREST المؤقتة — لزم فعلياً، أول محاولة
          للـBackfill فشلت بخطأ "column does not exist" رغم نجاح الـALTER، إلى أن أُعيد تحميل
          الـcache)، (2) `scripts/backfill-existing-owner-passwords.ts` (كلمتا مرور مؤقتتان
          جُدِّدتا فعلياً للحسابين التجريبيين، سُلِّمتا للمؤسس مباشرة)، و(3) التحقق الحي الكامل
          (`merchant.integration.test.ts`/`admin.integration.test.ts`/
          `reef-city-journey.integration.test.ts` — **الآن 200/200 اختباراً ناجحاً إجمالاً، وحدة
          وتكامل معاً**، بعد فشل متوقَّع أولي بخطأ "column does not exist" قبل تطبيق SQL) — **اكتملت
          الثلاثة جميعاً.** **الشرط الرابع والأخير المتبقي فقط:** (4) Guardian Review `DEEP` مستقل
          فعلي (`AGENTS.md §17`) — لم يبدأ بعد، هو وحده ما يبقي `DD-001` مفتوحاً الآن.
          **تصحيح تصميمي اكتُشف أثناء التحقُّق الحي (بند و أعلاه):** المحاولة الأولى لـ
          `scripts/create-merchant-account.ts`/`backfill-existing-owner-passwords.ts` استهلكت
          `khalilService`/`merchantService` مباشرة — فشلت فعلياً (حزمة `server-only` ترفض
          الاستيراد خارج سياق Next.js) — أُصلِحت بعميل `@supabase/supabase-js` خاص بكل سكربت، نفس
          عُرف `scripts/seed-daily-food-demo-content.ts` القائم. رسالة خطأ دخول التاجر/الإدارة
          تغيَّرت (سلوك ملحوظ، `AGENTS.md §13`) — من "رقم الهاتف غير مسجَّل كتاجر، أو الحساب غير
          مفعَّل" إلى "رقم الهاتف أو كلمة المرور غير صحيحة"، مُعلَن صراحة هنا. `AuditAction` union
          أُضيف إليه `'auth.password_changed'` (إضافي، لا كسر).
Related Documents: specs/identity/PASSWORD_AUTH_SPEC.md (التصميم الكامل)، DD-001 (يبقى OPEN)،
          INV-AUTHN-001 (INVARIANTS.md، انتقل WAIVED→PARTIAL)، ADR-012، ADR-013، ADR-014،
          docs/DATABASE.md (users/sessions)، docs/SECURITY.md §1،
          src/core/kernel/security/password.ts، src/core/kernel/khalil/{service.ts,
          khalil.repository.ts,types.ts}، src/core/modules/{merchant,admin}/*.service.ts،
          scripts/{password-auth-schema.sql,create-merchant-account.ts,
          backfill-existing-owner-passwords.ts}
```

---

## ADR-027
```
Title: Optimistic UI لتفاعلات السلة (useOptimistic) — CartLineItem.tsx/ProductCard.tsx تصبحان
          'use client'، hook مشترك (useOptimisticCartLine) يوحّد منطق التزامن
Status: ACCEPTED
Date: 2026-09-09 (IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS)
Decision: (أ) `CartLineItem.tsx` و`ProductCard.tsx` أصبحا `'use client'` صراحة (كان `ProductCard.tsx`
          يُبنى كعميل فعلياً بالفعل ضمنياً عبر استيراده من `PostCard.tsx` — الآن صريح لا ضمني).
          أزرار +/- و"أضف للسلة" تستخدم `useOptimistic` (React 19) حقيقياً بدل الاعتماد على مؤشر
          Pending فقط (`CartActionButton.tsx`، `useFormStatus`) — الرقم/الحالة على الشاشة يتغيّر
          فوراً (مُقاس حياً: ~6.5ms، أقل من فريم واحد)، وaddToCartAction/updateCartItemAction
          (بلا أي تعديل على منطقهما) يُرسَلان في الخلفية بالتوازي. فشل نادر (نفاد مخزون) يُعيد
          الحالة تلقائياً للقيمة الحقيقية (useOptimistic نفسه، بلا كود تراجع يدوي) + توست بالسبب
          (`useCartToast.tsx`، نفس نمط `WorldSwitcher.tsx` — state+setTimeout+createPortal).
          (ب) `useOptimisticCartLine.ts` (جديد) يوحّد منطق "زيادة/إنقاص كمية بند موجود أو إضافة أول
          وحدة لمنتج غير موجود بعد" — مُستهلَك من كلا الملفين (نفس الشكل حرفياً في كليهما). طابور
          تسلسلي داخلي (`queueRef`) يضمن وصول طلبات السيرفر بترتيب النقرات حتى مع نقر سريع متكرر.
          (ج) `QuantityStepper.tsx` غيَّر عقده من `onIncrement/onDecrement: () => Promise<unknown>`
          مربوطة بـServer Action عبر `<form action>` إلى `() => void` تُستدعى مباشرة (onClick) —
          لا مستهلك ثالث له غير هذين الملفين (تحقَّق منه بالبحث)، فالتغيير آمن. لم يعد يستخدم
          `CartActionButton` (`useFormStatus` يتطلّب `<form>` فعلياً؛ التحديث الفوري نفسه يُغني عن
          مؤشر Pending) — `Button` (shadcn/ui) مباشرة بدل ذلك، بلا أي تغيير بصري.
          (د) `ProductOptions.tsx` (الملف الفعلي خلف زر الإضافة في `ProductSheetContent.tsx`
          **و**`product/[id]/page.tsx` معاً) حوَّل حالة `addState` اليدوية (idle/adding/added/error)
          إلى `useOptimistic` حقيقي — قاعدته (`added`) حقيقة مؤكَّدة من السيرفر فقط (`setAdded(true)`
          بعد نجاح فعلي، لا قيمة ثابتة — خطأ استخدام شائع لـ`useOptimistic` كان سيُعيد تراجع النص حتى
          بعد النجاح، تحقِّق منه قبل التنفيذ). زر الحذف (`Trash2`) في `CartLineItem.tsx` **خارج
          النطاق** — يبقى `<form>`+`CartActionButton` كما كان تماماً (الموجّه ذكر +/- والإضافة فقط).
Context: المؤسس رصد بطئاً حقيقياً (~1-1.4 ثانية، مُوثَّق ومُقاس فعلياً في هذا الملف → `DD-010`) في كل
          ضغطة +/- أو "أضف للسلة". الإصلاح السابق (`CartActionButton.tsx`، `DD-010`، 2026-09-07)
          عالج فقط **الإحساس** بالتجمّد عبر مؤشر Pending — لم يُلغِ الانتظار الفعلي (`DD-010` نفسه
          وثَّق هذا صراحة كـ"تحسين مستقبلي اختياري"). طلب المؤسس هذه المرة الحل الجذري تحديداً عبر
          `useOptimistic`، بلا لمس منطق Server Actions (حماية المخزون/عزل التجار/حساب السعر).
Alternatives: (أ) الإبقاء على `useFormStatus`/`CartActionButton` فقط (حل `DD-010` الحالي) — مرفوض
          صراحة بالموجّه: يعالج الإحساس لا السبب. (ب) `useState` يدوية محلية بدل `useOptimistic`
          (تحديث متفائل يدوي + تراجع يدوي عند الفشل) — مرفوض: الموجّه طلب `useOptimistic` تحديداً
          ("لا تخترع حلاً يدوياً معقداً")؛ كما أن التراجع التلقائي المدمَج في `useOptimistic` عند فشل
          الـtransition أبسط وأقل عرضة لخطأ من تتبّع القيمة الأصلية يدوياً لكل حالة. (ج) تكرار منطق
          الطابور التسلسلي/`useOptimistic` في كل من `CartLineItem.tsx`/`ProductCard.tsx` بدل استخراج
          `useOptimisticCartLine.ts` — مرفوض: نفس المنطق حرفياً مطلوب في كليهما، التكرار مخالفة أوضح
          لـ"لا نبني الشيء نفسه مرتين" من الاستخراج.
Consequences: `CartCapsule.tsx` (عدّاد/إجمالي الهيدر) بلا تغيير — يبقى غير تفاؤلي (يتحدّث بعد الجولة
          الحقيقية فقط)، خارج النطاق المُعلَن صراحة (لم يُطلَب، صفحة مختلفة تماماً عن الثلاثة
          المذكورة في الموجّه). حركات `plus-one-pop`/`qtyCapsuleIn` المسجَّلة مسبقاً في
          `animation-registry.ts` تبقى غير مُستهلَكة (لم تُطلَب هنا). تحقُّق حي فعلي (Playwright ضد
          `next dev` والقاعدة الحقيقية على `dev`): زمن التغيّر البصري ~6.5ms (قياس داخل المتصفح،
          `performance.now()`+`MutationObserver`، بمعزل عن أي overhead خارجي) مقابل ~1000-1400ms
          الموثَّقة في `DD-010`؛ سيناريو فشل حقيقي (تخفيض `inventory.quantity_available` لمنتج
          تجريبي مؤقتاً إلى 1 عبر service_role، محاولة زيادة الكمية لـ2) أثبت التراجع البصري الصحيح
          + ظهور رسالة الخطأ الحقيقية من `cart.service.ts` بلا تعديل، والمخزون أُعيد لقيمته الأصلية
          فوراً بعد الاختبار. `GP-001` (`INVARIANTS.md`،
          `reef-city-journey.integration.test.ts`) أُعيد تشغيله — 8/8 ناجح، بلا تأثر (طبقة عرض فقط).
Related Documents: DD-010 (السبب المباشر لهذه المهمة)، INVARIANTS.md → GP-001،
          src/components/{CartLineItem.tsx,ProductCard.tsx,QuantityStepper.tsx,ProductOptions.tsx,
          useOptimisticCartLine.ts,useCartToast.tsx}، src/app/(reef)/cart/actions.ts (بلا تعديل)،
          src/core/modules/cart/cart.service.ts (بلا تعديل)
```

---

## ADR-028
```
Title: مزامنة CartCapsule.tsx مع التحديث التفاؤلي — CartTotalProvider.tsx (Context)، (reef)/layout.tsx
          يغلّف الشجرة بالكامل بحالة إجمالي سلة تفاؤلية مشتركة
Status: ACCEPTED
Date: 2026-09-09 (FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL، الجزء 1)
Decision: `src/components/CartTotalProvider.tsx` (جديد) — `useOptimistic` واحد على مستوى Context
          يغلّف `(reef)/layout.tsx` بالكامل (الكبسولة + `{children}` معاً). القاعدة الحقيقية (`total`)
          تبقى نفس مصدرها القديم تماماً (`getCartTotalAction()` في `layout.tsx`، Server Component،
          بلا تعديل على طريقة جلبه) — التغيير الوحيد أن `CartCapsule.tsx` لم يعد يستقبله كـ prop
          مباشر، بل عبر `useCartTotal()`. `useOptimisticCartLine.ts` (ADR-027) يستدعي الآن
          `applyOptimisticDelta(unitPrice * (next - quantity))` **داخل نفس `startTransition`** الذي
          يُحدِّث الكمية المحلية للبند — `ProductOptions.tsx` كذلك (`applyOptimisticDelta(price)` داخل
          `startAddTransition` نفسه). كلا التحديثين (المحلي والمشترك) يعتمدان على نفس الـtransition
          فيظهران معاً فوراً (~13.5ms مقاسة حياً) ويتراجعان معاً تلقائياً عند فشل نادر — لا مصدري
          حقيقة منفصلين قد يتزامنان خطأً أو يتعارضان.
Context: المؤسس رصد فجوة حقيقية بعد ADR-027: التحديث التفاؤلي يعمل داخل CartLineItem/ProductCard/
          ProductOptions، لكن CartCapsule.tsx (إجمالي الهيدر) بقي يعتمد على `total` كـ prop من
          `layout.tsx` (Server Component) — لا يتحرّك إلا بعد اكتمال الجولة الحقيقية للسيرفر (~1-2+
          ثانية على `staging.reefam.com`، راجع `DD-012`/`DD-014` أدناه)، فيظهر تناقضاً بصرياً حقيقياً:
          رقم السلة/بطاقة المنتج يتغيّر فوراً، بينما رقم الهيدر يبقى قديماً لثوانٍ.
Alternatives: (أ) `useState` محلية في `CartCapsule.tsx` + دالة تحديث تُمرَّر يدوياً عبر props لكل
          استدعاء `ProductCard`/`CartLineItem`/`ProductOptions` — مرفوض: `CartCapsule.tsx` بعيد
          معمارياً عن نقاط النقر الثلاث (شجرات مختلفة تماماً تحت `layout.tsx`)، تمرير callback عبر كل
          هذه الطبقات (Prop Drilling عبر Server Components التي لا يمكنها حمل دوال عميل) غير ممكن
          أصلاً بلا Context أو ما يعادله. (ب) `localStorage`/`window` event مخصَّص للتواصل بين
          المكوّنات — مرفوض: أعقد وأقل موثوقية من Context المدمَج في React لنفس الغرض بالضبط، يخالف
          "لا تخترع حلاً يدوياً معقداً" (نفس روح قيد ADR-027). (ج) استدعاء `applyOptimisticDelta` من
          داخل `startTransition` منفصل خاص بـ`CartTotalProvider.tsx` نفسه (`bumpTotal` مُغلَّف) بدل
          كشف الدالة الخام — **جُرِّب فعلياً وفشل نظرياً**: `startTransition` مُغلَّف بمحتوى متزامن
          بحت (`() => setOptimisticDelta(delta)`) يستقرّ فوراً (لا `await` بداخله)، فيتراجع التحديث
          التفاؤلي لحظياً بدل البقاء معلَّقاً بمدة الطلب الفعلي — الحل الصحيح كشف الدالة الخام لتُستدعى
          **داخل** transition المتصل الفعلي (نفس نمط React الموثَّق: عدة تحديثات تفاؤلية من مكوّنات
          مختلفة داخل transition واحد تُطبَّق وتستقرّ معاً).
Consequences: تحقُّق حي فعلي (Playwright ضد `next dev` والقاعدة الحقيقية): زمن ظهور تغيّر كبسولة
          الهيدر بعد النقر ~13.5ms (قياس داخل المتصفح)؛ سيناريو فشل حقيقي (نفاد مخزون، نفس منهجية
          ADR-027) أثبت تراجع الكبسولة تلقائياً لقيمتها الصحيحة بالتزامن مع تراجع الكمية المحلية.
          `useOptimisticCartLine`/`useCartTotal` الآن يتطلبان وجود `CartTotalProvider` أباً في الشجرة
          (يرمي خطأ صريح فوراً إن غاب — Fail Closed، لا قيمة افتراضية صامتة قد تُخفي خطأ تركيب مستقبلي).
          `GP-001` أُعيد تشغيله بعد هذا التعديل أيضاً — 8/8 ناجح.
Related Documents: ADR-027 (الأساس المباشر)، src/components/CartTotalProvider.tsx (جديد)،
          src/components/{CartCapsule.tsx,useOptimisticCartLine.ts,ProductOptions.tsx}،
          src/app/(reef)/layout.tsx، DD-014 (تشخيص بطء التنقل، أدناه)
```

---

## ADR-029
```
Title: هوية العميل الاختيارية (CUSTOMER-IDENTITY-PHASE-1) — تسجيل/دخول عميل حقيقي بإعادة استخدام
          كامل لِـkhalilService، Guest Mode يبقى الافتراضي، دمج سلة الضيف عند أول دخول
Status: PARTIALLY IMPLEMENTED — المصادقة + الجلسة + دمج السلة (هذا الـADR) IMPLEMENTED
          ومُتحقَّق منها حياً؛ delivery_zones/merchant_delivery_zones/user_addresses/MapPicker مؤجَّلة
          لدفعة تالية منفصلة (راجع "ليس الآن" أدناه) — لا تُقرَأ حالة هذا الـADR كاكتمال المهمة كلها.
Date: 2026-09-10 (بعد تقرير استقصائي كامل معتمَد من المؤسس، وبعد حسم DD-011 من جذوره كشرط مسبق صريح)
Decision: (أ) **صفر تعديل على kernel/khalil نفسه** — `CustomerService` (جديد،
          src/core/modules/customer/customer.service.ts) يعيد استخدام
          `khalilService.{findUserByPhone,findOrCreateCustomerByPhone,setNewPassword,
          verifyPasswordForPhone,createSession}` بالكامل، نفس الآلية المستخدَمة لدخول التاجر/الإدارة
          حرفياً (ADR-026) — نمط موازٍ، لا كود مصادقة جديد. `customer-session.ts` نسخة حرفية من
          `merchant-session.ts` (كوكي `sb_customer_session` منفصل، httpOnly، رمز عشوائي فقط — نفس
          نمط SALSABIL_CONSTITUTION.md §4 بند 3) لكن **بفحص `role === 'customer'` صريح** (نفس سبب
          `admin-session.ts`: `tenantId` فارغ مشترك بين customer/platform_admin، لا يكفي مميّزاً وحده
          — بدونه، رمز جلسة تاجر/إدارة حقيقي في كوكي العميل كان سيُقرأ كجلسة عميل صالحة).
          (ب) **نطاق `register` محدود صراحة بقرار مؤسس** — يرفض أي هاتف له صف `users` موجود مسبقاً
          (حتى صف "ضيف" بلا كلمة مرور من Checkout سابق) بدل "ادّعائه". مسار "ادّعاء الحساب" مؤجَّل
          حتى اختيار مزوّد OTP (بحث أُجري، عُرض على المؤسس، القرار لم يُحسَم بعد عمداً — راجع "ليس
          الآن").
          (ج) **Guest Mode يبقى الافتراضي فعلياً** — `getCartIdentity()`/`getExistingCartIdentity()`
          (`cart-session.ts`) تفحصان جلسة عميل أولاً، ثم تتراجعان لكوكي الضيف كما كان تماماً. Checkout
          الضيفي (اسم+هاتف+عنوان نصي، بلا حساب) **بلا أي تغيير**.
          (د) **دمج سلة الضيف** — `cartService.mergeGuestCartIntoUser(guestSessionToken, userId)`
          (جديد) يُستدعى مرة واحدة من Server Action الدخول/التسجيل بعد نجاحهما. عند تعارض نفس
          المنتج/الاختيار في السلتين: **تُجمَع الكميات، لا استبدال** — قرار مؤسس صريح. لا إعادة فحص
          مخزون أثناء الدمج عمداً (المحتوى مؤقت بطبيعته، الفحص الحاسم يبقى عند Checkout، ADR-022).
          `cartRepository.deleteCart` جديدة (حذف صف السلة الفارغ بعد الدمج، `cart_items` تُحذف تلقائياً
          عبر `on delete cascade` الموجود أصلاً). `getItemCountForSession`/`getTotalForSession`/
          `getSummaryForSession` عُمِّمت إلى `getItemCountForIdentity`/`getTotalForIdentity`/
          `getSummaryForIdentityIfExists` (تقبل `CartIdentity` كاملة لا `sessionToken` فقط) — وإلا
          يبقى عدّاد/إجمالي الهيدر صفراً دائماً لعميل مسجَّل دخوله فعلياً (سلته بـ`userId` لا
          `sessionToken`، `carts_identity_xor`، ADR-008).
          (هـ) **إصلاح جانبي حقيقي اكتُشف حياً أثناء التحقُّق (لا مخطَّط له مسبقاً)** —
          `khalilRepository.findUserById` كانت تستخدم العميل العام (`anon`)، موثَّقة صراحة في
          `ADR-009` كدالة "لا تعمل فعلياً" (سياسة RLS الوحيدة على `users`، `auth.uid()=id`، لا تنطبق
          أبداً بلا Supabase Auth حقيقية) لكن "غير مستخدَمة فلا انحدار وقع". `khalilService.findUserById`
          الجديدة (لعرض اسم العميل في `account/page.tsx`) هي **أول مستهلك حقيقي فعلي على الإطلاق** —
          اكتُشف العطل حياً (الحساب يُسجَّل بنجاح، الكوكي يُضبَط بشكل صحيح، لكن الصفحة تعرض "ضيف"
          دائماً رغم جلسة صالحة 100% في القاعدة) بعد تشخيص متسلسل حي (فحص الكوكي، فحص الجلسة في
          القاعدة مباشرة، فحص السجل عبر تسجيل مؤقت داخل الكود، `curl` مباشر بالكوكي الدقيق) استبعد كل
          الطبقات الأخرى واحدة تلو الأخرى قبل الوصول لهذا السطر تحديداً. أُصلِحت بتحويلها لـ
          `supabaseAdmin`، نفس نمط `findUserByPhoneAdmin` المجاورة تماماً.
Context: تقرير استقصائي كامل (Read-Only، لا افتراض) عرض على المؤسس: `users`/`sessions` تدعمان
          `role='customer'` منذ اليوم الأول (بما فيها `password_hash`/`must_change_password` — أعمدة
          عامة، لا حصر على التاجر)؛ 28 صف `users` بدور `customer` موجودون فعلياً (أُنشِئوا صامتاً عبر
          `findOrCreateCustomerByPhone` أثناء Checkout ضيفي سابق، بلا كلمة مرور/جلسة قط)؛ `carts`
          تدعم `user_id` XOR `session_token` منذ ADR-008 لكن `getCartIdentity()` لم تُنتج `{userId}`
          إطلاقاً من قبل؛ `merchant-session.ts` نمط جاهز للنسخ حرفياً. المؤسس اعتمد التصميم المقترح
          بالكامل (أ-هـ من التقرير الاستقصائي)، بما فيه تصحيح معماري على طلب أولي بـ"RLS صارم" —
          راجع بند RLS أدناه.
Alternatives: (أ) بناء نظام مصادقة عميل منفصل بالكامل عن khalil — مرفوض صراحة: يكرر ملكية جدول
          `users`/`sessions` القائمة أصلاً في خليل (نفس مبدأ ADR-009 الرافض لنطاق Users/Customers
          منفصل). (ب) السماح بـ"ادّعاء" حساب ضيف موجود فوراً (كلمة مرور فقط، بلا تحقق هاتف) — مرفوض:
          يسمح لأي طرف يعرف رقم هاتف عميل سابق بانتحال حسابه بمجرد "تسجيل" كلمة مرور عليه؛ يحتاج OTP
          حقيقياً أولاً، قرار مؤسس منفصل مؤجَّل عمداً. (ج) RLS مسموح لـ`auth.uid()` على
          `user_addresses`/جداول العميل المستقبلية (كما اقتُرح أولاً) — مرفوض: **تصحيح معماري
          ضروري** أوضحه التقرير الاستقصائي — لا Supabase Auth حقيقية في هذا المشروع، `auth.uid()`
          لا يُطابِق شيئاً أبداً (نفس قيد `users` الموثَّق في `schema-setup.sql`). النمط الصحيح
          المطابق لكل جدول حساس قائم فعلاً (`merchants`/`orders`/`sessions`/`carts`/`audit_log`،
          AGENTS.md §17): RLS مقفول بالكامل بلا أي policy + وصول حصري عبر `service_role` + فحص
          `userId` صريح في كود التطبيق. (د) إعادة فحص مخزون أثناء دمج سلة الضيف (مطابقة `addItem`) —
          مرفوض: محتوى السلة مؤقت/غير مُلزِم بطبيعته أصلاً، الفحص الحاسم الوحيد يبقى Checkout
          (ADR-022)، إضافة فحص هنا يفتح أسئلة تصميم غير ضرورية (ماذا لو أصبح البند غير متاح أثناء
          الدمج تحديداً؟ حذفه صامتاً؟ فشل الدمج كله؟) لغرض لا يحتاجها فعلياً.
Why: قرار مؤسس مباشر — اعتماد التقرير الاستقصائي بالكامل بما فيه تصحيح RLS، ثم أربعة قرارات نطاق
          إضافية صريحة في نفس المحادثة: (1) مزوّد الخرائط Mapbox (لدفعة لاحقة)، (2) فلترة المناطق
          مؤجَّلة، (3) عزل تطبيق-طبقة لا RLS مسموح، (4) مزوّد OTP معلَّق حتى عرض بحث فعلي — وقرار
          نطاق خامس: لا "ادّعاء حساب" في هذه الدفعة، تسجيل عملاء جدد فقط. حسم `DD-011` (تعارض ملفات
          integration المتوازية) فُرض كشرط مسبق صريح قبل البدء — تم، مُتحقَّق منه حياً (5 تشغيلات
          متتالية بلا فشل) قبل أي سطر من هذا الـADR.
Consequences: **RLS على أي جدول عميل مستقبلي (user_addresses، إلخ) سيكون مقفولاً بالكامل بلا
          استثناء** — أي طلب مستقبلي بـ"RLS يسمح بقراءة العميل لبياناته مباشرة" يحتاج تبنّي Supabase
          Auth حقيقية أولاً (قرار معماري أعمق بكثير، غير مطروح الآن). `findUserById` أصبحت الآن
          **تعمل فعلياً لأول مرة** بعد إصلاحها — أي كود مستقبلي يفترض خطأً أنها "معطَّلة كما وثَّق
          ADR-009" يجب تصحيح هذا الافتراض (هذا الـADR هو التصحيح). مسار "ادّعاء الحساب" **غير مبني
          إطلاقاً** — عميل بهاتف يطابق صفاً موجوداً (ولو ضيفاً سابقاً بلا كلمة مرور) يُرفَض من
          التسجيل برسالة "الهاتف مسجَّل بالفعل، جرّب الدخول" رغم أنه فعلياً لا يملك كلمة مرور بعد —
          فجوة تجربة استخدام معروفة، مقبولة مؤقتاً بقرار مؤسس صريح، **ليست خطأ**. عدّاد/إجمالي السلة
          في الهيدر يعتمدان الآن على `getExistingCartIdentity` (فحص جلسة أولاً) — أي نقطة عرض سلة
          مستقبلية تحتاج قراءة "هل لهذا الزائر/العميل سلة" يجب استخدام هذا النمط لا `getExistingCartSessionToken`
          مباشرة، وإلا تتجاهل عملاء مسجَّلين دخولهم بصمت (نفس فئة الخطأ المُصلَح هنا بالضبط).
Tests: 48 اختبار integration (7 جديدة: customer.integration.test.ts — تسجيل/رفض تكرار/دخول ناجح/
          فاشل/رفض دور آخر، + دمج سلة×2) + 166 اختبار وحدة (4 جديدة لـmergeGuestCartIntoUser +
          getItemCountForIdentity فرع userId) — كلها ناجحة، `npm test` الكامل مُتحقَّق منه 5 مرات
          متتالية قبل هذا الـADR (حسم DD-011) وبعده. تحقُّق حي إضافي عبر Playwright ضد `next dev`
          حقيقي (لا mocks): تسجيل→عرض الاسم→خروج→ضيف مجدداً؛ دخول بنفس الحساب؛ ضيف يضيف للسلة (35ج)
          ← يسجّل حساباً جديداً ← كبسولة السلة في الهيدر تعرض نفس الإجمالي فوراً (35ج) — دليل حي على
          عمل الدمج + إصلاح عدّاد الهيدر معاً، لا افتراض من الكود وحده.

⚠️ تحديث 2026-09-10 — **"لا ادّعاء حساب ضيف موجود" أدناه لم يعد صحيحاً**: قرار مزوّد OTP حُسم
          (WhatsApp Authentication عبر Meta Cloud API مباشرة، SMS Misr احتياطياً) ومسار الادّعاء
          الكامل بُني فعلياً — راجع ADR-030 للتفصيل الكامل. البند الآن IMPLEMENTED لا PENDING.

⚠️ قسم "ليس الآن" (نطاق مُستبعَد عمداً من هذه الدفعة تحديداً — راجع قبل أي عمل مستقبلي على هوية
          العميل حتى لا يُفترَض أنه مُنجَز أو منسي سهواً):
- ~~لا "ادّعاء" حساب ضيف موجود~~ — **مُنفَّذ الآن، راجع ADR-030** (كان: يحتاج قرار مزوّد OTP أولاً؛
  بحث أُجري: Twilio [$0.4459/رسالة لمصر تحديداً — مرتفع]، Vonage [سعر مصر غير مؤكَّد]، SMS Misr
  [مزوّد مصري محلي، 0.38-1.00 جنيه/رسالة] — عُرض على المؤسس، ثم حُسم بقرار WhatsApp استراتيجي أوسع).
- **لا فلترة فعلية للمنتجات/التجار حسب منطقة توصيل** — `delivery_zones`/`merchant_delivery_zones`
  (الجدولان نفساهما) لم يُبنَيا بعد في هذه الدفعة أصلاً (دفعة تالية منفصلة). حتى عند بنائهما: بيانات
  + واجهة اختيار فقط، لا فلترة صفحات عرض — قرار مؤسس صريح منفصل.
- **لا `user_addresses`/`MapPicker.tsx`/`orders.delivery_lat`/`delivery_lng`** — دفعة تالية منفصلة
  (مزوّد الخرائط محسوم: Mapbox).
- **لا سحب وإفلات ولا أي واجهة إدارة لمناطق التوصيل** — خارج النطاق كلياً، غير مطروح حتى.
- **Guardian Review DEEP لم يبدأ بعد** — Authentication/Authorization/RBAC/DB Schema كلها DEEP هنا
  (AGENTS.md §17). هذا الـADR **لا يُعتبَر منجَزاً بالمعنى الكامل لـDoD** (AGENTS.md §16) حتى تكتمل
  مراجعة مستقلة فعلية — نفس نمط DD-001 (جولتا مراجعة). **outstanding صراحة، لا افتراض اكتمال.**
Related Documents: ADR-008 (carts_identity_xor)، ADR-009 (findUserById الأصلية، الآن مُصحَّحة)،
          ADR-012/ADR-013 (نمط جلسات التاجر/الإدارة)، ADR-022 (idempotency/سباق المخزون —
          لا إعادة فحص مخزون في الدمج)، ADR-024 (نفس نمط "بيانات جاهزة، منطق لاحق")، ADR-026
          (كلمة مرور/khalilService الموحَّد)، DD-011 (شرط مسبق، RESOLVED)، AGENTS.md §17 (Guardian
          Matrix)، src/core/modules/customer/{customer.service.ts,customer-session.ts,
          customer.integration.test.ts}، src/core/modules/cart/{cart.service.ts,cart-session.ts,
          cart.repository.ts}، src/core/kernel/khalil/{service.ts,khalil.repository.ts}،
          src/app/(reef)/account/{page.tsx,actions.ts,login/,register/}،
          src/components/Customer{Login,Register}Form.tsx
```

---

## ADR-030
```
Title: قناة OTP — WhatsApp Authentication عبر Meta Cloud API مباشرة (أساسي)، SMS Misr (احتياطي)،
          طبقة adapter قابلة للتبديل، ومسار "ادّعاء حساب ضيف موجود" الكامل
Status: PARTIALLY IMPLEMENTED — الكود (adapter + orchestration + مسار الادّعاء الكامل) IMPLEMENTED
          ومُختبَر وحدة بالكامل؛ **لا اختبار حي فعلي ممكن بعد** (لا قالب WhatsApp معتمَد من Meta،
          لا بيانات اعتماد حقيقية لأي قناة) — راجع "ليس الآن" وConsequences.
Date: 2026-09-10 (بعد ADR-029 مباشرة، بقرار مؤسس استراتيجي أوسع من اختيار مزوّد بحت)
Decision: (أ) **WhatsApp Authentication عبر Meta Cloud API مباشرة (لا وسيط/BSP)** هي القناة
          الأساسية لإرسال OTP — قرار مؤسس صريح، مبنيّ على سببين معاً: (1) تكلفة موثَّقة رسمياً أقل
          بفارق كبير لمصر تحديداً ($0.0036-0.014/رسالة مقابل $0.4459 لـTwilio SMS إلى مصر، راجع
          البحث المُوثَّق في ADR-029)، (2) **قرار استراتيجي أوسع**: التوسّع المخطَّط لاحقاً (السعودية،
          تركيا) يجعل قناة موحَّدة عبر الدول (WhatsApp عالمي) أوفر إدارياً وتشغيلياً من عقد/تكامل
          مزوّد SMS محلي منفصل لكل دولة (نفس مزوّد يحتاج تكاملاً جديداً وتفاوضاً منفصلاً لكل سوق).
          `SMS Misr` يبقى **احتياطياً فقط** — لعميل بلا واتساب مفعَّل على رقمه، لا القناة الأساسية.
          (ب) **طبقة adapter** (`src/core/kernel/otp/`) — `OtpChannel` واجهة عامة
          (`isConfigured()`/`send()`)، `WhatsAppOtpChannel`/`SmsMisrOtpChannel` تطبيقان مستقلان،
          `OtpService.sendChallenge()` يجرّب القنوات بترتيب أولوية (WhatsApp ثم SMS Misr)، يتخطّى
          أي قناة غير مُعدَّة (`isConfigured()` false) أو فشلت فعلياً، ويخزّن التحدي فقط بعد نجاح
          إرسال حقيقي. **Fail Closed صريح**: بلا أي قناة مُعدَّة أو نجحت، رفض واضح — لا نجاح وهمي،
          لا تحدٍّ يُخزَّن بلا إرسال فعلي وراءه. تبديل/إضافة قناة مستقبلية = ملف واحد جديد يطبّق
          `OtpChannel` + سطر واحد في مصفوفة `CHANNELS` — نفس نمط `MapPicker.tsx` (غلاف adapter رقيق،
          قرار مؤسس سابق لنفس الفلسفة).
          (ج) **`otp_challenges` جدول جديد** (`scripts/otp-schema.sql`) — الرمز نفسه لا يُخزَّن نصاً
          صريحاً أبداً (`code_hash` فقط، عبر `hashPassword`/`verifyPassword` الموجودتين أصلاً —
          scrypt، لا تبعية جديدة). RLS مقفول بالكامل بلا أي policy (نفس نمط sessions/carts).
          صلاحية 5 دقائق، حد 5 محاولات تحقق لكل تحدٍّ، ومعدَّل إرسال منفصل وأضيق
          (`OTP_SEND_RATE_LIMIT`: 3/ساعة لكل هاتف — أضيق من `LOGIN_RATE_LIMIT` عمداً، كل إرسال
          ناجح تكلفة حقيقية بالمال، لا محاولة دخول مجانية).
          (د) **مسار الادّعاء الكامل** — `customerService.startClaim(phone)` (يتحقق من وجود صف
          `customer` حقيقي أولاً، ثم `otpService.sendChallenge`) و`confirmClaim(phone, code,
          newPassword)` (يتحقق عبر `otpService.verifyChallenge`، ثم يضبط كلمة مرور جديدة على
          **الصف الموجود نفسه** — لا صف جديد — وينشئ جلسة، ويدمج سلة الضيف نفس منطق
          register/login تماماً). صفحة `/account/claim` (نموذج بخطوتين: هاتف → رمز+كلمة مرور
          جديدة)، ورابط "استرجع الحساب" يظهر تلقائياً في `CustomerRegisterForm.tsx` عند محاولة
          تسجيل بهاتف موجود مسبقاً.
          (هـ) **حساب WhatsApp Business لمصر الآن فقط — قرار تخطيطي مُسجَّل لا مُنفَّذ**: أي توسّع
          مستقبلي فعلي للسعودية يتطلب **حساب WhatsApp Business منفصلاً مسجَّلاً هناك** (رقم هاتف
          سعودي مستقل، تسجيل Meta Business منفصل) — لا إعادة استخدام حساب مصر لأرقام سعودية. السبب:
          توثيق Meta الرسمي يميّز صراحة بين أسعار "Authentication (local)" و"Authentication -
          international" لكل زوج (دولة المُرسِل، دولة المُستقبِل) — رسالة تُرسَل من حساب مصري إلى
          رقم سعودي تُحتسَب دولية بسعر أعلى (فرق موثَّق يصل 5× حسب نوع القالب/الدولة)، بينما حساب
          سعودي محلي يرسل لأرقام سعودية بسعر محلي أرخص. **لا تنفيذ الآن** — فقط تسجيل القرار كي لا
          يُفترَض خطأً وقت التوسّع الفعلي أن حساب مصر يكفي لكل الأسواق.
Context: طلب مؤسس مباشر بعد عرض بحث OTP (ADR-029): "SMS Misr" وحده كان الاقتراح الأولي (الأرخص
          محلياً في ذلك البحث)، لكن المؤسس اختار توجهاً أوسع (WhatsApp) استناداً لاعتبار استراتيجي
          (توحيد القناة عبر التوسّع الجغرافي المخطَّط) لا التكلفة الفورية لمصر وحدها — قرار يتجاوز
          نطاق البحث الأصلي عمداً، مُسجَّل هنا بسببه الكامل لا كاختيار تعسفي.
Alternatives: (أ) SMS Misr كقناة أساسية وحيدة (الاقتراح الأصلي من البحث) — مرفوض: يتجاهل الاعتبار
          الاستراتيجي (توسّع متعدد الدول)، رغم كونه فعلياً الأرخص لمصر وحدها اليوم بالضبط. (ب) BSP
          وسيط (Twilio/Vonage WhatsApp Business API، لا Meta Cloud API مباشرة) — مرفوض ضمنياً بقرار
          "مباشرة" الصريح: طبقة وسيطة إضافية = تكلفة/تعقيد زائدان بلا داعٍ فعلي بحجم هذا المشروع
          (نفس فلسفة "لا تبنِ أكثر من المطلوب فعلاً" المتكررة في هذا السجل). (ج) تخزين الرمز نصاً
          صريحاً (لا تجزئة) — مرفوض: بيانات مصادقة حساسة (Authentication DEEP)، لا مبرر لخفض حماية
          عن مستوى كلمة المرور نفسها لمجرد قصر عمر الرمز. (د) بناء نظام Migrations رسمي بمناسبة
          هذا الجدول — مرفوض: خارج نطاق قرار OTP تحديداً، نفس القيد المتكرر منذ ADR-017.
Why: قرار مؤسس مباشر — WhatsApp استراتيجياً، SMS Misr احتياطياً، طبقة adapter صريحة الشكل (نفس نمط
          MapPicker.tsx)، ابدأ التقديم لـMeta فوراً كخطوة منفصلة بلا انتظارها لبدء الكود، ووثّق قرار
          الحساب المنفصل للسعودية الآن دون تنفيذه.
Consequences: **لا اختبار حي فعلي (End-to-End حقيقي عبر شبكة فعلية) ممكن حتى الآن** — لا قالب
          WhatsApp معتمَد من Meta بعد (خطوة بشرية، الموافقة قد تأخذ أياماً)، ولا بيانات اعتماد
          SMS Misr حقيقية، ولا توثيق API رسمي كامل لـSMS Misr تحقَّقت منه مباشرة (عقد
          `sms-misr-channel.ts` مبنيّ على أفضل مصدر متاح — صفحة عامة + مستودع تكامل PHP مرجعي علني
          — **غير مؤكَّد رسمياً، يحتاج تحققاً فعلياً قبل اعتماد إنتاجي**، مُسجَّل صراحة في الكود
          والـTask Report، لا مدفون). التحقُّق المتاح اليوم: **اختبارات وحدة كاملة فقط** (18 اختبار
          جديد: 9 لـcustomer.service.ts تغطي register/login/startClaim/confirmClaim، 9 لـ
          otp.service.ts تغطي اختيار القناة/Fallback الحقيقي/Fail Closed/انتهاء الصلاحية/استنفاد
          المحاولات/استهلاك التحدي) — منطق التنسيق (Orchestration) مُثبَت صحيحاً، **لا الإرسال
          الفعلي عبر شبكة حقيقية**. اختبار تكامل لـ`otp.repository.ts` (يحتاج `otp_challenges` حياً
          فقط، لا بيانات اعتماد قناة) مُخطَّط، ينتظر تشغيل `scripts/otp-schema.sql` يدوياً على dev
          (المؤسس، Supabase SQL Editor، نفس نمط كل جدول سابق). **Guardian Review DEEP لم يبدأ بعد**
          (Authentication، أعلى حساسية ممكنة هنا تحديداً — رمز يفتح الباب لضبط كلمة مرور على حساب
          موجود). محتوى قالب Authentication المطلوب تقديمه لـMeta جاهز (راجع Task Report المرفق) —
          **تقديمه الفعلي عبر Meta Business Manager فعل بشري لا يستطيع الوكيل تنفيذه** (يحتاج حساب
          Business حقيقياً موثَّقاً، رقم هاتف مُسجَّل، ملكية المؤسس الكاملة) — مُسلَّم للمؤسس كخطوة
          منفصلة صريحة كما طُلب.
Tests: 184/184 وحدة (18 جديدة: 9 customer.service.test.ts + 9 otp.service.test.ts، مُتحقَّق منها
          حياً عبر npm run test:unit). integration/Guardian: outstanding صراحة، لا افتراض اكتمال.

⚠️ تحديث 2026-09-13 — `scripts/otp-schema.sql` **نُفِّذ فعلياً على dev** (المؤسس، Supabase SQL
          Editor). اختبار تكامل جديد `otp.repository.integration.test.ts` (5 اختبارات: إدراج/قراءة
          حقيقيان، تجاهل تحدٍّ مُستهلَك عند البحث عن النشط، زيادة عدّاد المحاولات فعلياً في القاعدة،
          استهلاك التحدي يمنع إعادة إيجاده) — **5/5 ناجحة ضد dev الحي**، يثبت أن الجدول/الأعمدة/
          القيود تعمل تماماً كما صُمِّمت. مجموعة integration الكاملة الآن **53/53** (كانت 48). **لا
          يزال بلا اختبار حي فعلي للإرسال عبر أي قناة حقيقية** — لا قالب WhatsApp معتمَد بعد، لا
          بيانات اعتماد لأي قناة (تحقَّقت حياً: كل متغيرات WHATSAPP_*/SMS_MISR_* غائبة من `.env.local`
          حتى الآن) — Fail Closed يعمل كما صُمِّم (لا قناة مُعدَّة = رفض صريح)، لكن هذا لم يُختبَر
          Guardian بعد كنتيجة أمنية مقصودة، فقط كأثر جانبي لغياب الإعداد.
Related (إضافية): src/core/kernel/otp/otp.repository.integration.test.ts

⚠️ قسم "ليس الآن" (نطاق مُستبعَد عمداً):
- **تقديم القالب الفعلي لـMeta وموافقته** — فعل بشري (المؤسس)، خارج قدرة الوكيل كلياً. محتوى جاهز
  للتقديم مباشرة (راجع Task Report).
- **إنشاء حساب WhatsApp Business للسعودية** — قرار تخطيطي مُسجَّل فقط (بند هـ أعلاه)، لا تنفيذ قبل
  توسّع فعلي حقيقي هناك.
- **تحقق رسمي كامل لعقد SMS Misr API** — يحتاج تواصلاً مباشراً مع دعمهم أو طلباً تجريبياً حياً
  (`environment=2`)، لم يحدث بعد.
- **مسارات purpose أخرى غير `claim_account`** (مثال: `password_reset` لعميل نسي كلمة مروره فعلياً،
  لا لادّعاء حساب) — البنية جاهزة (`OtpPurpose` union قابل للتوسعة بسطر واحد + CHECK constraint)
  لكن لم تُطلَب، لا تُبنى استباقاً.
- **Guardian Review DEEP** — لم يبدأ، نفس تحذير ADR-029 تماماً.
Related Documents: ADR-029 (السياق المباشر، قسم "ليس الآن" الأصلي المُحدَّث هنا)، ADR-026
          (hashPassword/verifyPassword المُعاد استخدامهما لتجزئة الرمز)، docs/SECURITY.md §12
          (Rate Limiting)، AGENTS.md §5 (Never Infer Missing Architecture — عقد SMS Misr غير
          المؤكَّد)، AGENTS.md §17 (Guardian Matrix)، scripts/otp-schema.sql،
          src/core/kernel/otp/{types.ts,whatsapp-channel.ts,sms-misr-channel.ts,otp.repository.ts,
          otp.service.ts,otp.service.test.ts}، src/core/modules/customer/{customer.service.ts,
          customer.service.test.ts}، src/app/(reef)/account/claim/، src/components/CustomerClaimForm.tsx،
          .env.example
```

---

## ADR-031
```
Title: توثيق رجعي — الكتالوج الأساسي (MasterCatalogItem) وقائمة مراجعة الاستيراد (Review Queue)
          لحل تكرار المنتجات عبر التجار؛ تصحيح مرجع "ADR-025" الخاطئ في تعليقات الكود
Status: ACCEPTED — توثيق رجعي (Retroactive Documentation) لقرار مُنفَّذ فعلياً وحيّ في الكود منذ
          2026-09-13 (commit `1c62fd9`)، لا قراراً جديداً ولا تغييراً في السلوك. يُغلِق ثغرة حوكمة
          حقيقية رصدها `docs/audits/2026-09-14-reef-v1-engineering-audit.md` (§10، §17 بند 4): الكود
          كان يشير لمرجع "ADR-025" الذي هو فعلياً قرار تركيب shadcn/ui (راجع `ADR-025` أعلاه — موضوع
          مختلف كلياً)، بلا أي سجل ADR حقيقي لهذا القرار المعماري — انتهاك مباشر لـ`AGENTS.md §13`
          ("No Silent State Change": تغيير Schema/قاعدة عمل يجب الإعلان عنه صراحة) و`AGENTS.md §16`
          (تحديث التوثيق جزء من Definition of Done).
Date: 2026-09-14 (تاريخ كتابة هذا التوثيق). القرار المعماري نفسه نُفِّذ فعلياً في 2026-09-13
          (commit `1c62fd9`، رسالة commit عامة "chore: save state before ui refactoring" لا تكشف
          طبيعة التغيير الحقيقية — وهذا بالضبط ما جعله يفوت أي مراجعة/توثيق وقت التنفيذ).
Decision: نموذج ثلاثي الطبقات، مُطابِق لِما هو منفَّذ فعلياً في `catalog.service.ts`/`catalog.repository.ts`/
          `types.ts` اليوم (لا تغيير على أي منها في هذه المهمة، توثيق بحت):
          (أ) **`MasterCatalogItem`** (`catalog_master_items`، `scripts/catalog-import-schema.sql`) —
          عنصر كتالوج مرجعي واحد يملكه `platform_admin` حصراً: الاسم، الوصف، **سعر البيع المعتمَد**
          (`basePrice`)، الوحدة، الصورة، التصنيف. لا كتابة عليه إلا عبر `supabaseAdmin`
          (`catalog.repository.ts:180-225`) — نفس نمط "قفل كامل، service_role فقط" المتَّبع لكل
          جدول حساس آخر في المشروع.
          (ب) **`products` كنسخة تاجر (Clone)** — كل تاجر يستورد عنصراً من الكتالوج الأساسي يحصل على
          صف `products` خاص به، مربوط بـ`master_item_id` (عمود جديد، nullable، `products.master_item_id`)،
          **سعر بيعه مقفول على سعر الكتالوج الأساسي** (`upsertTenantProductFromMaster`،
          `catalog.service.ts:133-145`) — التاجر لا يملك صلاحية تعديل سعر البيع لصف مُستنسَخ، فقط
          كميته وتكلفته الخاصة عبر `inventoryService.setStockForImport` (`inventory.service.ts`).
          تعديل سعر الكتالوج الأساسي (`updateMasterItemPrice`، `catalog.service.ts:112-129`) **يتدفَّق
          تلقائياً (Cascade)** لكل صف تاجر مرتبط (`cascadeBasePriceToLinkedProducts`،
          `catalog.repository.ts:229-237`) — "سعر البيع يحدده المالك فقط" مطبَّق فعلياً في الكود، لا
          مجرد نية معمارية.
          (ج) **استيراد Excel التاجر ومطابقة تلقائية/قائمة مراجعة** (`importMerchantExcel`،
          `catalog.service.ts:150-173`) — التاجر يرفع ملف بثلاثة أعمدة فقط (اسم، كمية، تكلفة — **لا
          سعر بيع إطلاقاً**، `MerchantImportRow`)، `tenantId` يصل من جلسة التاجر (`merchant-session`)
          لا من أي مدخل عميل (عزل مستأجرين، `INV-TEN-001` بلا تغيير). لكل صف: تطابق **حرفي بعد تطبيع
          الاسم فقط** (`normalizeProductName`، `text-normalize.ts`) مع أسماء الكتالوج الأساسي — **لا
          مطابقة تقريبية (fuzzy)** (قرار مؤسس صريح موثَّق في تعليق `text-normalize.ts:3-5`، لتفادي دمج
          مالي/مخزوني خاطئ صامت، `AGENTS.md §8 Fail Closed`). عند تطابق: يُنشأ/يُحدَّث صف `products`
          التاجر تلقائياً (`matched++`). عند عدم تطابق: يُضاف صف `catalog_review_queue` (بحماية من
          التكديس، `findPendingReviewQueueItem`) بانتظار قرار `platform_admin`.
          (د) **حسم قائمة المراجعة — بيد `platform_admin` حصراً** (`getAdminSession` في
          `src/app/admin/catalog/review/actions.ts`)، بخيارين لا ثالث لهما:
          `resolveReviewQueueAsNew` (`catalog.service.ts:181-209`) — يعتبر الصف منتجاً جديداً كلياً،
          الأدمن يحدد الاسم/التصنيف/سعر البيع/الوحدة بنفسه، فيُنشأ `MasterCatalogItem` جديد وصف
          `products` تاجر مرتبط به؛ أو `resolveReviewQueueAsMerge` (`catalog.service.ts:213-237`) —
          يدمج الصف مع عنصر كتالوج أساسي **موجود بالفعل**، فيُنشأ فقط صف `products` تاجر مرتبط بذلك
          العنصر القائم — هذا الخيار هو الحل المباشر لمشكلة "منتجات متطابقة عبر تجار متعددين". كل
          الحالات الأربع (إنشاء عنصر أساسي، تعديل سعره، حسم مراجعة كمنتج جديد، حسم مراجعة كدمج) تُسجَّل
          في `auditService.log` (`entityType: 'catalog_master_item' | 'catalog_review_queue'`).
Context: المشكلة الحقيقية التي استوجبت هذا الحل: إبلاغ مؤسس مباشر (`docs/ROADMAP.md → "🚨 أولوية
          عاجلة جديدة"`، 2026-09-08) بأن **70 تاجراً حقيقياً** منتظرون الانضمام (~5000 منتج متوقَّع
          خلال أسبوع)، منهم **10 تجار (من الـ70) بمنتجات متطابقة أو شديدة التشابه فيما بينهم** — بلا
          هذا الحل، كل تاجر يُدخِل نفس المنتج (مثال موثَّق: "أرز مصري 5 كجم") كنسخة كاملة مستقلة عبر
          `tenant_id` (النموذج القديم، ما زال يعمل بلا تغيير لأي صف `master_item_id = null`)، ما يعني
          تكراراً بصرياً حقيقياً للعميل (نفس المنتج بعشر بطاقات مختلفة) وجهد إدخال بيانات مكرَّراً على
          كل تاجر. راجع أيضاً `ideas/IDEAS.md → IDEA-004` ("الكتالوج الموحَّد") — سجَّل نفس المشكلة
          والحاجة صراحة بوصفها `PROPOSED — عاجل` بانتظار "مناقشة الجاهزية" قبل التنفيذ؛ الكود الفعلي
          (`1c62fd9`) نفَّذ حلاً عملياً لهذه المشكلة تحديداً بعد ذلك بخمسة أيام **دون** إغلاق ذلك
          الـIDEA أو تسجيل ADR وقتها — هذا الـADR يُغلِق فجوة التوثيق تلك رجعياً، لا يُقرِّر شيئاً
          جديداً.
Alternatives: (أ) **الوضع القديم — كل تاجر منتج مستقل بالكامل** (`products.tenant_id` بلا أي مفهوم
          "منتج مرجعي" مشترك، `docs/DATABASE.md §3` الأصلي) — هذا هو النموذج الذي كان قائماً فعلياً
          قبل `1c62fd9`، ولا يزال **مدعوماً بالتوافق العكسي** (`master_item_id` عمود nullable، كل صف
          `products` قديم/تجريبي يبقى صالحاً بلا ربط) — لم يُستبدَل، بل أُضيف مسار جديد اختياري بجانبه.
          مرفوض كحل وحيد للمستقبل: لا يحل مشكلة الـ10 تجار المتطابقين إطلاقاً، وكان سيُضاعِف مشكلة
          التكرار البصري مع دخول 70 تاجراً حقيقياً دفعة واحدة.
          (ب) **نموذج "السوق المفتوح" الكامل** (`merchant_offers` كجدول ربط مستقل يفصل "المنتج
          المرجعي" عن "عروض التجار" — عدة تجار يعرضون نفس المنتج المرجعي كل بسعره الخاص، العميل يختار
          البائع) — هذا هو ما وصفه `ideas/IDEAS.md → IDEA-004` فعلياً كسؤال معماري مفتوح، ومرتبط
          بـ`docs/BUSINESS_RULES.md → BR-017` ("نموذج ظهور البائع": علامة موحَّدة تُخفي هوية البائع
          مقابل سوق مفتوح يُظهرها). **لم يُبنَ ولا يُقترَح بناؤه الآن** — النموذج الحالي (نسخة واحدة
          مقفولة السعر لكل تاجر) كافٍ تماماً لموجة الـ70 تاجراً القادمة ولأي قسم يتبع نموذج "العلامة
          الموحَّدة" (BR-017، خيار أ)؛ نموذج السوق المفتوح الحقيقي يصير مطلوباً فقط لأقسام محدَّدة
          يختارها المؤسس صراحة لهذا النموذج (مثال مذكور: الأسماك، اللحوم) — وBR-017 نفسه **لا يزال
          PROPOSED** بلا قرار مؤسس نهائي بعد. هذا حد معروف مسجَّل، لا خطة تنفيذ.
Consequences: النموذج الحالي **يحل فعلياً وبالكامل** مشكلة "10 من 70 تاجراً بمنتجات متطابقة" لموجة
          الاستقبال القادمة — دمج عبر `resolveReviewQueueAsMerge` يعني عنصر كتالوج واحد فقط لكل منتج
          حقيقي متكرر، بصرف النظر عن عدد التجار الذين يبيعونه. **حدود معروفة تبقى بلا حل هنا (لا
          إخفاءً لها):** (1) لا مطابقة تقريبية (fuzzy) — أي اختلاف حرفي (خطأ إملائي، ترتيب كلمات مختلف)
          بعد التطبيع يُعامَل كمنتج جديد، تحديداً بقرار مؤسس (Fail Closed أوضح من دمج خاطئ صامت)، لا
          عيباً غير مقصود؛ (2) لا اختبار وحدة مخصَّص لمنطق الـmaster-item/cascade/مطابقة اليوم — مسجَّل
          فعلياً كـ`DD-004` في `AGENTS.md §12` DECISION DEBT REGISTRY، ومهمة منفصلة (`TASK-06`) تُغلِقه
          لاحقاً، خارج نطاق هذا الـADR التوثيقي البحت؛ (3) هذا **ليس** نموذج "سوق مفتوح" — راجع
          Alternatives (ب) أعلاه، قرار مستقبلي منفصل يعتمد على حسم `BR-017` أولاً، لا خطة معلَنة هنا.
          **تصحيح مرجعي:** كل تعليق كود كان يشير خطأً لـ"ADR-025" في سياق "CATALOG-IMPORT-WORKFLOW"
          (17 موضعاً عبر 16 ملفاً — `scripts/catalog-import-schema.sql`،
          `src/core/modules/catalog/{catalog.service.ts,catalog.repository.ts,types.ts,
          text-normalize.ts}`، `src/core/modules/inventory/{inventory.service.ts,
          inventory.repository.ts,types.ts}`، `src/core/modules/audit/types.ts`،
          `src/app/admin/catalog/actions.ts`، `src/app/admin/catalog/review/actions.ts`،
          `src/app/merchant/import/actions.ts`، `src/components/{MasterItemForm.tsx,MasterItemRow.tsx,
          MerchantImportForm.tsx,ReviewQueueRow.tsx}`) صُحِّح ليشير لهذا الـADR-031. مراجع "ADR-025"
          الأخرى في الكود (`src/app/globals.css`، `src/app/layout.tsx`، `src/components/FeedTabBar.tsx`،
          `src/config/personal-theme-registry.ts`) **لم تُلمَس** — هي إشارات صحيحة فعلياً لقرار
          shadcn/ui الحقيقي (`ADR-025` أعلاه)، لا خطأً.
Related Documents: docs/audits/2026-09-14-reef-v1-engineering-audit.md → §10 (Catalog Architecture)،
          §17 بند 4، §19 بند 11؛ docs/ROADMAP.md → "🚨 أولوية عاجلة جديدة" (2026-09-08)؛
          ideas/IDEAS.md → IDEA-004؛ docs/BUSINESS_RULES.md → BR-017؛ AGENTS.md §12 (DECISION DEBT
          Registry → DD-004)، §13 (No Silent State Change)، §16 (Definition of Done)؛ ADR-025 (الموضوع
          الحقيقي — shadcn/ui، غير ذي صلة بهذا القرار)؛ scripts/catalog-import-schema.sql؛
          src/core/modules/catalog/{catalog.service.ts,catalog.repository.ts,types.ts,
          text-normalize.ts,excel-import.ts}، src/core/modules/inventory/{inventory.service.ts,
          inventory.repository.ts,types.ts}، src/core/modules/audit/types.ts،
          src/app/admin/catalog/{actions.ts,page.tsx,review/}، src/app/merchant/import/{actions.ts,page.tsx}،
          src/components/{MasterItemForm.tsx,MasterItemRow.tsx,MerchantImportForm.tsx,ReviewQueueRow.tsx}
```

---

## ADR-032
```
Title: TASK-08 — إصلاح فجوة حقيقية: استرجاع المخزون لا يحدث عند إلغاء طلب موجود فعلياً
          (transitionStatus → cancelled)، فقط عند فشل Checkout نفسه؛ قفلان تفاؤليان جديدان
          (orders.status، inventory.quantity_available) يمنعان استرجاعاً مضاعفاً وفقد أثر تحت تزامن
Status: ACCEPTED — طُبِّق ومُتحقَّق منه حياً (كود + اختبارات وحدة/تكامل حية، دورة Regression كاملة
          لكل حالة حرجة: بَگ متعمَّد → فشل مُثبَت فعلياً → إرجاع → نجاح)
Date: 2026-09-15
Decision: (أ) **الإصلاح الأساسي** — `transitionStatus` (`orders.service.ts`) عند الانتقال إلى
          `cancelled`، بعد نجاح تحديث الحالة فعلياً، يجلب `order_items` ويستدعي
          `inventoryService.release()` لكل بند — إعادة استخدام حرفية لآلية `reserve`/`release`
          الموجودة أصلاً في مسار تعويض فشل Checkout (`ADR-022` بند ج)، لا منطق استرجاع جديد.
          (ب) **قفل تفاؤلي جديد على انتقال حالة الطلب** — `updateOrderStatus`
          (`orders.repository.ts`) أصبح يطابق أيضاً على `fromStatus` المقروء فعلاً قبل النداء (نفس
          نمط `decrementIfAvailable`)، ويعيد `null` بدل الطلب عند تعارض تزامن حقيقي (انتقالان
          متزامنان فعليان لنفس الطلب، كلاهما يقرآن نفس الحالة القديمة قبل أن يكتب أي منهما).
          `transitionStatus` يرفض الانتقال صريحاً عند `null` بدل تنفيذ أثره (الاسترجاع) مرتين.
          (ج) **قفل تفاؤلي جديد على `InventoryRepository.restore()` نفسها** — كانت بلا أي قفل قبل
          هذه المهمة (تعليقها الأصلي افترض صراحة "لا مسار متزامن حقيقي يتنافس عليه" لأن المستدعي
          الوحيد وقتها كان تعويض فشل Checkout لبند واحد معروف؛ إضافة مسار الإلغاء كمستدعٍ ثانٍ كسرت
          هذا الافتراض فعلياً). أُضيف قفل تفاؤلي (نفس نمط `decrementIfAvailable`) بـ`maxAttempts=8`
          (أعلى من نظيره في `decrementIfAvailable` = 3، عمداً — راجع Alternatives).
Context: اكتُشف أثناء مراجعة تصميم Phase 2 (`specs/orders/PHASE_2_DOMAIN_DESIGN.md`) — **ليس جزءاً
          من Phase 2 نفسه**، بَگ حقيقي في النظام الشغّال اليوم: `InventoryService.release()` مُستدعاة
          فقط من مسار تعويض فشل Checkout (`orders.service.ts` catch block)، بلا أي استدعاء مكافئ عند
          `transitionStatus` نحو `cancelled` لطلب موجود بالفعل نجح Checkout الخاص به. الأثر: أي إلغاء
          حقيقي (تاجر/إدارة) يترك مخزونه محجوزاً للأبد بصمت، بلا أي مؤشر خطأ ظاهر — لا يعود متاحاً
          للبيع. بحث شامل (`grep`) عن كل مسارات استدعاء `InventoryService`/`InventoryRepository` في
          المشروع أكَّد أن هذه فعلاً الفجوة الوحيدة (المستدعيان الوحيدان لـ`release`/`restore` قبل
          هذه المهمة: `catalogService.setStockForImport` — استبدال كامل غير ذي علاقة — ومسار تعويض
          Checkout المذكور).
Alternatives: (أ) **قفل في-الذاكرة (single-flight) لمنع إلغاء مزدوج**، بنفس نمط `inFlightCheckouts`
          (`ADR-022` بند أ) — مرفوض: لا ينجو من تعدد نسخ الخادم (نفس قيد `DD-002` الموروث)، بخلاف
          قفل تفاؤلي على مستوى قاعدة البيانات نفسها الذي يعمل بصرف النظر عن عدد النسخ. اختير القفل
          التفاؤلي تحديداً لأنه **يعمم** المستوى الذي تعمل عليه `decrementIfAvailable` أصلاً (`ADR-022`
          بند ب) على `orders.status`، لا يخفض المستوى.
          (ب) **الاحتفاظ بـ`maxAttempts=3` في `restore()` (نفس `decrementIfAvailable`)** — مرفوض
          بدليل حي مباشر: اختبار تزامن حقيقي بـ5 استدعاءات `restore()` متزامنة فعلياً لنفس المنتج فشل
          فعلياً بعد استنفاد 3 محاولات ("فشل استرجاع المخزون... بعد 3 محاولات تحت تزاحم شديد").
          خلافاً لـ`decrementIfAvailable` (حيث فشل بعد المحاولات = "رفض بيع"، نتيجة آمنة ومقصودة)،
          فشل `restore()` بعد المحاولات يعني فقدان استرجاع مخزون مستحق فعلياً — رُفع الحد إلى 8 (إعادة
          المحاولة رخيصة: قراءة/كتابة صف واحد فقط، لا خطر حقيقي من رفعه).
          (ج) **الاحتفاظ بشكل `restore()` الحالي بلا قفل تفاؤلي**، معتمداً على أن Checkout compensation
          هو المستدعي الوحيد الفعلي — مرفوض: هذه المهمة بذاتها تضيف مستدعياً ثانياً حقيقياً
          (الإلغاء)، فينكسر الافتراض الذي بُني عليه غياب القفل أصلاً؛ عدم الإصلاح كان سيترك Lost
          Update حقيقياً موثَّقاً حياً (سكربت تحقق منفصل: 10 استدعاءات متزامنة بلا قفل أفقدت 9 من أصل
          10 تحديثات فعلياً — 101 بدل 110 متوقَّعة).
Consequences: **INV-INV-003 جديد** أُضيف في `INVARIANTS.md` (ENFORCED مباشرة، Guardian DEEP —
          Inventory Concurrency). توقيع `OrdersRepository.updateOrderStatus` تغيَّر (معامل
          `fromStatus` إلزامي جديد، يعيد `Order | null` بدل `Order`) — **تغيير حالة يُعلَن صراحة هنا**
          (`AGENTS.md §13`؛ يمس كل مستدعٍ لهذه الدالة، مستدعٍ واحد فقط حالياً: `transitionStatus`).
          توقيع `InventoryRepository.restore` لم يتغيّر خارجياً (بارامتر `maxAttempts` اختياري كان
          موجوداً بالفعل في `decrementIfAvailable`، أُضيف بنفس الاسم هنا بقيمة افتراضية مختلفة، بلا
          كسر أي مستدعٍ حالي). **حادثة عرضية أثناء تصميم اختبار Lost Update، مُسجَّلة بلا إخفاء (نفس
          منهج `ADR-022` مع حادثة تسرُّب صف اختبار مشابهة):** سكربت تحقق مستقل أول (لإثبات وجود سباق
          Lost Update فعلياً قبل الإصلاح) استخدم أول صف من جدول `products` الحي بدل منتج اختبار
          مخصَّص، فعدَّل فعلياً `quantity_available` للمنتج المرجعي المشترك "دجاجة كاملة طازجة"
          (`d2d296a8-b801-462d-9fce-17a5a17070b5`) من قيمته الأصلية (10، موثَّقة كخط أساس متعدد
          الملفات، `DD-011`) إلى 100 ثم 101 عبر السباق نفسه — اكتُشف فوراً، أُعيد الصف صراحة إلى
          `quantity_available=10` بنفس `updated_at` الأصلي، ولم يُعتمَد على هذا المنتج المشترك في أي
          اختبار لاحق (كل اختبارات TASK-08 النهائية تستخدم `productId` مخصَّصاً لوصفها الخاص، يُنظَّف
          كاملاً في `afterAll`، بنفس نمط `DD-011` القائم).
Related Documents: ADR-022 (السابقة المباشرة — نفس نمط القفل التفاؤلي، نفس فلسفة التعويض التطبيقي
          بلا معاملة ذرّية كاملة)، AGENTS.md §13 (No Silent State Change)، §17 (Guardian Matrix →
          Inventory Concurrency = DEEP)، INVARIANTS.md → INV-INV-001 (نظير مباشر)، INV-INV-003
          (جديد)، DD-011 (docs/DECISIONS.md، سابقة منتج اختبار مخصَّص لتفادي تعارض بيانات مشتركة)،
          src/core/modules/orders/{orders.service.ts,orders.repository.ts,orders.service.test.ts,
          orders.integration.test.ts}، src/core/modules/inventory/{inventory.repository.ts,
          inventory.service.ts}
```

---

## ADR-033
```
Title: TASK-13 — Checkout متعدد التجار الفعلي: استبدال رفض ADR-009 بتقسيم حقيقي حسب tenant_id،
          إعادة توجيه كل دوال Orders لجداول TASK-12، إلزامية سبب الإلغاء، وافتراض settlement_model
Status: ACCEPTED — طُبِّق ومُتحقَّق منه حياً (كود + 226 اختبار وحدة + 57 اختبار تكامل، بما فيها
          دليل Regression مباشر لكل سيناريو إطلاق: تاجران، ثلاثة تجار من فئات مختلفة، فشل ذرّي أثناء
          الإنشاء مع تعويض كامل)
Date: 2026-09-15
Decision: (أ) `OrdersService.checkout()` (`orders.service.ts`) لم يعد يرفض سلة بأكثر من `tenant_id`
          واحد (`ADR-009`، مُستبدَل هنا حرفياً) — يجمّع بنود السلة حسب `tenant_id`، وينشئ صفاً واحداً
          في `customer_orders` + صفاً واحداً في `merchant_suborders` لكل مجموعة تاجر (+
          `merchant_suborder_items`/`merchant_suborder_status_history` لكل منها)، عبر مستودع جديد
          `customerOrder.repository.ts` (لا تعديل على `orders.repository.ts` القديم — Create-only،
          صفر لمس على `orders`/`order_items`/`order_status_history`).
          (ب) **كل دالة أخرى في `OrdersService`** (`transitionStatus`، `getOrderWithItems`،
          `getStatusHistory`، `getOrdersForTenant`، `getAllOrders`، `getOrderForCustomerView`،
          `getRecentStatusHistory`) أُعيد توجيهها لنفس الجداول الجديدة — قرار مؤسس صريح (لا
          "Write Path فقط" كما اقترح الموجِّه الأصلي؛ الأثر البديل كان يترك بوابتي التاجر/الإدارة
          عمياوين تماماً عن أي طلب بعد هذه المهمة). `merchant_suborders` بديل Drop-in حرفي لصف
          `orders` (يطابق §2.2 من `specs/orders/PHASE_2_DOMAIN_DESIGN.md`) — العقد الخارجي
          (`Order`/`OrderItem`/`OrderStatusHistoryEntry` في `types.ts`) لم يتغيّر شكلاً، فقط أُضيف
          حقل اختياري جديد `Order.customerOrderId`؛ لا حاجة لمس أي `page.tsx`/Server Action مستهلك
          (`merchant/orders`، `admin/dashboard`، `/order/[id]`، `checkout/actions.ts`) — توافق خلفي
          تام للسلة أحادية التاجر (الحالة الشائعة اليوم، ~100% من الطلبات الحالية).
          (ج) **`merchants.default_settlement_model = NULL`** (وضع كل التجار الحاليين فعلياً بعد
          `TASK-12`، عمود جديد `nullable`) → `checkout()` يفترض `'reef_collected'` صراحة بدل رفض
          Checkout أو قيمة عشوائية أخرى — قرار مؤسس مباشر (2026-09-15)، يطابق الوضع التشغيلي الحالي
          (ريف تجمّع التحصيل يدوياً عبر مكاتبها). `Merchant.defaultSettlementModel` أُضيف اختيارياً
          إلى `merchant/types.ts`/`merchant.repository.ts` لدعم هذا فقط.
          (د) **إصلاح فجوة اكتُشفت أثناء إعادة التوجيه، غير موصوفة في `PHASE_2_DOMAIN_DESIGN.md`**:
          `merchant_suborder_status_history` يفرض `CHECK (to_status <> 'cancelled' OR note IS NOT
          NULL)` (قيد جديد لم يكن على `order_status_history` القديم، `TASK-12`) — لو تُرك للقيد
          وحده، `transitionStatus` كان يُحدِّث حالة الـ`suborder` إلى `cancelled` فعلياً (سطر منفصل
          سابق) ثم يفشل عند إدراج سجل التاريخ بخطأ DB خام، تاركاً الطلب "ملغياً" فعلياً بلا أي سجل
          يوثّق السبب/الفاعل وبلا استرجاع مخزون (الكود يتوقف عند الاستثناء قبل الوصول لذلك السطر) —
          حالة غير متسقة تماماً. أُضيف فحص صريح في `transitionStatus` (`toStatus==='cancelled' &&
          !note` → رفض فوري قبل أي كتابة DB)، يطابق فلسفة "فشل صريح لا نجاح صامت" القائمة أصلاً.
          (هـ) `delivery_fee_snapshot` = صفر مؤقت دائماً (`TODO` صريح في الكود) — لا خوارزمية حساب
          فعلية مبنية بعد (خارج نطاق TASK-13 صراحة، `PHASE_2_DOMAIN_DESIGN.md §5/§9`)؛ جدول
          `delivery_quotes` (من `TASK-12`) يبقى بلا أي صف حتى تُبنى تلك المهمة المستقبلية.
Context: `specs/orders/PHASE_2_DOMAIN_DESIGN.md` (`APPROVED`، 2026-09-15) صمَّم الجداول العشرة
          (`TASK-12`، نُفِّذت فعلياً على `salsabil-core` dev — تحقَّق منها المؤسس صراحة عند بدء هذه
          المهمة) لكنه ترك عمداً "تفصيلاً تنفيذياً لـTASK-13" ثلاث نقاط حاسمة لم تُحسَم إلا هنا: (1)
          هل تُعاد بقية دوال `OrdersService` لقراءة/كتابة الجداول الجديدة أم تبقى فقط تقرأ القديم؟ —
          حُسمت بند (ب) أعلاه. (2) ما سلوك `checkout()` لتاجر بلا `default_settlement_model` محدَّد
          — حُسمت بند (ج). (3) مصير رابط `/order/[id]` — لم يتغيّر: يبقى مفتاحه `merchant_suborder.id`
          (كان `orders.id`)، تماماً كأي `Order` آخر — لا حاجة لحسم "أزدواجية" لأن التوافق الخلفي
          الكامل (بند ب) يجعل السؤال غير ذي موضوع للسلة أحادية التاجر؛ يبقى مفتوحاً فقط لعرض تجميع
          متعدد التجار بصرياً للعميل (`TASK-16`، غير مبني هنا عمداً).
Alternatives: (أ) الإبقاء على `orders.service.ts` يقرأ فقط من `orders` القديم لكل شيء عدا
          `checkout()` نفسه (تفسير حرفي لـ"نطاق هذه المهمة الإنشاء لا العرض" في موجّه المهمة) — رُفض
          صراحة من المؤسس: كان يعني أن بوابتي التاجر/الإدارة (`merchant/orders`, `admin/dashboard`)
          لا تريان أي طلب جديد إطلاقاً بعد نشر هذه المهمة — انحداراً وظيفياً حقيقياً على عمل التاجر
          اليومي، لا مجرد نقص عرض بصري مؤجَّل.
          (ب) رفض Checkout صراحة لأي تاجر بلا `default_settlement_model` محدَّد (بدل الافتراض) —
          رُفض: كان سيُعطِّل Checkout فعلياً لكل الـ~70 تاجراً الحاليين فوراً عند النشر (كلهم `NULL`
          اليوم)، بلا أي فائدة تعويضية حقيقية الآن.
          (ج) الاعتماد على قيد `merchant_suborder_status_history` وحده لفرض إلزامية `note` (بلا فحص
          تطبيقي) — رُفض: يترك حالة غير متسقة فعلية (حالة `cancelled` بلا سجل ولا استرجاع مخزون) كما
          وُصف في بند (د) أعلاه، بعكس فلسفة "فشل صريح قبل أي أثر جانبي" المتَّبعة في كل مسارات
          Checkout/الانتقال الأخرى.
Consequences: **تغيير حالة يُعلَن صراحة هنا (`AGENTS.md §13`)** — العقد الخارجي لـ`transitionStatus`
          الآن يرفض أي `toStatus:'cancelled'` بلا `note` (كان مقبولاً بلا `note` سابقاً ضد
          `order_status_history` القديم؛ أي مستدعٍ حالي — `merchant/orders/actions.ts`،
          `admin/dashboard/actions.ts` — يمرّر `note` اختيارياً من واجهة موجودة أصلاً، لا يحتاج
          تعديلاً). `getMostOrderedProductIds` (توصية "غالباً ما يُشترى معه") تبقى الوحيدة المتَّصلة
          بـ`orders.repository.ts` القديم — ستُصبح تدريجياً مبنية على بيانات مجمَّدة من قبل هذا
          التحوّل فقط (`order_items` يتوقف عن استقبال صفوف جديدة) — ميزة غير حرجة، لا تصحيح فوري
          مطلوب، تحتاج إعادة بناء على `merchant_suborder_items` في مهمة منفصلة لاحقة إن استمر
          استخدامها. جدول `delivery_quotes` يبقى فارغاً بالكامل حتى بناء حساب فعلي لرسوم التوصيل
          (مهمة مستقبلية منفصلة). واجهة العميل لا تعرض بعد تجميع الطلب متعدد التجار بصرياً (تبقى
          مهمة `TASK-16` كما خُطِّط أصلاً) — العميل يرى فعلياً نصيب أول تاجر في طلبه فقط عبر
          `/order/[id]` الحالي لو كانت سلته متعددة التجار (حالة نادرة اليوم، الوضع الافتراضي لا يزال
          سلة تاجر واحد تعمل بلا أي تغيير ظاهري).
Related Documents: ADR-009 (القرار المُستبدَل)، ADR-010 (آلة الحالات المُعاد استخدامها حرفياً)،
          specs/orders/PHASE_2_DOMAIN_DESIGN.md (التصميم المعتمَد الكامل)، AGENTS.md §13 (No Silent
          State Change)، §17 (Guardian Matrix → Orders State Machine/Financial Logic = DEEP)،
          scripts/2026-09-15-phase-2-multi-merchant-schema.sql (TASK-12، الجداول العشرة)،
          src/core/modules/orders/{orders.service.ts,customerOrder.repository.ts,types.ts,
          orders.service.test.ts,orders.integration.test.ts}،
          src/core/modules/merchant/{types.ts,merchant.repository.ts}،
          src/core/e2e/reef-city-journey.integration.test.ts،
          src/core/modules/admin/admin.integration.test.ts
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
الحالة: SUPERSEDED — 2026-09-07: shadcn/ui أصبحت مثبَّتة فعلياً بطلب مؤسس مباشر (`npx shadcn@latest
init`). التعارض الأصلي (افتراض تثبيتها خطأً يوم 6) لم يعد قائماً بمعناه الأصلي، لكن الوضع لم يعد
"غير مثبّتة" أيضاً — راجع `ADR-025` لتفاصيل التركيب الفعلي وكيفية تعايشه مع أسماء `--sb-` القائمة
(لم تُعَد تسميتها، لا تزال مصدر الحقيقة لكل عالم).
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

### CONFLICT-007
```
بين: SALSABIL_CONSTITUTION.md §4 بند 5 ("كل تحوّل مخزون أو عملية مالية يُسجَّل في سجل تدقيق (Audit
          Log) — من فعل ماذا، متى، ولماذا") مقابل التنفيذ الفعلي في src/core/modules/orders/orders.service.ts
          وsrc/core/modules/inventory/inventory.repository.ts
الوصف: الادعاء الدستوري أوسع من الواقع الحالي، مُتحقَّق منه بقراءة مباشرة للكود (2026-09-05). الخصم
          الناجح للمخزون (InventoryRepository.decrementIfAvailable) والاسترجاع الناجح (restore) لا يُكتبان
          في أي سجل تدقيق مباشرة — يُستدَل على الخصم فقط بشكل غير مباشر عبر order_items (حين يرتبط بطلب
          ناجح)، والاسترجاع الناجح لا يترك أي أثر تدقيقي إطلاقاً. فقط فشل الاسترجاع التعويضي يُسجَّل فعلياً
          في audit_log (orders.service.ts، action: 'inventory.release_failed'، إضافة commit fe12608). لا
          قيد قاعدة بيانات ولا كود يمنع هذا التباين — فجوة تغطية حقيقية، لا خطأ توثيقي بسيط.
التأثير: أي تحليل مستقبلي لتاريخ حركة مخزون كاملة (خصوصاً استرجاعات ناجحة بعد فشل دفع/طلب) لن يجد سجلاً
          مباشراً لها في audit_log — يعتمد على استنتاج غير مباشر أضعف من سجل صريح. راجع INVARIANTS.md →
          INV-AUDIT-001 للتفصيل الكامل وتصنيف الحالة (VIOLATED جزئياً بالنسبة لحرفية النص الدستوري).
يحتاج قراراً من: المؤسس — هل order_items/order_status_history كافيان كسجل تدقيق غير مباشر لحركة المخزون
          المرتبطة بطلب (الحالة الشائعة)، أم يُبنى سجل inventory_audit صريح لكل حركة (خصم/استرجاع، ناجحة
          أو فاشلة) بصرف النظر عن ربطها بطلب؟
الحالة: OPEN — مُسجَّل أيضاً كـ DD-003 أدناه (DECISION DEBT REGISTRY) لأنه يمثل خطراً حقيقياً على اكتمال
          التدقيق المالي/المخزوني المُدَّعى دستورياً، لا فجوة تافهة.
```

### CONFLICT-008
```
بين: موجّه مهمة HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT ("SALSABIL_CONSTITUTION.md — قسم
          وصف الشريط السفلي: الرئيسية | التواصل | الأقسام | محفظة | ملفي") مقابل النص الفعلي لـ
          SALSABIL_CONSTITUTION.md، ومقابل اسم ملف "docs/UI_UX_DESIGN_GUIDELINES.md (الجديدة)" الذي
          طلب الموجّه قراءته أولاً
الوصف: (أ) بحث نصي شامل في SALSABIL_CONSTITUTION.md (كلا نصفي الملف) عن أي بنية "5 أزرار" أو تعداد
          حرفي "الرئيسية/التواصل/الأقسام/محفظة/ملفي" — لم يُعثَر على أي تطابق. أقرب نص ذو صلة هو §25
          ("الغلاف (Shell) والتنقل السفلي ثابتان عبر كل العوالم؛ المحتوى فقط يتغير") — مبدأ عام، لا
          بنية أزرار محدَّدة. (ب) لا وجود لملف docs/UI_UX_DESIGN_GUIDELINES.md إطلاقاً في المستودع —
          الملف الفعلي القائم هو docs/UI_UX_SYSTEM.md (مُحدَّث 2026-09-07)، افتُرض أنه المقصود.
التأثير: تنفيذ دفعة 1 (إعادة بناء BottomNav لخمسة أزرار بالمسميات الحرفية من الموجّه) استمر بلا توقف
          — التكليف المباشر من المؤسس في نفس المحادثة، بالمسميات الدقيقة، اعتُمد كموافقة صريحة كافية
          لتنفيذ تغيير UI بحت غير حسّاس (L2)، بنفس سابقة قبول تكليف §14 ADR-025 (تركيب shadcn/ui) كـ
          "موافقة صريحة" رغم خروجه عن آلية PROPOSED_CONSTITUTION_CHANGE المعتادة. لم يُطلَب توضيح عبر
          سؤال مباشر لأن القرار الفعلي (المسميات الخمس) لم يكن غامضاً — الغموض في "أين هو موثَّق"، لا
          "ماذا يجب أن يكون".
يحتاج قراراً من: المؤسس — هل تُضاف بنية "الشريط السفلي: الرئيسية | التواصل | الأقسام | محفظة | ملفي"
          فعلياً كنص صريح جديد في SALSABIL_CONSTITUTION.md (توثيقاً لقرار اتُّخذ فعلياً الآن لا سابقاً)؟
          وهل "docs/UI_UX_DESIGN_GUIDELINES.md" اسم مقصود لملف مستقبلي منفصل عن UI_UX_SYSTEM.md، أم
          سهو في اسم الملف؟
الحالة: RESOLVED — 2026-09-07: بتكليف مؤسس مباشر منفصل، أُضيفت بنية "الرئيسية | التواصل | الأقسام |
          محفظة | ملفي" فعلياً كنص صريح جديد في SALSABIL_CONSTITUTION.md (§25.1، v1.4) — راجع الملاحظة
          التنفيذية أعلى ذلك الملف وDD-009 أدناه (السجل المستقل المطلوب وفق DOCUMENTATION_RULES.md
          §5.1 شرط 4). الفجوة التوثيقية الأصلية (نص "موثَّق في الدستور" لم يكن موجوداً فعلياً وقت
          التنفيذ) مُغلَقة الآن. **شق ثانٍ غير محسوم يبقى تافهاً بلا حاجة لتتبّع منفصل:** هل
          "docs/UI_UX_DESIGN_GUIDELINES.md" اسم مقصود لملف مستقبلي منفصل عن docs/UI_UX_SYSTEM.md، أم
          سهو تسمية؟ لم يُطرَح على المؤسس صراحة عند إغلاق هذا التعارض؛ إن ظهر لاحقاً بوضوح يُسجَّل
          حينها لا الآن.
Related Documents: docs/UI_UX_SYSTEM.md (تحديث BAYAN-CLOSEOUT/HEADER-BOTTOMNAV-REDESIGN)،
          SALSABIL_CONSTITUTION.md §25.1 (v1.4)، ADR-025، DD-009
```

### CONFLICT-009
```
بين: موجّه مهمة EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (2026-09-08، المرحلة 1، بند 3:
          "وسِّع neighborhood-identity-registry.ts... ليشمل كل الأحياء الموجودة في المرجع... لكل حي
          غير موجود عندنا كقسم حقيقي بعد، وثّق قيمه في السجل فقط") مقابل ADR-024 (2026-09-07،
          Alternative "ب": "زرع كل الـ15 قيمة المُستخرَجة من المرجع فوراً بمفاتيح تخمينية لأحياء لم
          تُنشَأ بعد — مرفوضة") وideas/IDEAS.md → IDEA-002 (نفس تاريخ ADR-024: "لا تُدخَل في السجل
          الحي إلا عند إنشاء حي حقيقي يقابلها فعلاً في قاعدة البيانات").
الوصف: موجّه اليوم يطلب صراحة وبالتفصيل بالضبط النمط الذي رفضه المؤسس نفسه صراحة بفارق يوم واحد فقط
          (سبب الرفض المسجَّل وقتها: "حي غير موجود في قاعدة البيانات لا يستحق سطراً حياً في سجل
          كود"، امتداد مباشر لـ docs/ARCHITECTURE.md §8 "الأقسام بيانات من جدول Supabase لا قيم
          ثابتة بالكود"). لا خطأ في القراءة — النص الحرفي لكلا الموجّهين لا يحتمل تأويلاً آخر.
التأثير: نُفِّذ توسيع neighborhood-identity-registry.ts بالـ14 قيمة كاملة كما طلب موجّه اليوم — عُومِل
          التكليف المباشر الصريح في نفس المحادثة كموافقة كافية لإسقاط قيد ADR-024/IDEA-002 لهذه
          الدفعة تحديداً (نفس سابقة CONFLICT-008: تكليف مباشر = موافقة صريحة لتغيير UI/بيانات عرض غير
          حسّاس L1-L2، لا يمس Schema/RLS/منطقاً مالياً). لم يُطلَب توضيح عبر سؤال مباشر قبل التنفيذ
          لأن القرار الفعلي (القيم الأربعة عشر) غير غامض وموثَّق حرفياً في IDEA-002 أصلاً (نفس القيم
          بالضبط، فقط "أين تُخزَّن" هو ما تغيَّر) — التناقض تقني/توثيقي (مكان التخزين: سجل كود حي
          مقابل ideas/IDEAS.md) لا قيمي.
يحتاج قراراً من: المؤسس — هل التفضيل الجديد (توثيق كل الأحياء المستقبلية داخل السجل الحي دائماً، لا
          ideas/IDEAS.md فقط) يصبح نمطاً عاماً دائماً لكل سجل مركزي مستقبلي مشابه (يُعدَّل عندها نص
          ADR-024/IDEA-002 صراحة ليعكس القرار الجديد)، أم استثناء لمرة واحدة خاص بدفعة
          EXTRACT-DESIGN-DNA فقط (وعندها تبقى القيم الأربعة عشر هنا حالة استثنائية موثَّقة، لا سابقة
          تُقاس عليها قرارات مستقبلية)؟
الحالة: RESOLVED — 2026-09-08: قرار مؤسس مباشر — **استثناء لمرة واحدة، لا سياسة دائمة.** ADR-024/
          IDEA-002 يبقيان كما هما (المبدأ العام "الأقسام بيانات DB لا قيم ثابتة بالكود" لا يزال
          سارياً لأي سجل مركزي مستقبلي مشابه) — القيم الأربعة عشر المُضافة في هذه الدفعة تحديداً حالة
          استثنائية موثَّقة، لا سابقة يُقاس عليها. أي توسيع مماثل مستقبلاً يحتاج تصريحاً صريحاً منفصلاً
          من المؤسس في حينه، لا افتراض أن هذا القرار يُبيحه تلقائياً.
Related Documents: ADR-024، ideas/IDEAS.md → IDEA-002، src/config/neighborhood-identity-registry.ts،
          docs/ARCHITECTURE.md §8، CONFLICT-008 (السابقة المطابقة لقبول التكليف المباشر)
```

---

## DECISION DEBT REGISTRY — إضافة 2026-09-05 (`CONSTITUTION-V2-BATCH1-GOVERNANCE-KERNEL`)

> نفس منهجية CONFLICT LOG أعلاه، لكن لمخاطر/فجوات لا تحتاج بالضرورة تعارضاً بين مصدرين — تحتاج قراراً
> بشرياً، أو إصلاحاً لاحقاً، أو تمثّل خطراً معمارياً/أمنياً/تشغيلياً حقيقياً، أو تمنع قراراً/مرحلة لاحقة.
> لا يُحوَّل كل `UNKNOWN`/`PARTIAL` في `INVARIANTS.md` تلقائياً إلى Decision Debt — راجع "DECISION DEBT
> QUALIFICATION RULE" في `INVARIANTS.md` وقائمة "مراجَع ولم يُحوَّل" أسفل هذا القسم للأمثلة المُستثناة
> صراحة مع تبريرها.

### DD-001
```
Decision: هل يُبنى تحقق هوية أقوى (كلمة مرور/OTP/Supabase Auth كاملة) لتسجيل دخول التاجر/الإدارة قبل
          تسجيل تاجر ثانٍ حقيقي أو حساب platform_admin ثانٍ؟
Reason: تسجيل الدخول اليوم بالهاتف وحده (MerchantService.loginOwnerByPhone/AdminService.loginByPhone) —
          أي طرف يعرف هاتف تاجر/إدارة نشط يستطيع انتحاله بالكامل. مقبول صراحة (ADR-012/ADR-013) لمرحلة
          تاجر/إدارة تجريبيَين واحدَين فقط، بشرط صريح مسجَّل: يُغلَق قبل توسّع حقيقي.
Risk: انتحال هوية تاجر/إدارة كاملة (لا قراءة فقط — تغيير حالة طلبات، تفعيل/تعطيل تجار) لأي طرف يعرف رقم
          هاتف نشط. الخطر يتضاعف مع كل تاجر/حساب إدارة جديد يُضاف بنفس الآلية.
Owner: Founder
Created: 2026-09-05
Review by: قبل إنشاء أي حساب merchant_owner أو platform_admin ثانٍ حقيقي (شرط، لا تاريخ ثابت)
Blocking: YES — يمنع توسّع آمن لعدد التجار/حسابات الإدارة
Status: RESOLVED — تحديث 2026-09-09: القرار حُسم (كلمة مرور، لا OTP/Supabase Auth كاملة — راجع
          ADR-026)، SQL طُبِّق فعلياً على dev، scripts/backfill-existing-owner-passwords.ts شُغِّل
          بنجاح (كلمتا مرور مؤقتتان جديدتان للحسابين التجريبيين)، ومجموعة الاختبارات كاملة
          (وحدة+تكامل) 200/200 ناجحة حياً. **Guardian Review DEEP مستقل اكتمل بمراجعتين منفصلتين:**
          (1) الجولة الأولى — BLOCKED، كشفت ثغرة توقيت (Timing Attack) في
          KhalilService.verifyPasswordForPhone (مساري not_found/no_password_set يرجعان فوراً بلا
          حساب scrypt، بينما wrong_password وحده ينفّذه — فرق زمني يُعدّ به أرقام هواتف تجار
          مسجَّلين). (2) بعد إصلاح FIX-TIMING-ATTACK-VULNERABILITY-AUTH (DUMMY_PASSWORD_HASH
          بنفس معاملات scrypt، ينفَّذ في المسارين الآمنين قبل الرفض) — جولة ثانية مستقلة كلياً
          (جلسة Guardian منفصلة، لا سياق من الجولة الأولى): APPROVED. تحقَّقت بنفسها من تطابق
          معاملات DUMMY_PASSWORD_HASH، أعادت قياس RTT حياً بشكل مستقل (ratio max/min = 1.03x)،
          تحققت من عدم تسرّب password_hash وسلامة Rate Limiting (INV-RATE-001، لم يُلمَس بالإصلاح)،
          وأجرت تسجيل دخول حي فعلي (حساب اختبار مؤقت أُنشئ وحُذف على dev) بكلمتَي مرور صحيحة/خاطئة.
          كل بنود PASSWORD_AUTH_SPEC.md §10 مُتحقَّقة. **لا خطر متبقٍّ يمنع الاعتماد** — DD-002
          (القفل الموزَّع لـRate Limiting قبل إنتاج متعدد الخوادم) يبقى بنداً منفصلاً تماماً، غير
          مرتبط بهذا القرار.
Related: INV-AUTHN-001 (INVARIANTS.md، انتقل PARTIAL→ENFORCED)، ADR-012، ADR-013، ADR-026 (القرار
          والتصميم الكامل)، docs/SECURITY.md §1، specs/identity/PASSWORD_AUTH_SPEC.md
```

### DD-002
```
Decision: هل يُستبدَل القفلان في-الذاكرة (rate-limit.ts وinFlightCheckouts) بقفل موزَّع (Supabase عبر
          قيد UNIQUE مؤقت، أو Redis عند نضج البنية التحتية) قبل أي نشر إنتاج متعدد الخوادم؟
Reason: كلا القفلين Map في عملية Node واحدة — لا يُشارَكان بين نسخ خادم متعددة (Serverless/multi-instance)،
          ولا ينجوان من إعادة تشغيل الخادم. مقبولان حصراً لمرحلة خادم واحد الحالية (dev/staging.reefam.com).
Risk: على إنتاج حقيقي متعدد الخوادم (reefam.com، لا staging) بلا هذا الإصلاح: تكرار Checkout فعلي على
          نفس السلة عبر نسخ خادم مختلفة (idempotency مكسورة)، ومحاولات دخول غير محدودة فعلياً عبر توزيع
          الطلبات على نسخ مختلفة (rate limiting مكسور). كلاهما موثَّق كـBLOCKER بخطورة HIGH في
          docs/ROADMAP.md (2026-09-05).
Owner: Engineering
Created: 2026-09-05
Review by: قبل أي تفعيل حقيقي لإنتاج متعدد الخوادم على reefam.com (شرط، لا تاريخ)
Blocking: YES — BLOCKER صريح مسجَّل مسبقاً في docs/ROADMAP.md
Status: OPEN
Related: INV-ORD-002، INV-RATE-001 (INVARIANTS.md)، ADR-014، ADR-022، docs/ROADMAP.md (بند BLOCKER الموحَّد)
```

### DD-003
```
Decision: هل order_items/order_status_history كافيان كسجل تدقيق غير مباشر لحركة المخزون المرتبطة بطلب،
          أم يُبنى سجل inventory_audit صريح لكل حركة خصم/استرجاع (ناجحة أو فاشلة) بصرف النظر عن ربطها بطلب؟
Reason: راجع CONFLICT-007 أعلاه — الادعاء الدستوري ("كل تحوّل مخزون يُسجَّل") أوسع من التنفيذ الفعلي.
Risk: غياب سجل تدقيق مباشر لاسترجاعات مخزون ناجحة يُضعف أي تحقيق مستقبلي في تباين كميات مخزون فعلية
          (مثال: خلاف مع تاجر حول كمية مُتاحة، أو تحقيق في نمط بيع غير طبيعي).
Owner: Founder
Created: 2026-09-05
Review by: قبل أي ادعاء مستقبلي بـ"سجل تدقيق مخزون كامل" في أي وثيقة أو تواصل خارجي
Blocking: NO — لا يمنع تشغيلاً حالياً، لكنه يمنع ادعاء اكتمال تدقيقي دقيقاً
Status: OPEN
Related: INV-AUDIT-001 (INVARIANTS.md)، CONFLICT-007، SALSABIL_CONSTITUTION.md §4 بند 5
```

### DD-004
```
Decision: هل تُبنى اختبارات وحدة مخصَّصة لـ CatalogService.calculatePrice()/validateSelection() (حالات
          حدّية: خيارات غير موجودة، إضافات مرفوضة، أحجام متعددة معاً) بمعزل عن مسار checkout الكامل؟
Reason: لا ملف src/core/modules/catalog/*.test.ts في المستودع (تحقَّق منه بحثاً مباشراً، 2026-09-05،
          صفر نتائج) — منطق حساب السعر (Financial logic) مُغطَّى فقط بشكل غير مباشر عبر سيناريو checkout
          واحد في orders.integration.test.ts.
Risk: تغيير مستقبلي في CatalogService (إضافة نوع خيار جديد، تعديل منطق الإضافات) قد يكسر حساب سعر صحيحاً
          اليوم بلا أي اختبار يكتشف ذلك قبل الإنتاج — خطر متزايد مع توسّع الكتالوج في Phase 2.
Owner: Engineering
Created: 2026-09-05
Review by: قبل أي توسيع فعلي لأنواع خيارات المنتج (Phase 2 — توسيع أحياء ريف، docs/ROADMAP.md)
Blocking: NO — لا يمنع العمل الحالي، لكنه فجوة حقيقية على منطق مالي (Guardian Matrix: DEEP)
Status: OPEN
Related: INV-SEC-001 (INVARIANTS.md)
```

### DD-005
```
Decision: هل يُبنى نظام Migrations رسمي (Supabase CLI migrations أو مكافئه) بدل SQL يدوي عبر SQL Editor؟
Reason: OPEN_QUESTION قائم منذ docs/DATABASE.md §8 (اليوم 12/17)، مؤجَّل مرتين صراحة (اليوم 13 كمرشَّح، ثم
          Day 17 كأول خطوة جزئية فقط عبر scripts/schema-setup.sql — ليس نظام Migrations رسمياً بعد).
Risk: لا تتبع نُسخ Schema، لا rollback، تنفيذ يدوي عرضة لخطأ بشري على قاعدة حية بلا مراجعة قبل التنفيذ.
          docs/DATABASE.md §8 نفسه يقر: "يجب الانتقال لـMigrations رسمية قبل أي عمل فريق متعدد أو قبل
          الإنتاج."
Owner: Engineering
Created: 2026-09-05
Review by: قبل أي عمل فريق هندسي متعدد الأشخاص، أو قبل أي Migration إنتاجية إضافية بعد هذه الدفعة
Blocking: YES — لعمل فريق متعدد/إنتاج حقيقي (بحسب توثيق DATABASE.md §8 نفسه)؛ NO لعمل مؤسس منفرد حالي
Status: OPEN
Related: docs/DATABASE.md §8، ADR-017
```

### DD-006
```
Decision: هل تُبنى فحوصات تفويض داخلية (Authorization checks) داخل طبقة service.ts نفسها لدوال القوائم
          الجماعية (OrdersService.getOrdersForTenant/getAllOrders، MerchantService.listAll)، بدل الاعتماد
          حصرياً على طبقة Server Action المستدعية للتحقق من الجلسة/الدور أولاً؟
Reason: هذه الدوال لا تحقق صلاحية داخلياً بتصميم مقصود (موثَّق صراحة في docs/DOMAIN_MAP.md → Admin:
          "لا تحقق صلاحية داخل merchantService نفسها — مسؤولية المستدعي") — بخلاف دوال المعرّف الواحد
          (getOrderWithItems/getStatusHistory/transitionStatus) التي تحمل الآن assertActorCanAccessOrder
          إلزامياً في التوقيع نفسه (ADR-022 بند د).
Risk: طبقة دفاع وحيدة (Server Action) بلا دفاع ثانٍ عند طبقة الخدمة لدوال القوائم — خطر منخفض اليوم (تاجر
          حقيقي واحد، سطح Server Action صغير)، يتصاعد مع كل Server Action/صفحة إدارية جديدة تُضاف مستقبلاً.
Owner: Engineering
Created: 2026-09-05
Review by: قبل إضافة أي Server Action/صفحة إدارية جديدة تستدعي هذه الدوال، أو قبل تسجيل تاجر ثانٍ حقيقي
Blocking: NO — لا خطر فعلي نشط اليوم (تاجر واحد)، لكنه نمط معماري يستحق قراراً صريحاً قبل التوسّع
Status: OPEN
Related: INV-TEN-001 (INVARIANTS.md)، docs/DOMAIN_MAP.md → Admin/Orders، ADR-022 بند د
```

### DD-007
```
Decision: لا قرار معلَّق — توثيق واقعة تكليف مكتملة، لا مسألة تحتاج حسماً مستقبلياً. بتاريخ 2026-09-05،
          المؤسس كلَّف صراحة بتعديل docs/DOCUMENTATION_RULES.md §5.1 ضمن مهمة
          BATCH1-GUARDIAN-REMEDIATION-001، خارج نطاق الأربعة ملفات الأصلي لـBatch 1
          (SALSABIL_CONSTITUTION.md، AGENTS.md، INVARIANTS.md، docs/DECISIONS.md).
Reason: هذا التكليف صادر من محادثة المؤسس مع المستشار المعماري (Claude Web)، لا من قرار ذاتي للوكيل
          المنفِّذ داخل جلسة Claude Code. مراجعة Guardian الثانية (BATCH1-SECOND-PASS-GUARDIAN-001، بندها
          3/5) رصدت أن هذا التكليف كان موثَّقاً فقط داخل وصف الوكيل لعمله (Task Report الخاص به) — بلا أي
          أثر مستقل في المستودع نفسه يثبت أن التوسيع خارج الأربعة ملفات جاء بتفويض حقيقي من المؤسس، لا
          باجتهاد ذاتي من الوكيل. هذا السجل هو ذلك الأثر المستقل المطلوب.
Risk: بلا هذا السجل، الاستثناء الإجرائي في docs/DOCUMENTATION_RULES.md §5.1 (وأي توسيع نطاق مشابه
          مستقبلاً بنفس الآلية) كان يعتمد فقط على وصف الوكيل لنفسه كدليل — وهو تحديداً نوع الادعاء غير
          الموثوق الذي تمنعه هذه الوثائق نفسها (راجع SALSABIL_CONSTITUTION.md §4.1، Evidence Model:
          "وجود التوثيق لا يُصحِّح كوداً/ادعاءً خاطئاً"). غياب مصدر مستقل يُضعف مصداقية أي استثناء لاحق
          يستند لنفس الشرط الإجرائي.
Owner: Founder
Created: 2026-09-05
Review by: N/A — سجل توثيقي مكتمل بذاته (هو الدليل المطلوب، لا قراراً معلَّقاً ينتظر مراجعة لاحقة)
Blocking: NO
Status: RESOLVED — بمجرد كتابة هذا السجل نفسه؛ هذا هو الشرط الرابع المُضاف الآن في
          docs/DOCUMENTATION_RULES.md §5.1 (أول تطبيق فعلي مطابق له)
Related: docs/DOCUMENTATION_RULES.md §5.1، SALSABIL_CONSTITUTION.md v1.3، BATCH1-GUARDIAN-REMEDIATION-001،
          BATCH1-SECOND-PASS-GUARDIAN-001
```

---

### DD-008
```
Decision: هل تُضبَط hookTimeout/testTimeout في vitest.config.ts (أو يُعاد تصميم تنظيف
          beforeAll/afterAll في اختبارات التكامل ضد Supabase الحقيقي) لتحمّل بطء شبكة حقيقي، بدل
          الاعتماد على إعادة المحاولة اليدوية أو --no-verify عند الحاجة؟
Reason: أثناء SEED-REAL-DEMO-CONTENT (2026-09-07)، فشل `git push` (pre-push → npm test الكامل) خمس
          مرات متتالية بأخطاء "Test/Hook timed out" حقيقية على استدعاءات Supabase فعلية داخل
          orders/cart/merchant/admin.integration.test.ts — ملفات لم يمسّها هذا العمل إطلاقاً (السكربت
          الجديد يزرع منتجات/منشورات بيان فقط). جُرِّب تبريد 90 ثانية ثم 5 دقائق كاملتين بلا أي نشاط
          آخر — استمر النمط نفسه، ما يستبعد أن يكون السبب حصراً حِمل هذه الجلسة، ويشير لهشاشة قائمة
          أصلاً (معلَّقة سلفاً في تعليق vitest.config.ts: "المهلة الافتراضية ضيقة جداً تحت تزامن ملفات
          اختبار متعددة"). بإذن صريح من المؤسس في نفس المحادثة (راجع AGENTS.md §9)، استُخدِم
          `git push --no-verify` مرة واحدة فقط لهذا الدفع تحديداً بعد تشخيص كامل، لا كإجراء افتراضي.
Risk: أي مهمة مستقبلية — بصرف النظر عن نطاقها — قد تصطدم بنفس الحاجز عند `git push`، ما يفتح الباب
          لاستخدام --no-verify كعادة متكررة بدل استثناء موثَّق، وهو تحديداً ما يمنعه AGENTS.md §9. لا
          يوجد اليوم دليل قاطع هل السبب حِمل الشبكة العابر أو حد فعلي على مشروع Supabase (dev) نفسه.
Owner: Founder
Created: 2026-09-07
Review by: قبل أي دفعة مستقبلية تُظهر نفس نمط timeout المتكرر — أو عند بناء أول CI حقيقي (لا وجود له
          اليوم) يشغّل نفس الاختبارات خارج جهاز المؤسس
Blocking: NO — لم يمنع إتمام SEED-REAL-DEMO-CONTENT (تم الدفع بإذن صريح)، لكنه يمنع الاعتماد الآمن على
          pre-push كبوابة موثوقة 100% للمهام القادمة حتى يُحسَم
Status: OPEN
Related: AGENTS.md §9، vitest.config.ts (تعليق testTimeout الحالي)، ADR-022 (In-Flight/Rate-Limit
          Locks BLOCKER المشابه في طبيعته — هشاشة بنية تحتية معروفة سلفاً لا تُصلَح ضمن نطاق ميزة)
```

### DD-009
```
Decision: لا قرار معلَّق — توثيق واقعة تكليف مكتملة، نفس نمط DD-007 بالضبط (السجل المستقل المطلوب
          وفق docs/DOCUMENTATION_RULES.md §5.1 شرط 4). بتاريخ 2026-09-07، المؤسس كلَّف صراحة —
          برسالة منفصلة لاحقة لمهمة HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT (التي أُغلِقت
          دفعاتها الثلاث سابقاً) — بتعديل SALSABIL_CONSTITUTION.md مباشرة لإضافة §25.1 "بنية الشريط
          السفلي المعتمدة"، وإغلاق CONFLICT-008 كـRESOLVED بعدها.
Reason: CONFLICT-008 (أعلاه) وثَّق أن بنية الأزرار الخمسة المُنفَّذة فعلياً في دفعة 1 لم تكن موجودة
          حرفياً في نص الدستور وقت التنفيذ. هذا السجل هو الأثر المستقل الذي يثبت أن إضافة النص لاحقاً
          جاءت بتفويض حقيقي من المؤسس في محادثة موثَّقة، لا باجتهاد ذاتي من الوكيل — نفس المنطق
          المُطبَّق حرفياً في DD-007 لسابقة v1.3.
Risk: بلا هذا السجل، الإضافة لـSALSABIL_CONSTITUTION.md كانت ستعتمد فقط على الملاحظة التنفيذية داخل
          الملف نفسه كدليل — وهو تحديداً نوع الادعاء غير المستقل الذي يمنعه الشرط الرابع في
          DOCUMENTATION_RULES.md §5.1 (نفس السبب الذي أنشأ DD-007 أصلاً).
Owner: Founder
Created: 2026-09-07
Review by: N/A — سجل توثيقي مكتمل بذاته
Blocking: NO
Status: RESOLVED — بمجرد كتابة هذا السجل نفسه، مطابقاً للشرط الرابع في DOCUMENTATION_RULES.md §5.1.
Related: SALSABIL_CONSTITUTION.md §25.1 (v1.4)، CONFLICT-008، DD-007 (السابقة المطابقة)،
          docs/DOCUMENTATION_RULES.md §5.1
```

### DD-010
```
Decision: لا قرار معلَّق — كان OPEN بتشخيص أوّلي خاطئ، أُعيد تشخيصه حياً ضمن FIX-DD-010-CART-
          QUANTITY-UI-STALE (2026-09-07) وأُصلِح فعلياً. هذا السجل الآن توثيق للتصحيح لا مسألة
          تنتظر حسماً.
Reason (الأصلي، 2026-09-07، غير دقيق — يُبقى هنا للشفافية لا للحذف): اكتُشف حياً أثناء REBUILD-
          CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 1 أن النقر على "+"/"−" في /cart تحت `next
          start` ينفّذ التحديث فعلياً في قاعدة البيانات لكن الواجهة لا تتغيّر — افتُرض حينها أن
          السبب خلل Caching/revalidation خاص بوضع الإنتاج تحديداً (`next dev` بدا يعمل بشكل صحيح
          وقتها).
**⚠️ تصحيح التشخيص (FIX-DD-010-CART-QUANTITY-UI-STALE):** تحقُّق حي دقيق لاحق (قياس الزمن الفعلي
          للتحديث عبر استقصاء DOM كل 50-100ms بدل انتظار ثابت قصير) أثبت أن **لا فرق حقيقي بين
          `next dev` وَ`next start`** — كلاهما يُحدِّث الواجهة بنجاح، فقط بعد **~1000-1400ms**، لا
          فوراً. الفشل الظاهري الأصلي كان **نتيجة انتظار قصير جداً في اختبار التشخيص الأول (600ms)**
          لا خللاً حقيقياً في وضع الإنتاج تحديداً — تسرّع في الاستنتاج (بيئة الإنتاج) بُني على عيّنة
          واحدة غير كافية، صُحِّح بقياس مباشر أدق. السبب الفعلي للبطء المُدرَك: صفحة `/cart` أصبحت
          تجلب بيانات أكثر بعد REBUILD-CART-CHECKOUT (تجميع التاجر + رف "غالباً ما يُشترى معه") —
          عدة رحلات شبكة متتالية إلى Supabase الحقيقي (~85-150ms لكل منها) تتراكم إلى ~1 ثانية، بلا
          أي مؤشر Pending أثناء الانتظار، فتبدو الواجهة "متجمّدة" لمستخدم حقيقي رغم أنها تعمل.
Fix: (أ) `src/components/CartActionButton.tsx` (جديد) — غلاف عميل صغير حول أزرار +/-/حذف يستخدم
          `useFormStatus()` (نمط قياسي لـServer Actions) لعرض مؤشر Pending (أيقونة دوّارة +
          تعطيل الزر) فوراً عند النقر، بصرف النظر عن مدة الانتظار الفعلية. (ب)
          `src/app/(reef)/cart/page.tsx` — تجميع التاجر ورف "غالباً ما يُشترى معه" مستقلان تماماً
          عن بعضهما؛ كانا يُنتظَران بالتتابع رغم ذلك — `Promise.all` يدمجهما في رحلة واحدة، يقلّل
          الزمن الكلي فعلياً (لا مجرد تحسين إدراكي).
Risk (الآن، بعد الإصلاح): لا خطر متبقٍّ يمنع نشراً إنتاجياً بسبب هذه النقطة تحديداً — المستخدم يرى
          الآن مؤشراً فورياً أن نقرته سُجِّلت، حتى مع بقاء زمن استجابة الخادم قرابة ثانية واحدة (لا
          يزال أبطأ من المثالي، لكن لم يعد "يبدو معطوباً"). تحسين الزمن الفعلي (لا الإدراكي فقط)
          إلى ما دون ثانية واحدة يبقى تحسيناً مستقبلياً اختيارياً، لا BLOCKER.

⚠️ تحديث 2026-09-09 (ADR-027): "التحسين المستقبلي الاختياري" أعلاه أصبح IMPLEMENTED — useOptimistic
          حقيقي يُلغي الانتظار المُدرَك بالكامل (~6.5ms مقاسة حياً بدل ~1000-1400ms)، لا مجرد مؤشر
          Pending فوقه. CartActionButton/useFormStatus يبقى مستخدَماً فقط لزر حذف بند السلة (خارج
          نطاق ADR-027). راجع ADR-027 للتفصيل الكامل.
Owner: Founder
Created: 2026-09-07
Resolved: 2026-09-07 — FIX-DD-010-CART-QUANTITY-UI-STALE
Review by: N/A — مُصلَح ومُتحقَّق منه حياً تحت `next start` فعلياً (لا `next dev`، بطلب صريح)
Blocking: NO (كان YES قبل الإصلاح)
Status: RESOLVED
Related: INVARIANTS.md → GP-001، src/components/CartActionButton.tsx،
          src/components/CartLineItem.tsx، src/app/(reef)/cart/actions.ts، src/app/(reef)/cart/page.tsx
```

### DD-011
```
Decision: هل تُعاد هيكلة عزل بيانات اختبارات orders/inventory integration (fixtures فريدة/تنظيف
          أدق بين ملفات مختلفة)، أم يُكتفى بتشغيل orders.integration.test.ts معزولاً عند الحاجة؟
Reason: اكتُشف حياً أثناء FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 4، دفعة CartLineItem.tsx البصرية
          البحتة، 2026-09-07) — الاختبار "ترفض Checkout عند نفاد المخزون الحقيقي بين الإضافة للسلة
          والتنفيذ" (orders.integration.test.ts) يفشل **حتمياً** (3 محاولات متتالية، نفس الفشل
          الحرفي كل مرة — لا عشوائية) عند تشغيل `npm test` الكامل (husky pre-push)، بينما ينجح
          12/12 **دائماً** عند تشغيل الملف وحده (`vitest run orders.integration.test.ts`) بمعزل عن
          بقية ملفات integration. هذا يثبت تعارضاً بين ملفات integration مختلفة تتشارك قاعدة dev
          الحية نفسها (`.env.local`) — على الأرجح صف/مورد مشترك (منتج/تصنيف/تاجر) يُعدَّل من ملف آخر
          أثناء تنفيذ هذا الاختبار تحديداً، لا خللاً في منطق `OrdersService`/`InventoryService`
          نفسه (السلوك المُختبَر يعمل بشكل صحيح فعلياً عند العزل). لم يُحدَّد الملف/المورد المتعارض
          بالضبط — يحتاج تحقيقاً مخصَّصاً، خارج نطاق دفعة واجهة بصرية بحتة.
Risk: (أ) أي مساهم آخر يواجه نفس فشل pre-push غير المرتبط بتغييره فيُضطر لنفس قرار التجاوز
          (`--no-verify`) بلا وثيقة تشرح السبب — هذا السجل يسدّ تلك الفجوة. (ب) الأخطر: هذا الاختبار
          تحديداً يحمي **Inventory Concurrency** (Guardian Matrix: DEEP) — طالما تعارض العزل قائم،
          "الاختبار الكامل يفشل أحياناً" قد يُطبَّع (Normalize) فيُتجاهَل فشل حقيقي مستقبلي لنفس
          الاختبار (Alert Fatigue) — خطر أمان اختباري حقيقي لا نظري.
Owner: Founder
Created: 2026-09-07
Review by: قبل أي تعديل مستقبلي فعلي على orders.service.ts/inventory.service.ts أو ملفات
          integration الأخرى المشتبَه بتعارضها معه (يحتاج تحديد الملف بالضبط أولاً)
Blocking: NO لعمل الميزات العادي (كل ملف integration ينجح منفرداً، والمنطق الفعلي سليم) — YES لصحة
          husky pre-push كبوابة موثوقة (تجاوزها بـ`--no-verify` أصبح ضرورياً أحياناً بإذن صريح، لا
          استثناءً نادراً كما يُفترَض)
Status: OPEN

⚠️ تحديث 2026-09-10 (PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH، ترقية staging) — دليل إضافي يوسِّع
          نطاق هذا الـDD: نفس النمط (فشل ضمن `npm test` الكامل، نجاح فوري عند إعادة التشغيل، **أعراض
          مختلفة بين المحاولتين** — مرة نفاد مخزون "دجاجة كاملة طازجة" في `admin.integration.test.ts`،
          ومرة `Test timed out` في اختبار `audit_log` مختلف تماماً في نفس الملف) ظهر الآن في
          `admin.integration.test.ts` أيضاً، **لا `orders.integration.test.ts` فقط** كما افتُرض عند
          الإنشاء. تنوّع الأعراض (نفاد مخزون مرة، Timeout مرة أخرى) بين التشغيلات يرجّح تزاحم موارد/
          شبكة عاماً تحت حمل التشغيل المتوازي لملفات integration الكثيرة، لا تعارضاً محدَّداً بين ملفَين
          بعينهما فقط. لم يُمَسّ أي كود في `orders.service.ts`/`inventory.service.ts`/
          `admin.service.ts` في هذه الدفعة (كتالوج/بيانات بحتة) — **مؤكَّد أنه ليس تراجعاً ناتجاً عن
          هذه المهمة**: التحقق (لا افتراض) تم بإعادة تشغيل `admin.integration.test.ts` معزولاً مرتين
          — فشل مختلف مرة، نجاح 11/11 كامل في المرة التالية مباشرة. `git push` نجح عند إعادة المحاولة
          الثانية بلا أي `--no-verify` (لم يُطلَب إذن التجاوز، ولم يُستخدَم).
Related: src/core/modules/orders/orders.integration.test.ts،
          src/core/modules/admin/admin.integration.test.ts، .husky/pre-push، AGENTS.md §9 (حظر
          تجاوز الخطافات إلا بطلب صريح — طُبِّق هنا فعلياً مرة واحدة بإذن المؤسس المباشر في محادثة
          FULL-VISUAL-PARITY-AUDIT-AND-FIX)
```

⚠️ تحديث 2026-09-10 (بند 6 مصادقة عميل تمهيدي — تجاوز `--no-verify` ثانٍ، بإذن مؤسس مباشر) — نفس
          النمط بالضبط تكرَّر بشدة أعلى: **6 محاولات `git push` متتالية فشلت**، كل مرة باختبار
          integration مختلف (`orders.integration.test.ts` دورة الحياة الكاملة → مرة، اختبار توقيت
          `khalil/service.test.ts` (Timing Attack RTT ratio، حدّي 2.07-2.26 مقابل عتبة 2.0) → 3
          مرات، `admin.integration.test.ts` نفاد مخزون → مرة) — **كل اختبار فاشل نجح 100% عند إعادة
          تشغيله معزولاً فوراً بعدها** (`orders.integration.test.ts` 12/12، `khalil/service.test.ts`
          23/23، لم يُعزَل `admin.integration.test.ts` وحده هذه المرة لكن نفس نمط التحديث السابق
          أعلاه). **الدفعتان المدفوعتان لا تمسّان orders/inventory/cart/auth إطلاقاً** — بند 1
          (`refactor(catalog): rename ProductOptionType to SelectableOptionType`: catalog/types.ts
          [rename فقط، جزئي عبر `git apply --cached` لعزل تغيير مستقل غير ذي صلة كان موجوداً مسبقاً
          بلا تدخل]، product-page-blocks-registry.ts، ProductOptions.tsx، DECISIONS.md) وبند 6
          (`fix(product-sheet): ...`: ProductSheetContent.tsx، CategoryProductGrid.tsx،
          PostCard.tsx) — كتالوج/واجهة بحتة. **إذن مؤسس مباشر صريح في نفس المحادثة** (لا سياسة
          دائمة، لهذه الدفعة فقط) لاستخدام `git push --no-verify` بعد التوثيق هنا أولاً — طُبِّق
          بعد كتابة هذا التحديث مباشرة. **قرار مؤسس تابع مباشر:** هذا التكرار (مرتان الآن، بشدة
          متصاعدة) يجعل حسم `DD-011` من جذوره **شرطاً مسبقاً صريحاً** قبل بدء أي عمل على مهمة هوية
          العميل (auth/عناوين/سلة) — تلك المهمة تمسّ orders/cart/auth بعمق وتتطلب Guardian Review
          DEEP مزدوجة (نفس نمط DD-001)، لا يمكن الوثوق بنتائجها إن كانت بوابة الاختبار نفسها غير
          مستقرة. **الحالة تبقى `OPEN`** — لن تُغلَق `RESOLVED` إلا بعد حل معماري فعلي (لا تجاوز آخر)
          يُعرَض على المؤسس أولاً إن احتاج تغييراً بنيوياً (مثال: عزل قاعدة بيانات اختبار منفصلة، أو
          تسلسل تنفيذ للملفات المتعارضة بدل توازٍ كامل)، ثم يُتحقَّق منه حياً (تشغيلات `npm test`
          متكررة ناجحة، لا مرة واحدة).

⚠️ تحديث 2026-09-10 (إصلاح جذري، بطلب مؤسس مباشر قبل بدء مهمة هوية العميل) — **السبب الجذري مؤكَّد
          بدقة (لا افتراض):** كل ملفات integration الخمسة (`orders`، `cart`، `admin`،
          `merchant`.integration.test.ts + `reef-city-journey`) تشترك في قراءة/كتابة **نفس الصف
          الحقيقي الواحد** — منتج "دجاجة كاملة طازجة" (`d2d296a8-...`، من `seed-daily-food-demo-
          content.ts` الأصلي) — عبر `catalogRepository.findProductByName('دجاجة كاملة طازجة')`. أربعة
          من الملفات (`orders`×2 وصف، `cart`×2 وصف، `admin`×1 وصف) تكتب مباشرة على
          `inventory.quantity_available` لهذا الصف (بعضها يُنزِله عمداً إلى 0 أو 1 لاختبار سباق
          المخزون/نفاد المخزون). لمّا يشغّل Vitest ملفات الاختبار بالتوازي افتراضياً (لا إعداد
          `fileParallelism` مضبوط في `vitest.config.ts` قبل هذا الإصلاح)، تتسابق هذه الملفات على نفس
          الصف — هذا يفسّر كل الأعراض المُلاحَظة سابقاً حرفياً (نفاد مخزون زائف، Timeout، حتى انزياح
          اختبار التوقيت الأمني بسبب تزاحم I/O العام). `reef-city-journey.integration.test.ts` كان قد
          حلّ هذه المشكلة لنفسه فعلياً من قبل (تعليقه الخاص يوثّق هذا الاكتشاف سابقاً) بإنشاء
          تاجر/منتج مخصَّصين حياً بدل الاعتماد على الصف المشترك — نفس النمط طُبِّق الآن على الأربعة
          الباقية.

          **الحل المطبَّق (بندان معاً، بقرار مؤسس صريح — الخيار الأوسع، لا التسلسل وحده):**
          (1) **تسلسل تنفيذ ملفات integration فقط** — `package.json`: `"test"` أصبح
          `"npm run test:unit && npm run test:integration"`، و`"test:integration"` جديد:
          `"vitest run --no-file-parallelism integration"` (علم Vitest v4 مثبَّت فعلياً، لا تبعية
          جديدة). اختبارات الوحدة تبقى متوازية وسريعة كما كانت (`test:unit` بلا تغيير).
          (2) **عزل البيانات المشتركة فعلياً** — كل وصف (`describe`) من الأربعة المتأثرة
          (`admin.integration.test.ts` وصف "Admin orders"، `cart.integration.test.ts` وصفا "Cart
          integration"/"Cart IDOR"، `orders.integration.test.ts` وصفا "Orders/Checkout"/"Orders
          lifecycle") ينشئ الآن **منتج اختبار خاصاً به** في `beforeAll` (نفس `category_id`/
          `tenant_id`/`base_price`/`unit`/`options` من المنتج المرجعي المشترك — القيم المتوقَّعة في
          الاختبارات، مثل "المجموع = 100"، لا تتغيَّر) بدل قراءة/تعديل الصف الحقيقي المشترك مباشرة،
          ويحذفه (المنتج + صف `inventory` الخاص به) في `afterAll`. يبقى `findProductByName` نفسه
          مُستخدَماً — لكن **للقراءة فقط** (استخراج `category_id`/`tenant_id`/`options` كمرجع)، لا
          لاستهلاك `id` المنتج المشترك في أي عملية سلة/مخزون بعد الآن.

          **لماذا كلا البندين معاً لا التسلسل وحده (قرار مؤسس صريح):** التسلسل وحده يزيل التعارض
          *اليوم* لكنه يعتمد بالكامل على بقاء إعداد `fileParallelism: false` قائماً إلى الأبد — أي
          تعديل مستقبلي (غير مقصود أو لتحسين سرعة CI) يعيد التوازي يعيد نفس الفئة من الأعطال صامتة
          دون أي تحذير. عزل البيانات نفسها يمنع فئة العطل بالكامل من جذرها، بصرف النظر عن إعداد
          التوازي مستقبلاً — دفاع مزدوج (Defense-in-depth) لا تكراراً زائداً.

          **خطر إضافي مكتشَف أثناء هذا الإصلاح (غير مطلوب إصلاحه منفصلاً الآن، مُسجَّل لا مدفون —
          AGENTS.md §12):** `admin.integration.test.ts` (وصف "Admin login") يُبدِّل `is_active` على
          التاجر التجريبي المشترك (`01000000000`) مرتين مؤقتاً (يُعيده فوراً)، بينما
          `merchant.integration.test.ts` يعتمد على بقاء نفس التاجر نشطاً طوال تشغيله
          (`loginOwnerByPhone` يفشل لو صادف `is_active=false` مؤقتاً). **هذا التعارض لم يظهر بعد
          كفشل حي مسجَّل في هذا الـDD** (على عكس تعارض المنتج المُوثَّق أعلاه) — اكتُشف بالفحص لا
          بالفشل الفعلي. الإصلاح (1) أعلاه (تسلسل ملفات integration) **يُحيّده تماماً بالفعل** (لا
          ملفان integration يعملان في آنٍ واحد بعد الآن)، لكن الإصلاح (2) (عزل بيانات) **لم يُطبَّق
          عليه** — لو أُعيد تفعيل التوازي مستقبلاً بلا مراجعة هذه الملاحظة، يعود هذا الخطر تحديداً
          (خلافاً لتعارض المنتج، المُغلَق بمعزل عن إعداد التوازي). يحتاج نفس علاج
          `reef-city-journey.integration.test.ts` (تاجر مخصَّص حي بدل التاجر التجريبي المشترك) إن
          احتاج الأمر لاحقاً — خارج نطاق هذا الإصلاح لأنه لم يُثبِت فشلاً فعلياً بعد، لا إهمالاً.

          **التحقُّق الحي (لا مرة واحدة، كما طلب المؤسس صراحة):** `npm test` الكامل (بعد كلا
          الإصلاحين) شُغِّل **5 مرات متتالية** — **203/203 نجاح في كل مرة بلا استثناء** (162 وحدة +
          41 تكامل). صفر فشل غير حتمي عبر الخمس مرات. زمن `npm test` الكامل ارتفع من التوازي الأصلي
          إلى ~75-85 ثانية (تسلسل الاختبارات الخمسة بدل توازيها) — كلفة مقبولة صراحة مقابل موثوقية
          بوابة الدفع (`pre-push`)، بقرار مؤسس.
Status: RESOLVED — 2026-09-10، بكلا الإصلاحين معاً (تسلسل + عزل بيانات)، مُتحقَّق حياً 5/5
Related (إضافية لهذا التحديث): package.json (`test`/`test:integration`)،
          src/core/modules/{admin,cart,orders}/*.integration.test.ts،
          src/core/e2e/reef-city-journey.integration.test.ts (النمط الأصلي المُعاد استخدامه)،
          scripts/seed-daily-food-demo-content.ts (مصدر المنتج المشترك الأصلي)

---

### DD-012
```
Decision: هل يُثبَّت صراحة Region لدوال Vercel Serverless (`preferredRegion`/`vercel.json` →
          regions) بحيث يطابق Region الفعلي لمشروع Supabase، لتقليل زمن الرحلة ذهاباً-وعودة بين
          الدالة وقاعدة البيانات على كل طلب SSR؟
Reason: قِياس حي على staging.reefam.com (COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS، بند 1،
          2026-09-09): TTFB لصفحات SSR الرئيسية (/`, `/[category]`) ~1.0-1.1 ثانية بثبات عبر عدة
          قياسات متتالية (بعد استقرار Cold Start)، رغم أن استعلامات Supabase نفسها مُجمَّعة بالفعل
          (`Promise.all`) — لا Waterfall متتالٍ متبقٍّ فعلياً في الكود (تحقَّق منه بقراءة
          `bayan.service.ts`/`[category]/page.tsx`/`cart/page.tsx`، كلها موازية بالفعل من دفعات
          سابقة: FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS، FIX-DD-010-CART-QUANTITY-
          UI-STALE). ترويسة `X-Vercel-Id` على طلب فعلي أظهرت `fra1::iad1` — الدالة نفّذت فعلياً في
          `iad1` (فرجينيا، الساحل الشرقي الأمريكي) رغم أن أقرب Edge للطلب كان `fra1` (فرانكفورت) —
          إن كان مشروع Supabase (`liolnkdmjfkvawnkwhje.supabase.co`) في منطقة أخرى (أوروبا/آسيا/إلخ)،
          فكل استعلام SSR يدفع كمون شبكي عابر للقارات مرتين (Vercel↔Supabase) فوق أي كمون طلب
          المستخدم نفسه. **لم يُحسَم لأنه يحتاج تأكيداً من لوحة تحكم Supabase (Settings → General →
          Region) لا يملكه الوكيل هنا** — تخمين قيمة `region` خطأ قد لا يُغيّر شيئاً أو يُسوّئ الوضع
          صامتاً (AGENTS.md §5: Never Infer Missing Architecture).
Risk: TTFB بطيء (~1s+) يبقى قائماً على كل صفحة SSR تلمس Supabase — أهم أثر ملموس فعلي على "سرعة
          البرق" المطلوبة صراحة في هذه الدفعة، ولا يُحلّ بأي تحسين على مستوى الكود (الاستعلامات نفسها
          موازية ومُفهرسة أصلاً حسب docs/DATABASE.md §10) بل ببنية تحتية/إعداد نشر فقط.

⚠️ تحديث 2026-09-10 (FIX-VERCEL-REGION-MISMATCH-DD-012) — **مُحسَم، تأكَّد حياً:** المؤسس أكَّد صراحة
          أن مشروع Supabase (dev وstaging) في `eu-central-1` (فرانكفورت). `vercel.json` جديد
          (`{"regions": ["fra1"]}`، Hobby يسمح بمنطقة واحدة مخصَّصة — تحقَّقتُ من توثيق Vercel الرسمي
          الحي قبل التنفيذ، لا افتراضاً) — لا تعديل كود، بنية تحتية فقط كما توقَّعت "Risk" أعلاه
          بالضبط. **قِياس حي كامل على `staging.reefam.com` قبل/بعد النشر:**
          - `X-Vercel-Id`: `fra1::iad1` → `fra1::fra1` (الدالة تنفّذ الآن في نفس منطقة Supabase).
          - TTFB `/` (8 عيّنات): avg **1160ms → 450ms** (تحسّن 61%).
          - TTFB `/cart` (8 عيّنات): avg **1413ms → 511ms** (تحسّن 64%).
          - أثر مُركَّب مع `FIX-SEQUENTIAL-CART-QUERIES-PARALLEL` (البند الآخر لنفس DD-014):
            `addToCartAction` avg **1435-1555ms → 526ms** (إجمالي من الخط الأصلي 2094ms: تحسّن ~75%).
          - سيناريو DD-014 (تنقّل فور فعل سلة): avg **1906ms → 196ms** (تحسّن ~90%، max حتى 356ms
            فقط) — التجمّد المُدرَك عملياً **اختفى**، راجع تحديث DD-014 المصاحب.
          هذا كان فعلياً السبب الجذري الأعمق المشترك خلف DD-010/DD-014 معاً، كما تنبَّأت DD-014 بدقة.
Owner: Founder
Created: 2026-09-09
Resolved: 2026-09-10 — FIX-VERCEL-REGION-MISMATCH-DD-012
Review by: N/A — مُحسَم ومُتحقَّق منه حياً بأرقام دقيقة قبل/بعد
Blocking: NO (كانت NO قبل الحسم أيضاً — لكنه كان أكبر مكسب أداء متبقٍّ غير مُنفَّذ، أصبح الآن مُنفَّذاً)
Status: RESOLVED
Related: vercel.json (جديد)، docs/DATABASE.md §10 (Known Indexing Gaps)، DD-010، DD-014، هذا الملف
          §COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (تقرير المهمة الكامل، بند 1)
```

---

### DD-013
```
Decision: هل تُنشَأ فعلياً الأحياء الحقيقية الإضافية (سوبرماركت/مطبخ ريف/خضار وفواكه/ألبان/حلويات
          اليوم...) كصفوف categories منفصلة في قاعدة البيانات، بدل بقائها مجمَّعة كلها تحت "حي
          الطعام اليومي" (daily-food) الوحيد الموجود فعلياً اليوم؟
Reason: COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 5) طلب "استيراد كل الأحياء
          المتبقية بتصاميم صفحات منتج مطابقة للمرجع" لكل حي "له ما يقابله فعلياً أو جزئياً عندنا".
          تحقُّق حي (staging.reefam.com/categories، 2026-09-09): **حي واحد فقط حقيقي** في القاعدة
          (`daily-food`) — لا سوبرماركت/مطبخ/خضار/ألبان/حلويات كصفوف مستقلة. هذا يطابق تماماً ما
          وثَّقه neighborhood-identity-registry.ts نفسه مسبقاً (تعليق أعلى الملف + ADR-024 +
          CONFLICT-009 + ideas/IDEAS.md → IDEA-002): الأحياء الأربعة عشر الأخرى "ألوان جاهزة فقط،
          لا تُدخَل في السجل الحي إلا عند إنشاء حي حقيقي" — قرار مؤسس سابق صريح يمنع تحديداً إنشاء
          حي بمفتاح تخميني قبل وجوده الحقيقي. تنفيذ بند 5 حرفياً كان يعني إما (أ) اختراع 13 صفاً
          جديداً في categories بلا طلب تاجر/كتالوج حقيقي وراءها — يخالف ADR-024/IDEA-002 مباشرة
          وهو **تغيير بيانات حقيقي على القاعدة الحية** (AGENTS.md §13 No Silent State Change)، أو
          (ب) بناء واجهات/كود لأحياء لا تُستهلَك أبداً (dead code) — يخالف "لا تُنشئ ملفاً لا يخدم
          مسؤولية غير مغطاة فعلاً" (AGENTS.md §2). كلاهما مرفوض ضمن هذه الدفعة تحديداً.
          **ما تم تنفيذه بدلاً من ذلك (بندا 3+4 من هذه الدفعة):** صفحة/شيت المنتج الآن يستهلكان
          identity/blocks عبر السجلَّين المركزيَّين تلقائياً بحسب `category.slug` لأي منتج — بلا أي
          if/else مكتوب لكل حي بعينه. اليوم هذا يُطبَّق فعلياً فقط على daily-food (الحي الحقيقي
          الوحيد)، **لكن البنية جاهزة بالكامل**: أول صف جديد يُضاف لـcategories (سوبرماركت/مطبخ/
          خضار/ألبان/حلويات...) بمفتاح slug مطابق لأحد المفاتيح الأربعة عشر الجاهزة فعلاً في
          neighborhood-identity-registry.ts يُطبَّق تلقائياً — بطاقة الخلاصة، صفحة الحي، صفحة
          المنتج، وProduct Bottom Sheet معاً — بصفر سطر كود إضافي.
Risk: إن قرأ أي طرف بند 5 كـ"لم يُنفَّذ" بلا هذا السياق — الحقيقة الدقيقة: البنية 100% جاهزة،
          التنفيذ البصري الفعلي معلَّق حصراً على قرار بيانات (إنشاء أحياء حقيقية) هو قرار المؤسس
          وحده (تاجر/كتالوج جديد لكل حي)، لا نطاقاً تقنياً ناقصاً.

⚠️ تحديث 2026-09-10 (PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH، بند 2) — **مُحسَم، تأكيد مؤسس
          مباشر بإنشاء الأحياء الحقيقية الآن** (نفس نمط "تكليف مؤسس مباشر يُسقِط قيد سابق"،
          CONFLICT-008/009). `scripts/seed-real-neighborhoods-demo-content.ts` (جديد، دائم، Idempotent
          — نفس نمط `seed-daily-food-demo-content.ts`) زرع **5 أحياء حقيقية جديدة** على قاعدة `dev`:
          `produce` (الخضار والفواكه)، `dairy` (الألبان)، `kitchen` (مطبخ ريف)، `meat` (اللحوم
          والدواجن)، `sweets` (حلويات اليوم) — 21 منتجاً تجريبياً دائماً موزَّعة عليها. **قرار تسمية
          صريح:** "السوبرماركت" **لم يُنشَأ كحي سادس منفصل** — يطابق بالفعل `daily-food` الموجود
          أصلاً (`sourceNote` الخاص بـ`'reef:daily-food'` في السجل نفسه ينص صراحة: "لا حي سوبرماركت
          منفصل عندنا")؛ صف مكرِّر بنفس اللون كان سيخالف `ADR-024` بلا داعٍ فعلي — إن كان المقصود
          تحديداً حياً سادساً منفصلاً باسم "سوبرماركت" بلون مختلف عن `daily-food`، هذا قرار تسمية
          إضافي منفصل يحتاج تأكيداً صريحاً، لم يُفترَض هنا.

          ⚠️ تحديث 2026-09-10 — **مُحسَم نهائياً بقرار مؤسس مباشر:** لا حي سادس. `daily-food` يبقى
          هو نفسه (نفس الصف، نفس `slug`، نفس المنتجات) — تغيير اسم العرض في الواجهة إلى "السوبرماركت"
          يبقى خياراً مستقبلياً اختيارياً بحتاً (تعديل نص `category.name` وحده عند الحاجة الفعلية، لا
          `slug`/صف جديد) — لم يُطلَب تنفيذه الآن، لا حاجة تقنية له لإغلاق هذا القرار.
          **التحقُّق الحي (بند 3 من نفس المهمة) أثبت الهدف الأصلي لهذا الـDD بدقة:** الهوية (لون
          البانر) تُطبَّق تلقائياً وصحيحة على الخمسة كلها بلا أي كود إضافي (مطابقة حرفية لقيم
          `neighborhood-identity-registry.ts`). **بلوك الوزن** يعمل بشكل متطابق في حيَّين مختلفين
          تماماً (`kitchen`/`meat`) — ليس خاصاً بـ"دجاجة كاملة طازجة" (`daily-food`) كما كان الحال
          الوحيد سابقاً. **بلوك الإضافات — أول اختبار بيانات حقيقي على الإطلاق** (لم يوجد أي منتج
          بخيارات `addon` في القاعدة قبل هذا السكربت، تحقَّقتُ منه حياً): يظهر بشكل صحيح، والتفاعل
          (تفعيل إضافة) يعيد حساب السعر فعلياً عبر `calculatePriceAction` بلا أي تعديل على
          `CatalogService`. منتج عادي بلا خيارات لا يظهر له أي من البلوكين — صحيح كما هو مصمَّم.
          **خطر جانبي اكتُشف حياً أثناء التحقُّق (AGENTS.md §12):** صور `placehold.co` بلا لاحقة صيغة
          صريحة تُخدَّم كـ`image/svg+xml` افتراضياً — Next.js Image Optimizer يرفضها `400` افتراضياً
          (`dangerouslyAllowSVG` غير مفعَّل، إعداد أمان قياسي). **هذا خلل موجود مسبقاً يمسّ صور
          `daily-food` المزروعة سابقاً أيضاً** (تحقَّقتُ منه حياً — نفس الخطأ 400 على صورة الأرز
          الأصلية) — لم يُصلَح هنا (خارج نطاق هذه المهمة، يمسّ محتوى دفعة سابقة)، فقط صُحِّح داخل
          السكربت الجديد نفسه (`.png` صريحة في كل رابط) لتفادي تكراره في المحتوى الجديد. **الإصلاح
          الشامل (تعديل next.config.ts لجميع الصور القديمة) يحتاج قراراً مؤسس منفصلاً** — سُجِّل
          كـDD-015، ثم حُسِم صراحة (راجع تحديث DD-015 نفسه: قرار مؤسس بتعديل الروابط، لا
          `dangerouslyAllowSVG`).

⚠️ تحديث 2026-09-10 (ترقية staging) — **الأحياء الخمسة نُقلت فعلياً لـstaging** بطلب مؤسس مباشر، عبر
          نفس السكربت بالضبط (`--staging` جديد يختار `.env.staging.local` بدل `.env.local` — لا نسخ
          يدوي، لا سكربت SQL منفصل). **تصحيح مرجعي:** طلب الترقية أشار إلى "مسار DD-011 الرسمي"،
          لكن DD-011 الفعلي (راجعه أعلاه) موضوعه تعارض عزل بيانات اختبارات orders/inventory —
          لا علاقة له بفصل dev/staging. الآلية الفعلية الموثَّقة لهذا الفصل هي **`ADR-017`**
          (`scripts/schema-setup.sql` + `scripts/seed-test-accounts.sql`، مفاتيح طبيعية Idempotent) —
          هذا ما اتُّبِع فعلياً هنا، بنفس الروح تماماً (نفس السكربت الآمن القابل لإعادة التشغيل، لا
          كتابة يدوية عبر SQL Editor). تحقَّقتُ حياً أن `merchants.slug='poultry-test'` و
          `categories.slug='daily-food'` (اللذان يعتمد عليهما السكربت) موجودان مسبقاً على staging
          (`seed-test-accounts.sql`، ADR-017) قبل التشغيل — لا فشل متوقَّع.
          **تحقُّق حي كامل على `staging.reefam.com` نفسها (لا dev فقط) بعد الترقية:** `/categories`
          يعرض الأحياء الستة كلها (daily-food + الخمسة الجديدة)؛ لون كل حي صحيح ومطابق تلقائياً على
          الخمسة؛ بلوك الإضافات وبلوك الوزن يعملان هناك أيضاً (نفس الاختبارين المُطبَّقين على dev)؛
          صفر أخطاء 400 على الصور (إصلاح DD-015 انتقل مع البيانات)؛ صفر أخطاء console/pageerror. TTFB
          الأحياء الخمسة على staging: 343-450ms — لا تراجع عن مستوى ما بعد DD-012 (`/daily-food`
          562ms، `/categories` 290ms، كلاهما ضمن النطاق الطبيعي).
Owner: Founder
Created: 2026-09-09
Resolved: 2026-09-10 — PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 2) + ترقية staging
Review by: N/A — مُحسَم ومُتحقَّق منه حياً على dev وstaging معاً (5 أحياء، 21 منتجاً، هوية+بلوكات صحيحة)
Blocking: NO
Status: RESOLVED
Related: src/config/neighborhood-identity-registry.ts (ADR-024، CONFLICT-009)،
          src/config/product-page-blocks-registry.ts، src/components/ProductSheetContent.tsx،
          src/app/(reef)/product/[id]/page.tsx، ideas/IDEAS.md → IDEA-002،
          scripts/seed-real-neighborhoods-demo-content.ts، DD-015 (خلل صور SVG، أدناه)، ADR-017
          (آلية فصل dev/staging الفعلية)، DD-011 (موضوع مختلف تماماً، لا علاقة له بهذه الترقية)
```

---

### DD-015
```
Decision: هل تُضاف `images.dangerouslyAllowSVG: true` (+`contentDispositionType: 'attachment'`
          كإجراء أمان مصاحب موصى به من توثيق Next.js) إلى `next.config.ts` لإصلاح صور
          `daily-food` القديمة (`seed-daily-food-demo-content.ts`) التي تفشل بـ400 اليوم، أم
          تُستبدَل روابطها بصيغة `.png` صريحة (نفس حل هذه الدفعة، بلا أي تغيير أمني)؟
Reason: اكتُشف حياً أثناء PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 3، 2026-09-10): كل صور
          `placehold.co` المزروعة بلا لاحقة صيغة صريحة (`?text=...` بلا `.png`/`.jpg` قبلها) تُخدَّم
          `image/svg+xml` من المصدر — Next.js Image Optimizer يرفض SVG افتراضياً (`400`). تحقَّقتُ
          حياً: صورة "أرز مصري أبيض" (أول منتج في `daily-food`، `seed-daily-food-demo-content.ts`)
          تفشل بنفس الخطأ بالضبط. هذا خلل **موجود منذ زرع daily-food الأصلي**، لم يُكتشَف من قبل —
          لا أحد اختبر تحميل الصور الفعلي عبر `next/image` حياً حتى الآن على ما يبدو.
Risk: كل صور منتجات `daily-food` (8 منتجات على الأقل من السكربت الأصلي) تظهر كصورة معطوبة (Broken
          Image) بدل placeholder ملوّن — أثر بصري حقيقي على أقدم/أكبر حي في المنصة، لا تافهاً.

⚠️ تحديث 2026-09-10 — **مُحسَم، قرار مؤسس صريح: الخيار (ب)** — تعديل الروابط لصيغة `.png` صريحة، **لا**
          `dangerouslyAllowSVG` (رُفض صراحة بسبب مخاطرة أمنية حقيقية: SVG قد يحمل سكربتاً/XSS، خصوصاً
          مع `remotePatterns` الحالي الواسع `hostname: '**'` — نفس التحليل المذكور في "Review by"
          أعلاه، اعتمده المؤسس دون تعديل). **تحقُّق حي لنطاق التأثير الفعلي قبل الإصلاح (لا افتراض):**
          استعلام مباشر على `products`/`post_media` الحيَّين أثبت **8 منتجات بالضبط** متأثرة (كل منتجات
          `seed-daily-food-demo-content.ts` الأصلية الثمانية)، **صفر** صفوف `post_media` متأثرة (منشور
          "رز باللبن" لا يحمل صف `post_media` فعلي رغم وجود الرابط القديم في نص السكربت — لم يُحقَّق
          سبب ذلك، خارج نطاق هذا الإصلاح). `scripts/seed-daily-food-demo-content.ts` عُدِّل (كل روابط
          `placehold.co` فيه، بما فيها رابط منشور "رز باللبن" غير الحيّ حالياً، وقائياً لأي تشغيل
          مستقبلي) وأُعيد تشغيله فعلياً ضد `dev` — التحقُّق الحي بعده أثبت أن كل الثمانية تُحمَّل الآن
          `200` عبر `next/image` نفسه (لا افتراضاً من رابط المصدر وحده).
Owner: Founder
Created: 2026-09-10
Resolved: 2026-09-10 — قرار مؤسس مباشر + تطبيق فعلي على dev
Status: RESOLVED
Related: next.config.ts (بلا تعديل — القرار الصريح تحديداً)، scripts/seed-daily-food-demo-content.ts،
          scripts/seed-real-neighborhoods-demo-content.ts، DD-013
```

---

### DD-014
```
Decision: تشخيص مؤكَّد حياً (لا افتراض) — بعد أي Server Action سلة (addToCartAction/
          updateCartItemAction)، أي تنقّل (نقر رابط BottomNav/CartCapsule) خلال نافذة ~1-3 ثوانٍ
          التالية يتجمّد فعلياً لثوانٍ إضافية — بصرف النظر عن الوجهة، حتى وجهات لا يمسّها
          `revalidatePath` إطلاقاً (مثال: `/categories`). لا قرار حسم بعد على أي إصلاح — يحتاج قراراً
          مؤسس (نطاق الحل: `docs/DATABASE.md`/بنية تحتية، أم تعديل `cart.service.ts` بحد ذاته، أم
          كلاهما).
Reason: طلب مؤسس مباشر (FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL، الجزء 2) — "تشخيص فوري:
          بطء متقطع في التنقل... قِس فعلياً على staging... اعرض تشخيصاً دقيقاً بالأرقام + السبب
          الجذري المؤكَّد قبل أي إصلاح". قياس حي كامل على `staging.reefam.com` (Playwright، 3 تجارب
          منفصلة، 2026-09-09):
          (1) **خط الأساس (بلا أي فعل سلة)، 10 عيّنات/رابط:** `/account` (بلا استعلام قاعدة بيانات
          إطلاقاً — `AccountPage` ليست حتى `async`) ثابتة تماماً (avg=298ms، تذبذب=144ms).
          `/categories` (استعلام واحد) avg=494ms، تذبذب=342ms. `/` و`/cart` (عدة استعلامات متتالية
          لكل منهما، DD-010) الأبطأ والأكثر تذبذباً: avg=765ms/994ms، تذبذب حتى 1904ms، قمة واحدة
          2511ms — يطابق تماماً كمّية استعلامات Supabase لكل مسار (لا شيء غامض).
          (2) **فور فعل سلة (نقر "أضف للسلة" ثم نقر تنقّل خلال <500ms)، 8 عيّنات/رابط:** `/`
          avg=2297ms (حتى 3770ms)، `/cart` avg=2646ms (حتى 3894ms)، **و`/categories` (مجموعة ضبط، لا
          تُمسّ بـrevalidatePath إطلاقاً من أي فعل سلة) avg=2731ms (حتى 5722ms)** — أبطأ من الجزء
          (1) بمقدار ~6× **لكل الروابط الثلاثة بلا استثناء**، بما فيها الرابط غير المتأثر. هذا يستبعد
          فرضية "الإبطاء بسبب `revalidatePath` تحديداً على `/` و`/cart`" — الأثر عام على أي تنقّل، لا
          خاص بالمسارات المُعاد التحقق منها.
          (3) **عزل السبب (بلا أي فعل سلة، تنقّل سريع متتالٍ فور تحميل صفحة ثقيلة)، 6 عيّنات:**
          `/daily-food`→`/categories` وَ`/account`→`/categories` وَ`/categories`→`/account` كلها ثابتة
          وسريعة (avg 278-466ms) — يستبعد فرضية "أي تنقّل سريع متتالٍ بطيء بطبيعته"، ويؤكد أن السبب
          مرتبط **تحديداً** بوجود Server Action سلة معلَّقة وقت النقر.
          (4) **الدليل الحاسم (تتبّع الشبكة الدقيق، حادثة واحدة كاملة):** طلب `POST /daily-food`
          (نداء `addToCartAction` نفسه) استغرق فعلياً **2405ms** (من الإرسال حتى الاستجابة). طلب
          `GET /categories?_rsc=...` (بيانات صفحة الوجهة) وصل ورَدَّ **خلال 167ms فقط** (عند 673ms من
          لحظة نقر "أضف للسلة"، أي مبكراً جداً) — **لكن التنقّل الفعلي (تغيّر `window.location.pathname`)
          لم يكتمل إلا عند 3589ms**، أي بعد اكتمال `POST /daily-food` (عند 2388ms) بفارق بسيط فقط، لا
          بعد وصول بيانات `/categories` نفسها (673ms). الفجوة (2916ms) بين "البيانات وصلت" و"التنقّل
          اكتمل فعلياً" مصدرها العميل (المتصفح/Next.js Router) لا الشبكة — البيانات كانت جاهزة، لكن
          Next.js App Router لم يُطبِّق (Commit) تنقّل Link الجديد قبل استقرار Server Action سلة سابقة
          معلَّقة، رغم أنهما غير مرتبطين منطقياً (وجهة مختلفة تماماً، لا تبعية بيانات بينهما).
Risk: **السبب الجذري ذو طبقتين مؤكَّدتين، لا طبقة واحدة:**
          (أ) **طبقة الشبكة (السبب الأعمق):** `addToCartAction`/`updateCartItemAction` يستغرقان
          ثانيتين+ فعلياً على `staging` لأن `cart.service.ts` (`addItem`/`updateItemQuantity`) ينفّذ
          عدة استعلامات Supabase **متتالية** (`getProductById`→`findItems`→`isAvailable`→
          `insert/updateItemQuantity`→`getSummary`→`findItemsWithProducts`)، لا موازية — كل استعلام
          يدفع كمون عابر للمناطق (Vercel `iad1`↔Supabase، **مطابق تماماً لـ`DD-012` الموجودة أصلاً
          وغير المحسومة بعد** — نفس السبب الجذري، مظهر مختلف). هذا موجود بصرف النظر عن `ADR-027`/
          `ADR-028` — كان قائماً قبلهما بالضبط بنفس الحدّة (السلوك نفسه، لم يُختبَر بهذا التحديد من
          قبل).
          (ب) **طبقة العميل (تضاعِف الأثر المُدرَك، لا تُنشئه):** Next.js App Router يُظهِر ميلاً
          حقيقياً (مؤكَّداً بالقياس أعلاه) لتأخير تطبيق تنقّل جديد حتى استقرار معاملة Server Action
          سلة معلَّقة سابقة، حتى لو بيانات الوجهة الجديدة جاهزة فعلياً قبل ذلك بكثير — سلوك منصة
          (React `startTransition`/Next.js Router queuing) لا كود خاص بهذا المستودع، وكان سيظهر بنفس
          الحدّة تقريباً مع النمط القديم (`<form action>` قبل `ADR-027`، الذي يُغلَّف بمعاملة مماثلة
          داخلياً أيضاً) — **لكن `ADR-027` رفع احتمالية أن يُلاحَظ فعلياً**: قبل التحديث التفاؤلي كانت
          الواجهة كلها تبدو بطيئة أثناء أي فعل سلة (`DD-010`)، فيميل المستخدم فطرياً للانتظار قبل
          التنقّل التالي؛ الآن يبدو التفاعل المحلي فورياً تماماً، فيتنقّل المستخدم أسرع وأثناء نافذة
          الخطر بالضبط — `ADR-027` غيَّر **سلوك المستخدم المتوقَّع**، لا آلية العطل نفسها.
          **الخطر المتبقي إن لم يُحسَم:** أي مستخدم حقيقي ينقر "أضف للسلة" ثم فوراً أيقونة تنقّل
          (نمط استخدام شائع جداً، لا نادر) يواجه تجمّداً 2-4 ثوانٍ متكرراً — أسوأ انطباع أداء ممكن
          مباشرة بعد إصلاح ADR-027/ADR-028 اللذين حسّنا نفس المسار.

⚠️ تحديث 2026-09-10 (FIX-SEQUENTIAL-CART-QUERIES-PARALLEL): خيار الحل (2) أعلاه نُفِّذ جزئياً —
          مراجعة كاملة لكل دالة في `cart.service.ts`/`cart.repository.ts` وجدت **فرصة واحدة آمنة
          فقط**: `catalogService.getProductById(productId)` و`cartRepository.findItems(cartId)` داخل
          `addItem()` مستقلان تماماً (مفتاحان مختلفان)، أصبحا `Promise.all`. كل تتابع آخر فُحص وتبيَّن
          أنه يعتمد فعلياً على نتيجة سابقة (`updateItemQuantity`/`removeItem`: فحص ملكية IDOR يحتاج
          `item.productId` قبل فحص المخزون؛ `getOrCreateCart`: تتابع مقصود صراحة لتفادي سباق قيد
          `UNIQUE` على `session_token`، موثَّق في تعليق الكود نفسه) — **لم تُمَسّ**. **تصنيف Guardian
          أدق مما افتُرض أعلاه:** الحل المُنفَّذ فعلياً لا يمسّ ترتيب "القراءة قبل قرار الكتابة" في
          مسار حماية المخزون إطلاقاً — فحص `isAvailable` يبقى بعد حساب `desiredQuantity` بالضبط كما
          كان (يعتمد على `existingItems` سواء جاءت من `Promise.all` أو تتابع منفصل، لا فرق في
          الترتيب المنطقي النهائي) — هذا التنفيذ تحديداً **LIGHT** لا **DEEP** (إعادة ترتيب تنفيذ
          بحت، صفر تغيير في تسلسل القرار). **قياس حي على `staging.reefam.com` قبل/بعد (نفس منهجية
          Playwright، 8 عيّنات لكل حالة):**
          - `addToCartAction` (POST): قبل avg=2094ms (min=1199 max=3139)؛ بعد avg=1435-1555ms عبر
            تشغيلين منفصلين (min=1050 max=2058) — تحسّن حقيقي ~26-31%، متسق عبر التشغيلين.
          - إعادة إنتاج سيناريو DD-014 بالضبط (تنقّل لـ`/categories` فوراً بعد "أضف للسلة"): قبل
            avg=2731.3ms (min=1456.8 max=5722.5)؛ بعد avg=1905.7ms (min=1556.6 max=2828.1) — تحسّن
            ~30% في المتوسط، **وتحسّن أكبر بكثير في أسوأ حالة (الذيل)**: 5722ms → 2828ms.
          **الخلاصة الصادقة:** تحسّن حقيقي ومقاس، لا وهمي — لكنه **جزئي كما توقَّعت** `DD-014` نفسها:
          التجمّد قلَّ ولم يختفِ (لا يزال 1.6-2.8 ثانية). السببان المتبقيان (طبقة (أ) البقية —
          استعلامات أخرى متتالية بحكم الضرورة الأمنية/المنطقية، وطبقة (ب) — قفل Next.js Router على
          تنقّل جديد خلف معاملة معلَّقة أياً كانت مدتها) **لا يزالان قائمين بلا حسم** — `DD-012` (Region
          Mismatch) يبقى أكبر مكسب متبقٍّ غير مُنفَّذ، وخيار (3) (فصل معماري للتنقّل عن الـtransition)
          لا يزال غير مبحوث. `DD-014` يبقى `OPEN` — هذا تحديث تقدّم لا إغلاق.
Owner: Founder
Created: 2026-09-09
Resolved: 2026-09-10 — FIX-VERCEL-REGION-MISMATCH-DD-012
Review by: قرار مؤسس على اتجاه الحل — مرشَّحان غير حصريَّين ولا متعارضين (كلاهما يعالج طبقة مختلفة):
          (1) حسم `DD-012` (تأكيد/مطابقة Region حقيقي بين Vercel وSupabase) يقلّص نافذة الخطر من
          ~1-2+ ثانية إلى مئات المللي ثانية على الأرجح — يُخفِّف الأثر الملحوظ بشدة حتى بلا لمس طبقة
          (ب). (2) موازاة استعلامات `cart.service.ts` المتتالية غير المترابطة منطقياً (مثال:
          `getProductById`/`findItems` عبر `Promise.all` بدل تتابع) — يقلّص زمن الفعل نفسه، لكنه
          Guardian Matrix `Inventory Concurrency = DEEP` (`AGENTS.md §17`) لأنه يمسّ ترتيب القراءة
          قبل قرار الكتابة في مسار حماية المخزون — يحتاج تصميماً ومراجعة منفصلين، لا تعديلاً عرضياً.
          (3) خيار معماري أعمق (خارج نطاق هذا التشخيص): فحص إن كان بالإمكان فصل تنقّل الرابط عن معاملة
          Server Action المعلَّقة صراحة (خارج `startTransition` المشترك) — يحتاج بحثاً في نمط Next.js
          الموصى به لهذه الحالة تحديداً، لم يُبحَث بعد.
Blocking: NO — لا يمنع أي عمل حالي، لكنه خطر تجربة مستخدم حقيقي ومقاس بأرقام دقيقة، لا نظري

⚠️ تحديث 2026-09-10 (FIX-VERCEL-REGION-MISMATCH-DD-012) — **مُحسَم عملياً.** خيار الحل (1) من
          "Review by" أعلاه نُفِّذ (`DD-012` الآن `RESOLVED`). قِياس حي لنفس سيناريو DD-014 بالضبط
          (تنقّل لـ`/categories` فوراً بعد "أضف للسلة"، 6 عيّنات) بعد نشر `vercel.json`:
          **avg=196ms (min=151ms، max=356ms)** — مقابل avg=2731ms الأصلي (قبل أي إصلاح) وavg=1906ms
          (بعد موازاة الاستعلامات وحدها). **تحسّن ~90% من الخط الأصلي، ~90% أيضاً من التحسّن الجزئي
          السابق** — التجمّد المُدرَك عملياً اختفى (356ms أقصى حالة أسوأ حالة، ليس "تجمّداً" بأي معيار
          واقعي). السبب: طبقة (أ) (كمون Region) كانت فعلياً الحصة الأكبر بفارق كبير من زمن معاملة
          السلة المعلَّقة — بمجرد تقليصها لمئات المللي ثانية، أصبحت نافذة "طبقة (ب)" (قفل Router خلف
          transition معلَّق) قصيرة جداً لتُلاحَظ عملياً، حتى لو الآلية نفسها (خيار 3 أعلاه) لم
          تُفصَل معمارياً ولا تزال قائمة نظرياً. **الحسم: `Status` ينتقل إلى `RESOLVED`** — الخطر
          الفعلي (لا الآلية النظرية) هو ما وثَّقته `DD-014` أصلاً، وقد زال بالقياس الحي.
Status: RESOLVED
Related: DD-012 (السبب الجذري الأعمق، أُحسِم)، DD-010 (وثَّق بطء نفس المسار من زاوية مختلفة)،
          ADR-027، ADR-028، src/core/modules/cart/cart.service.ts، src/app/(reef)/cart/actions.ts،
          vercel.json، AGENTS.md §17 (Guardian Matrix → Inventory Concurrency)
```

---

### DD-016
```
Decision: هل تُعاد تسمية `ProductOptionType` (src/core/modules/catalog/types.ts) إلى
          `SelectableOptionType` كتحوُّط تسمية رخيص، ضمن نطاق ملفات مُعدَّلة أصلاً (لا سعياً لتعميم
          معماري كامل الآن)؟
Reason: رؤية المالك (PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH، بند 1): نفس مفهوم "خيار قابل
          للاختيار يغيّر السعر/المحتوى" (اليوم: وزن/إضافة على منتج) متوقَّع الحاجة إليه مستقبلاً في
          عوالم أخرى غير ريف — درجة رحلة/فندق/وجبة في "أسراب"، نوع خدمة طبية في "نبض". هذان العالمان
          **غير موجودين بعد** — لا تُبنى لهما معمارية كاملة الآن (بناء على تخمين بدل استخدام حقيقي،
          خطأ سبق تجنُّبه صراحة في هذا المشروع، راجع CONFLICT-009/ADR-024).
          **ما تم فعلياً: rename بحت، صفر منطق جديد.** نطاق التنفيذ محصور بملفات ستُعدَّل أصلاً ضمن
          نفس الدفعة (`product-page-blocks-registry.ts`, `ProductOptions.tsx`) — لم تُلمَس ملفات
          أخرى تستورد `ProductOption`/`ProductSelection` (catalog.repository.ts، cart.repository.ts،
          bayan.repository.ts، bayan/types.ts) لأنها خارج نطاق العمل الجاري، ولأن التسمية فيها
          ("منتج") لا تزال دقيقة اليوم — لا داعي تقني لتعميمها الآن. `PostForm.tsx` يملك واجهة محلية
          منفصلة تماماً باسم `ProductOption` (شكل مختلف تماماً `{id, name}` لا `SizeOption|AddonOption`)
          — لم تُمَس أيضاً، لا علاقة لها بهذا النوع إطلاقاً رغم تطابق الاسم صدفةً.
Risk: لا خطر — rename من النوع الآمن (`tsc --noEmit` نظيف بعد التنفيذ، صفر استيراد مكسور). الخطر
          الوحيد المُتجنَّب عمداً هو الاتجاه المعاكس: بناء "محرك اختيارات عام" يخدم عوالم افتراضية
          غير موجودة — هذا مرفوض صراحة حتى وجود استخدام حقيقي ثانٍ (أسراب أو نبض فعلياً).
Owner: Founder
Created: 2026-09-10
Resolved: 2026-09-10 — PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 1)
Status: RESOLVED
Blocking: NO
Related: src/core/modules/catalog/types.ts، src/config/product-page-blocks-registry.ts،
          src/components/ProductOptions.tsx، ADR-024 (نفس مبدأ "لا بناء استباقي بلا استخدام حقيقي")
```

### DD-017
```
Decision: هل يُضاف Dedup صريح لمعرّفات الإضافات (`selection.addonIds`) داخل
          `CatalogService.calculatePrice`/`validateSelection` (catalog.service.ts)، أم يُعتمَد التكرار
          الحالي كسلوك مقصود (يسمح للعميل بكمية مضاعفة من نفس الإضافة)؟
Reason: اكتُشِف أثناء TASK-06 (اختبارات وحدة جديدة لـcalculatePrice/validateSelection، راجع
          catalog.service.test.ts) أن `calculatePrice` تجمع `priceModifier` لكل تكرار `addonId` في
          `selection.addonIds` بلا أي فحص تكرار — مثال: نفس الإضافة مُرسَلة مرتين تُحسَب مرتين (ضعف
          السعر). `validateSelection` لا ترفض هذا التكرار أيضاً طالما كل id صالح فردياً على حدة. لا
          واجهة مستخدم حالية تُنتِج IDs إضافات مكررة عمداً (تحقَّق منه أثناء TASK-06) — فلا مسار استغلال
          حي معروف اليوم.
Risk: غير واضح إن كان هذا سلوكاً مقصوداً (تكرار الـid = طلب كمية مضاعفة من الإضافة) أو ثغرة مدخلات عميل
          تحتاج Dedup من جهة الخادم لمنع تلاعب عميل خبيث بإرسال IDs مكررة يدوياً عبر طلب مُعدَّل. الخطر
          يتصاعد إن أُضيف مستقبلاً أي مسار واجهة (مثل مُحدِّد كمية لكل إضافة) قد يُنتِج IDs مكررة دون
          قصد المستخدم فعلياً، لا عبر تلاعب متعمَّد فقط.
Owner: Engineering
Created: 2026-09-14
Review by: قبل تفعيل أي مسار واجهة قد يُنتِج IDs إضافات مكررة (مثل مُحدِّد كمية لكل إضافة)، أو قبل توسيع
          محرك الإضافات لأي حي جديد يعتمد على إضافات متعددة الكمية
Blocking: NO — لا مسار استغلال حي معروف اليوم، ولا واجهة تُنتِج تكراراً فعلياً
Status: OPEN
Related: src/core/modules/catalog/catalog.service.ts (calculatePrice/validateSelection)،
          src/core/modules/catalog/catalog.service.test.ts (TASK-06)،
          docs/audits/2026-09-14-reef-v1-engineering-audit.md،
          specs/orders/REEF_V1_MASTER_EXECUTION_PLAN.md → TASK-06، DD-004 (اختبارات الوحدة التي كشفت هذا)
```

### DD-018
```
Decision: لا قرار معلَّق — توثيق واقعة تكليف مكتملة، نفس نمط DD-007/DD-009 بالضبط (السجل المستقل المطلوب
          وفق docs/DOCUMENTATION_RULES.md §5.1 شرط 4). بتاريخ 2026-09-15، ضمن مهمة توثيق منفصلة
          (`TASK-10 (docs)`)، اقتُرحت صياغة بند دستوري جديد (§4 بند 9: "لا مسؤولية مالية أو ملكية فعلية
          على سلسبيل") كنص جاهز في تقرير المهمة فقط، بانتظار اعتماد المؤسس صراحةً قبل أي تطبيق فعلي على
          SALSABIL_CONSTITUTION.md — لم يُطبَّق شيء وقتها. لاحقاً، في نفس اليوم، كلَّف المؤسس صراحة
          ("موافق على البند 9 كما اقترحته، بلا تعديل. نفّذه فعليًا الآن على SALSABIL_CONSTITUTION.md")
          بتنفيذ الصياغة المقترَحة حرفياً بلا أي تغيير، مع رفع رقم النسخة وتحديث last_verified وسجل
          الإصدارات.
Reason: هذا السجل هو الأثر المستقل الذي يثبت أن إضافة §4 بند 9 لـSALSABIL_CONSTITUTION.md (v1.5) جاءت
          بتفويض حقيقي من المؤسس على صياغة اقترحها الوكيل مسبقاً ولم يُطبِّقها إلا بعد الموافقة الصريحة —
          لا باجتهاد ذاتي بتطبيق مبدأ دستوري بلا تكليف. نفس المنطق المُطبَّق حرفياً في DD-007 (v1.3)
          وDD-009 (v1.4) للسوابق المماثلة.
Risk: بلا هذا السجل، الإضافة لـSALSABIL_CONSTITUTION.md كانت ستعتمد فقط على الملاحظة التنفيذية داخل
          الملف نفسه كدليل — وهو تحديداً نوع الادعاء غير المستقل الذي يمنعه الشرط الرابع في
          docs/DOCUMENTATION_RULES.md §5.1 (نفس السبب الذي أنشأ DD-007/DD-009 أصلاً).
Owner: Founder
Created: 2026-09-15
Review by: N/A — سجل توثيقي مكتمل بذاته
Blocking: NO
Status: RESOLVED — بمجرد كتابة هذا السجل نفسه، مطابقاً للشرط الرابع في docs/DOCUMENTATION_RULES.md §5.1.
Related: SALSABIL_CONSTITUTION.md §4 بند 9 (v1.5)، docs/DIWAN_VISION.md → Addendum 8، DD-007/DD-009
          (السوابق المطابقة)، docs/DOCUMENTATION_RULES.md §5.1
```

### DD-019
```
Decision: هل يُعتمَد تصميم specs/orders/SUPPLY_RESOLUTION_ENGINE_DESIGN.md (كان
          PHASE_3_SUPPLY_RESOLUTION_DESIGN.md — أُعيدت تسميته ضمن هذا الاعتماد، راجع Status أدناه)
          — مكتبة منتجات مشتركة موسَّعة فوق ADR-031 القائم، محرك حل توريد جديد (Supply Resolution
          Engine)، إنفاذ حد أدنى لهامش ريف (قسم + استثناء منتج + افتراضي عالمي)، تدفق مراجعة مزدوج
          (Full/Lightweight Review) مع مطابقة بالباركود أولاً، وجدول catalog_content_review_queue
          منفصل — كوثيقة تصميم معتمَدة (لا كنطاق تنفيذ رسمي تلقائي — تنفيذ V1 يبقى Task منفصلة تماماً،
          بنفس نمط TASK-12 بعد اعتماد PHASE_2_DOMAIN_DESIGN.md)؟
Reason: DESIGN-TASK-01 (مهمة توثيق/تصميم بحتة، صفر كود/SQL تنفيذي، صفر تعديل على Checkout/Orders/Cart)
          كُلِّفت بمراجعة مسودة مفاهيمية غير متوفرة فعلياً في المستودع (بحث كامل في الريبو أثبت غيابها؛
          المؤسس أكَّد صراحة المتابعة بدونها) والتحقق حياً من شكل الكود الفعلي قبل كتابة أي تصميم. التحقق
          الحي كشف نظاماً كاملاً غير مذكور في موجّه المهمة — `ADR-031` (`catalog_master_items`/
          `products.master_item_id`/`catalog_review_queue`، حي فعلياً منذ 2026-09-13، commit `1c62fd9`)
          — غيّر جوهر التصميم من "بناء مكتبة منتجات من الصفر" إلى "توسعة فوق نظام قائم بالفعل". جلسة
          مراجعة تالية مع المؤسس كشفت تناقضاً داخلياً حقيقياً في §4.2/§4.3 من نسخة التصميم الأولى (مطابقة
          الباركود وُصفت كأنها تلقائية بالكامل، وفي نفس الوقت كمُفعِّل لمراجعة بشرية — تناقض منطقي)، صُحِّح
          بفصل "ربط الهوية" (§4.3، تلقائي بالكامل بلا أي بوابة بشرية أياً كان مصدر المطابقة: باركود أو
          اسم مُطبَّع) عن "مراجعة المحتوى" (§4.2، بوابة بشرية دائمة بلا استثناء لأي محتوى إثراء مقترَح،
          بصرف النظر عن مسار حسم الهوية) كخطوتين مستقلتين تماماً. هذا التصحيح كشف بدوره فجوة Schema
          حقيقية (لا جدول يحمل طلب مراجعة محتوى معلَّق) — حُسمت بجدول جديد منفصل تماماً
          `catalog_content_review_queue` (§4.4/§14)، لا توسعة لـ`catalog_review_queue` القائم، لاختلاف
          دورتي الحياة جوهرياً (طابور مطابقة استيراد بلا هوية مقابل طابور مراجعة محتوى لهوية محسومة
          بالفعل).
Risk: لا خطر تشغيلي فوري — هذا سجل تصميم، لا كود منفَّذ ولا Migration مُطبَّقة على أي بيئة حتى بعد هذا
          الاعتماد (اعتماد التصميم ≠ إذن تنفيذ، راجع Status أدناه). المخاطر المتبقية بعد اعتماد المؤسس
          الصريح على القرارات الأربعة (§24.4.1 من الوثيقة): (أ) **مُغلَقة الآن** — علاقة الهامش بجدول
          العمولات (`SALSABIL_CONSTITUTION.md §19`) محسومة صراحة: منفصلان تماماً، بلا علاقة حسابية؛
          (ب) **مقبولة صراحة كنتيجة للمسار المعتمَد** — محرك حل التوريد يبقى جاهزاً تصميماً بلا مادة
          عملية يعمل عليها طالما 7,506 من 7,556 منتجاً (99.3%) بلا `tenant_id` فعلي
          (`docs/audits/2026-09-19-task-18-catalog-storefront-report.md §5`) — المؤسس اعتمد هذا صراحة
          كمسار متعمَّد (لا حل مؤقت، لا بيانات وهمية)، لا مخاطرة غير مقصودة؛ (ج) **لا تزال قائمة، غير
          مُعالَجة في هذا الاعتماد** — `catalog_master_items.category_id` (قديم) مقابل
          `catalog_category_id` (جديد، مقترَح) — لو لم يُضَف العمود الجديد فعلياً قبل تفعيل إنفاذ
          الهامش عند التنفيذ، الميزة عديمة الأثر عملياً.
Owner: Founder
Created: 2026-09-19
Review by: قبل أي تكليف Task تنفيذ منفصل يُطبِّق أياً من هذا التصميم على كود/Schema حي (نفس بوابة
          TASK-12 بعد اعتماد PHASE_2_DOMAIN_DESIGN.md — هذا الاعتماد نفسه لا يُشكِّل ذلك التكليف)
Blocking: NO — التصميم معتمَد؛ تنفيذه (Task V1) يبقى بانتظار تكليف صريح منفصل تماماً عن هذا الاعتماد،
          بلا اعتماد تلقائي للتنفيذ بمجرد اعتماد التصميم
Status: APPROVED — اعتمده المؤسس بتاريخ 2026-09-19، بعد حسم أربعة من الأسئلة المفتوحة الخمسة المسجَّلة
          أصلاً في §24.4 من الوثيقة (البند الخامس، `open_marketplace_v5`، يبقى مؤجَّلاً صراحة حتى حسم
          `BR-017` — لا منسياً). **القرارات الأربعة المعتمَدة حرفياً:** (1) الحد الأدنى لهامش ريف
          **منفصل تماماً** عن جدول العمولات (`CONSTITUTION §19`) — بلا علاقة حسابية بينهما، كل منهما
          يخدم غرضه الأصلي بمعزل عن الآخر؛ (2) القيمة الافتراضية العالمية للهامش الأدنى = **5% من
          `base_price`**، `Configuration` قابلة للتعديل من لوحة إدارة مستقبلية (لا `Invariant` مبرمجة
          بصلابة، مطابق لـ`SALSABIL_CONSTITUTION.md §4` بند 7) — النظام لم يعد `Fail Open`؛ (3) مصير
          الـ7,506 منتج بلا تاجر — **تُعتمَد التوصية الأصلية في §20 حرفياً**: تبقى في المكتبة المشتركة
          بلا عروض توريد فعلية، غير قابلة للشراء حتى يضيف تاجر حقيقي عرض توريد حقيقياً عليها، بلا حل
          مؤقت أو بيانات وهمية؛ (4) إعادة تسمية الملف — **منفَّذة فعلياً**: `specs/orders/
          PHASE_3_SUPPLY_RESOLUTION_DESIGN.md` → `specs/orders/SUPPLY_RESOLUTION_ENGINE_DESIGN.md`
          (`git mv`، تاريخ الملف محفوظ)، كل إشارة داخلية لـ"Phase 3" صُحِّحت. **⚠️ هذا الاعتماد للتصميم
          كتوثيق فقط — لا يُشكِّل إذناً ببدء أي تنفيذ**؛ أي Task تنفيذ V1 يحتاج برومبت منفصل صريح لاحقاً.
Related: specs/orders/SUPPLY_RESOLUTION_ENGINE_DESIGN.md (الوثيقة كاملة، معتمَدة الآن — خصوصاً §0 ملخص
          التحقق الحي، §1.1/§1.2 تعارض `ADR-031`، §3.2/§3.3 التصميم النهائي للهامش بعد قرارات المؤسس،
          §4.2/§4.3 تصحيح فصل مراجعة المحتوى عن مطابقة الهوية، §4.4/§14 `catalog_content_review_queue`،
          §24.4.1/§24.4.2 القرارات الأربعة والبند المتبقي مفتوحاً)، `ADR-031` (النظام القائم الذي
          يُبنى هذا التصميم فوقه دون تعديله)، `PHASE_2_DOMAIN_DESIGN.md` (النمط/الصرامة المرجعية
          المُتَّبعة)، `docs/audits/2026-09-19-task-18-catalog-storefront-report.md`،
          `docs/audits/2026-09-19-launch-readiness-report.md`، `docs/BUSINESS_RULES.md` → `BR-017`،
          `SALSABIL_CONSTITUTION.md §19`، `DD-002` (يبقى قيداً منفصلاً تماماً، غير مرتبط بهذا التصميم)،
          `DD-004` (نفس فئة فجوة غياب اختبار وحدة لمنطق master-item/مطابقة، تمتد لهذا التصميم إن نُفِّذ
          لاحقاً)
```

---

### مراجَع ولم يُحوَّل إلى Decision Debt (مع التبرير)

- **BR-016 (الحد الأدنى لقيمة الطلب، `docs/BUSINESS_RULES.md`):** `OPEN_QUESTION` قائم، لكن التنفيذ
  الحالي (Checkout بلا حد أدنى) هو بالضبط ما وافق عليه المؤسس صراحة وقت البناء ("التنفيذ بلا القيد +
  TODO... هو ما سُمح به صراحة، فلا تعارض" — نص BUSINESS_RULES.md نفسه). لا خطر تشغيلي حقيقي ينتظر
  قراراً عاجلاً، ولا يمنع أي قرار/مرحلة لاحقة — يبقى موثَّقاً في `BUSINESS_RULES.md` فقط.
- **INV-INV-002 (كمية مخزون سالبة، `INVARIANTS.md`):** حالته `UNKNOWN` (لا Live Verification مباشر لقيد
  CHECK نفسه في هذه الجلسة) — لكن `INV-INV-001` (ENFORCED) يمنع الوصول لمسار الخصم الذي قد ينتج عنه قيمة
  سالبة أصلاً، فالخطر الفعلي منخفض جداً عملياً. لا يحتاج قراراً بشرياً ولا إصلاحاً — مجرد تحديث `UNKNOWN`
  إلى `ENFORCED` يتطلب فقط تشغيل فحص حي بسيط لاحقاً، لا قراراً معمارياً. يبقى موثَّقاً في `INVARIANTS.md` فقط.
- **CONFLICT-002 (رقم إصدار قديم في السطر الختامي للدستور):** خطأ توثيقي تجميلي بلا أثر وظيفي، مسجَّل
  ومُعرَّف مسبقاً بوضوح — لا يستوفي "خطراً معمارياً/أمنياً/تشغيلياً حقيقياً". يبقى `CONFLICT-002` كما هو.