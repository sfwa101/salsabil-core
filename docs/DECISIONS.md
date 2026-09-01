---
title: سجل القرارات المعمارية (Decision Log / ADR Index)
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
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

---

## سجل التعارضات (CONFLICT LOG)

### CONFLICT-001
```
بين: SALSABIL_CONSTITUTION.md §2/§7 (خليل/بيان/حكيم/برق/تيسير كـ"عوالم") مقابل §6 (نفس الخمسة كـ"محركات نواة")
الوصف: نفس الكيانات الخمسة موجودة بدورين مختلفين في مكانين مختلفين من الدستور نفسه — راجع docs/DOMAIN_MAP.md → OPEN_QUESTION-001 للتفصيل الكامل
التأثير: يحدد تصميم الشاشة الرئيسية لديوان (هل لهذه الخمسة أيقونات مستقلة؟)
يحتاج قراراً من: المؤسس
الحالة: OPEN
```

### CONFLICT-002
```
بين: عنوان SALSABIL_CONSTITUTION.md ("النسخة 1.2") مقابل السطر الختامي في نهاية نفس الملف ("نهاية الوثيقة — النسخة 1.0")
الوصف: خطأ توثيقي بسيط — السطر الختامي لم يُحدَّث عند رفع رقم الإصدار من 1.0 إلى 1.2. تم التحقق من وجوده في نسخة Project Knowledge الفعلية أيضاً.
التأثير: لا تأثير وظيفي، لكنه يخالف مبدأ الاتساق الداخلي للدستور
يحتاج قراراً من: المؤسس (تصحيح بسيط، لكن هذا الملف لا يُعدَّل الدستور تلقائياً حسب القاعدة الصارمة المتفق عليها)
الحالة: OPEN — يُقترح تضمينه كتصحيح صغير عند أي تحديث رسمي قادم للدستور
```

### CONFLICT-004
```
بين: ملفات مرجع سريع في جذر المستودع (ARCHITECTURE.md, DATABASE.md, DOMAIN_MAP.md, ROADMAP.md, SECURITY.md — من اليوم 0/1) مقابل docs/*.md المقابلة لها (النظام الكامل، 2026-09-01)
الوصف: كلا المجموعتين موجودتان معاً في المستودع الآن. حسب docs/DOCUMENTATION_RULES.md §1، طبقة docs/ هي مصدر الحقيقة الرسمي — لكن ملفات الجذر لم تُحذف أو تُعلَّم كـ SUPERSEDED صراحة.
التأثير: احتمال قراءة نسخة قديمة (الجذر) بدل النسخة الرسمية المحدَّثة (docs/) من قِبل أداة أو شخص لا يعرف بوجود docs/DOCUMENTATION_RULES.md
يحتاج قراراً من: المؤسس — هل تُحذف ملفات الجذر، أم تبقى كـ"ملخص فهرسة" مع إحالة صريحة لـ docs/؟
الحالة: OPEN
```

### CONFLICT-003
```
بين: ملفين منفصلين في Project Knowledge بنفس المحتوى — "دستور_سلسبيل_ديوان_الوثيقة_المرجعية.md" و"SALSABIL_CONSTITUTION.md"
الوصف: تم رصد الاثنين أثناء التحقق من نسخة v1.2 (project_knowledge_search أعاد نفس المحتوى مرتين تحت اسمين مختلفين)
التأثير: يخالف مبدأ "Single Source of Truth" — قد يسبب التباساً مستقبلياً حول أيهما "الأصلي"
يحتاج قراراً من: المؤسس — يُقترح حذف أحد الملفين من Project Knowledge والإبقاء على واحد فقط
الحالة: OPEN
```
