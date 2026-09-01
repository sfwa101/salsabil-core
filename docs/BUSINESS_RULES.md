---
title: قواعد الأعمال
status: ACTIVE
version: 1.1
last_updated: 2026-09-01
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف (يجمع كل قواعد الأعمال المؤكدة من الدستور والمحادثات)
---

# قواعد الأعمال — Business Rules

> كل قاعدة تحمل معرِّفاً فريداً (Rule ID)، لا تُعدَّل رقمياً بعد إنشائها، فقط تتغيّر حالتها.

---

## BR-001 — الفصل بين ريف وأسراب
```
Status: ACTIVE
Source: CONSTITUTION §13
Description: "أحتاجه هذا الأسبوع" → ريف. "قرار سيغيّر حياتي" → أسراب.
Applies To: تصنيف كل منتج/خدمة جديدة عند إضافتها
Implementation Notes: تُطبَّق يدوياً عند إضافة القسم (category)، لا تحقق آلي حالياً
```

## BR-002 — تعدد الأحياء لنفس البائع بلا تكرار منتج
```
Status: ACTIVE
Source: CONSTITUTION §28.3 (تأكيد المؤسس)
Description: البائع يمكن أن يبيع في عدة أحياء (بقالة + مجمّدات مثلاً)، لكن كل منتج له تصنيف/قسم واحد فقط — لا يظهر نفس المنتج في أكثر من حي.
Applies To: Catalog، seller onboarding
Implementation Notes: category_id في جدول products هو foreign key واحد فقط — يحقق هذا بنيوياً بالفعل (IMPLEMENTED)
```

## BR-003 — البدائل الذكية عند نفاد المخزون
```
Status: PROPOSED (مصمَّم بالكامل، غير منفَّذ)
Source: CONSTITUTION §14
Description: عند نفاد منتج، يُعرض بديل، أو إزالة من السلة، أو إلغاء الطلب — بقرار العميل. الإضافات الاختيارية لها تفضيل مسبق (تابع بدونها/اسألني/ألغِ الطلب).
Applies To: Catalog, Orders (عند بنائه)
Implementation Notes: النوع ifUnavailable: UnavailablePreference موجود بالفعل في catalog/types.ts (IMPLEMENTED جزئياً على مستوى النوع)، المنطق الفعلي (Smart Alternatives Engine) غير منفَّذ
```

## BR-004 — عمولة الأفيليت تُقتطع من عمولة المنصة لا من العميل
```
Status: ACTIVE
Source: CONSTITUTION §17, §19
Description: إذا جاء البيع عبر رابط أفيليت، عمولة المحيل تُخصم من عمولة المنصة، لا تُضاف فوق سعر العميل.
Applies To: نظام الأفيليت (عند بنائه)
Implementation Notes: PROPOSED تقنياً، لا كود بعد
```

## BR-005 — عدالة التسعير بحسب نوع السلعة (Fair Matching Engine)
```
Status: PROPOSED (مصمَّم، غير منفَّذ)
Source: CONSTITUTION §29.3
Description: للسلع الأساسية، ارتفاع سعر ملحوظ عن متوسط المنطقة → علم "يحتاج تحقيقاً" تلقائي. للسلع الرفاهية، الأرخص يظهر افتراضياً. عند تساوي الأسعار، توزيع الطلبات بالدور.
Applies To: Catalog display logic, Orders assignment
```

## BR-006 — الكرامة في التخصيص
```
Status: ACTIVE (كمبدأ)، PROPOSED (كتنفيذ)
Source: CONSTITUTION §1
Description: لا تُقترح خيارات باهظة كافتراضي لمستخدم محدود الدخل — تُقترح بدائل مكافئة الجودة بسعر مناسب.
Applies To: كل محرك توصية مستقبلي (حكيم، بيان)
```

---

## قواعد عدالة التجار — Founder Decision (خارج نص الدستور v1.2)

> **مصدر:** قرار صريح من المؤسس في محادثة بتاريخ 2026-09-01، ردّاً على شكوى حقيقية ضد منصة توصيل بخصوص ممارسات مخالفة لمبادئ الشريعة في التجارة. **الحالة: `ACCEPTED` — نافذة للتطبيق في الكود الآن، بانتظار مزامنة نص SALSABIL_CONSTITUTION.md في تحديث لاحق.**

## BR-007 — الشفافية المطلقة (Zero Hidden Fees)
```
Status: ACCEPTED
Evidence Level: FOUNDER_DECISION — Outside Constitution v1.2 — Pending Constitution Synchronization
Source: محادثة 2026-09-01
Description: يُمنع برمجياً إضافة أي ضرائب أو رسوم لم يوافق عليها التاجر مسبقاً بعقد إلكتروني واضح. العمولة تُحسب وتُعرض كرقم نهائي شامل.
Applies To: نطاق التاجر (Merchant onboarding + Orders)
Implementation Notes: يتطلب نطاق جديد MerchantAgreement (لم يُبنَ بعد)
```

## BR-008 — حرية الأجهزة (Hardware Agnostic)
```
Status: ACCEPTED
Evidence Level: FOUNDER_DECISION — Pending Constitution Synchronization
Source: محادثة 2026-09-01
Description: واجهة البائع تعمل على أي متصفح ويب أو هاتف محمول. لا إجبار على شراء أجهزة مخصصة.
Applies To: Merchant Portal (UI)
Implementation Notes: محقَّق تلقائياً (IMPLEMENTED) بحكم اختيار Next.js كتطبيق ويب — لا حاجة لعمل إضافي، لكن يُسجَّل كقاعدة صريحة لمنع أي انحراف مستقبلي (مثل اقتراح تطبيق كاشير مخصص إجباري)
```

## BR-009 — عدالة المسؤولية المادية (Fair Liability Engine)
```
Status: ACCEPTED
Evidence Level: FOUNDER_DECISION — Pending Constitution Synchronization
Source: محادثة 2026-09-01
Description: إذا أُلغي الطلب بسبب تأخير المندوب أو خطأ من المنصة، يتحمل التاجر 0% من الخسارة. النظام يحدد الطرف المقصر تلقائياً عبر سجل الأحداث (audit_log) دون تدخل بشري مزاجي.
Applies To: Orders lifecycle, Barq (برق)
Implementation Notes: يعتمد على audit_log (CONCEPTUAL) و order_status_history (CONCEPTUAL) — لا يمكن تنفيذه قبل بناء Orders (اليوم 6-8)
```

## BR-010 — التسوية الفورية والتخارج السلس (Automated Offboarding)
```
Status: ACCEPTED
Evidence Level: FOUNDER_DECISION — Pending Constitution Synchronization
Source: محادثة 2026-09-01
Description: أموال التاجر تُرحَّل لمحفظته فور اكتمال الطلب. عند طلب إغلاق الحساب، تصفية مالية آلية + براءة ذمة إلكترونية + أمر تحويل بنكي، دون تدخل "مدير حساب" يماطل.
Applies To: تيسير (Ledger)
Implementation Notes: يتطلب بناء تيسير كاملاً أولاً — PROPOSED تقنياً
```

## BR-011 — المفوّض كشريك (Aligned Incentives)
```
Status: ACCEPTED
Evidence Level: FOUNDER_DECISION — Pending Constitution Synchronization
Source: محادثة 2026-09-01
Description: المفوّض ليس موظف خدمة عملاء هدفه الخصم من التاجر، بل شريك تُقتطع أرباحه من نجاح التاجر. التنبيهات تُوجَّه له ليحل المشكلة، لا ليعاقب التاجر.
Applies To: AgentAssignment (§28.1)، لوحة تحكم المفوّض
Implementation Notes: PROPOSED — يعتمد على AgentAssignment (غير مبني بعد)
```

---

## BR-016 — الحد الأدنى لقيمة الطلب
```
Status: OPEN_QUESTION
Evidence Level: UNKNOWN — لا رقم معتمد من المؤسس ولا نص دستوري صريح
Source: موجّه CART-001 (اليوم 7، 2026-09-01) — أشار لهذه القاعدة كموجودة سلفاً بحالة OPEN_QUESTION، لكنها لم تكن موثَّقة في هذا الملف قبل الآن — أُنشئت هنا لأول مرة لتسجيل الفجوة، لا لحسمها
Description: هل يوجد حد أدنى لقيمة السلة/الطلب قبل السماح بإتمامه (مثال: 50 جنيه)؟ لا قيمة مُخترَعة هنا — يُمنع برمجياً افتراض رقم دون قرار مؤسس صريح (راجع AGENTS.md بند 8).
Applies To: Cart (السلة)، Checkout لاحقاً
Implementation Notes: cart.service.ts لا يطبّق أي حد أدنى حالياً — TODO صريح في الكود (`getSummary()`) يشير لهذه القاعدة. يجب حسمها قبل إتاحة Checkout فعلياً (لا قبل اليوم 7 نفسه).
```

---

## قواعد أخرى موثَّقة (مرجع سريع، دون تفصيل كامل بعد)

| Rule ID | الاسم المختصر | الحالة | المصدر |
|---|---|---|---|
| BR-012 | نظام الحجز بالسعة | PROPOSED | CONSTITUTION §15 |
| BR-013 | نموذج الدروبشيبينغ | PROPOSED | CONSTITUTION §16 |
| BR-014 | فصل المحتوى حسب الجنس (§32.4) | ACCEPTED (كمبدأ) | CONSTITUTION §32.4 |
| BR-015 | التجميد التدريجي للمحفظة | PROPOSED | CONSTITUTION §29.2 |

**قاعدة الإضافة:** أي قاعدة عمل جديدة تُناقَش يجب أن تُصنَّف فوراً بمعرِّف جديد + الحالة الصحيحة (لا `ACCEPTED` إلا بقرار صريح من المؤسس) — راجع `docs/DOCUMENTATION_RULES.md §12` (القاعدة المستقبلية للتصنيف).
