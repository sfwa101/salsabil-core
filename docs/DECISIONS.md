---
title: سجل القرارات المعمارية (Decision Log / ADR Index)
status: ACTIVE
version: 1.5
last_updated: 2026-09-02
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

## ADR-005 (PROPOSED — يحتاج موافقة المؤسس)
```
Title: توثيق قاعدة اتجاه الاعتماد (Dependency Direction) صراحة
Status: PROPOSED
Date: 2026-09-01
Decision المقترح: توثيق رسمي لقاعدة: components → service → repository → supabase-client (اتجاه واحد فقط، لا عكس).
Context: هذه القاعدة مُطبَّقة فعلياً في الكود (khalil، catalog) لكنها لم تُكتب كقاعدة صريحة في أي مكان قبل الآن — استُنتجت من النمط الفعلي (INFERRED) أثناء بناء docs/ARCHITECTURE.md.
Alternatives: تركها ضمنية (خطر: قد ينتهكها Claude Code مستقبلاً دون قاعدة مكتوبة يستشهد بها)
Why: توضيح صريح يمنع أي انحراف مستقبلي، ويتوافق مع طلب المؤسس بعدم ترك أي قاعدة "مفهومة ضمنياً" فقط.
Consequences: لا شيء سلبي متوقَّع — توثيق لواقع قائم فعلاً.
Related Documents: docs/ARCHITECTURE.md §3
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