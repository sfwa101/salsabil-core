---
title: بروتوكول الوكيل — سلسبيل
status: ACTIVE
version: 2.0
last_updated: 2026-09-05
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف نفسه
---

# AGENTS.md — بروتوكول الوكيل

بوابة الدخول الإلزامية لأي أداة ذكاء اصطناعي (Claude Code / Cursor / غيرها) قبل أي عمل على هذا المستودع. هذا الملف يحكم **كيف** تُنفَّذ أي مهمة. لـ**ماذا** نبني، راجع `SALSABIL_CONSTITUTION.md` والإحالات في §11.

---

## 1. البروتوكول الإلزامي

لكل مهمة، بهذا الترتيب، بلا تخطي خطوة:

1. **STOP** — لا تنفيذ فوري عند استلام الطلب.
2. **READ** — هذا الملف + الوثائق ذات الصلة **بالمهمة تحديداً** (لا كل `docs/`). حدِّد الوثائق من طبيعة المهمة: جدول/عمود جديد → `DATABASE.md`؛ endpoint/service → `ARCHITECTURE.md` + `API_CONTRACTS.md`؛ قاعدة عمل → `BUSINESS_RULES.md`؛ أمان/صلاحيات → `SECURITY.md`.
3. **SEARCH** — عن قدرة/دالة/مكوّن موجود يؤدي الغرض قبل افتراض الحاجة لشيء جديد (§2).
4. **PLAN** — اعرض الخطة (النطاق، الملفات، حجم التغيير المتوقع وفق §4) على المؤسس. لا تنفّذ أثناء العرض ولا قبل الموافقة.
5. **IMPLEMENT** — فقط ما تمت الموافقة عليه صراحة.
6. **VERIFY** — اختبارات فعلية (لا افتراض نجاح) + فحوص معمارية (عزل المستأجر، الأمان، عدم التكرار).
7. **REPORT** — تقرير المهمة الإلزامي (§10)، حرفياً، في نهاية كل مهمة بلا استثناء.

هذا التسلسل يحلّ محل أي دورة عمل موثّقة سابقاً في هذا الملف.

---

## 2. Capability Before Creation

لا endpoint، لا service، لا repository، لا component جديد قبل إثبات عدم وجود قدرة موجودة تؤدي نفس المسؤولية.

- البحث يكون **بالمسؤولية لا بالاسم**: ابحث عن تكرار مفاهيمي (منطق مشابه بأسماء مختلفة)، لا تكتفِ بمطابقة حرفية للاسم.
- لا تُنشئ ملفاً جديداً لا يخدم مسؤولية غير مغطاة فعلاً — الحد الأدنى من الملفات لتحقيق المطلوب.

---

## 3. Scope Lock

لا تعديل خارج نطاق المهمة المُعلَنة، إلا لمنع خطأ أو ثغرة حقيقية — وعندها يُصرَّح به صراحة **قبل** التنفيذ لا بعده.

---

## 4. Complexity Budget

كل مهمة كبيرة تُعلَن قبل التنفيذ بحجمها المتوقع: ملفات جديدة/معدَّلة، أسطر تقريبية، تبعيات جديدة، جداول جديدة.

- دالة > 50 سطراً أو ملف > 300 سطر = **Review Trigger** يستوجب تبريراً في التقرير — ليس فشلاً تلقائياً.
- إن تجاوز التنفيذ الفعلي المتوقع بفارق كبير (مثلاً +80 متوقع مقابل +700 فعلي) — توقف واطلب المراجعة بدل الإعلان عن نجاح.

---

## 5. Never Infer Missing Architecture

إن لم تُعرَف معلومة معمارية بثقة من الكود أو الوثائق، لا تُخترَع. اذكر `UNKNOWN` صراحة + "توجد فجوة معمارية تحتاج قراراً" بدل افتراض إجابة معقولة.

عند الشك في أي قرار معماري: **توقف واسأل، لا تخمّن.**

---

## 6. Context Integrity Check

عند تعارض بين الكود والوثائق و/أو قرار مسجَّل (ADR) — لا يُحسم صمتاً باختيار مصدر واحد. يُبلَّغ كـ`CONFLICT` صراحة، بنفس آلية CONFLICT LOG في `docs/DECISIONS.md` (راجع `docs/DOCUMENTATION_RULES.md` §7).

---

## 7. لا Refactor أثناء Feature

أي إعادة هيكلة تتجاوز نطاق المهمة المطلوبة تحتاج تصريحاً مسبقاً صريحاً من المؤسس، لا قراراً منفرداً من الوكيل.

---

## 8. Fail Closed

عند عدم اليقين من صلاحية/ملكية مورد، النتيجة الافتراضية = **رفض الوصول**، لا سماحاً.

---

## 9. AI Least Privilege

لا تنفّذ عملية تتجاوز نطاق الصلاحية الموضحة في المهمة (تعديل كود ≠ صلاحية migration مدمِّر ≠ صلاحية نشر إنتاج). أي عملية destructive (`DROP`/`DELETE`/`ALTER` مدمِّر) تحتاج تصريحاً بشرياً صريحاً منفصلاً دائماً، بلا استثناء.

يدخل ضمن هذا المبدأ: خطافات Git (Husky) وdependency-cruiser المفروضة على هذا المستودع (`.husky/pre-commit`, `.husky/pre-push`, `.dependency-cruiser.cjs`) لا تُتجاوَز بـ`--no-verify` إلا بطلب صريح من المؤسس في نفس المحادثة. فشل خطاف = مشكلة حقيقية تُحل، لا تُتجاوَز.

---

## 10. شكل تقرير المهمة الإلزامي (Task Report)

يُرفَق حرفياً في نهاية كل مهمة:

```
Task: [المعرّف]
Files added / modified / removed: [عدد + أسماء]
LOC added / removed / net: [أرقام تقريبية]
New dependencies: [عدد + مبرر إن وُجد]
New DB objects (tables/columns/indexes): [عدد]
New endpoints/actions: [عدد]
Capabilities reused: [ماذا استُخدِم بدل إنشاء جديد]
New abstractions: [عدد + مبرر]
Architecture violations found: [نعم/لا + تفصيل]
Security checks: [PASS/FAIL/N/A]
Tenant isolation checks: [PASS/FAIL/N/A]
Tests: [عدد نجح/فشل]
Docs updated: [قائمة الملفات]
Outstanding risks: [صراحة، لا "لا شيء" افتراضياً بلا فحص]
```

---

## 11. إحالات (لا تكرار محتوى)

- المعمارية والقواعد غير القابلة للكسر (لا استدعاء DB مباشر من الواجهة، لا حساب سعر في الواجهة، عزل tenant عبر JWT فقط) → `SALSABIL_CONSTITUTION.md` §4، `docs/ARCHITECTURE.md`.
- الأمن → `docs/SECURITY.md`.
- قاعدة البيانات → `docs/DATABASE.md`.
- قواعد التوثيق نفسها (التسلسل الهرمي، الحالات، مستوى الدليل) → `docs/DOCUMENTATION_RULES.md`.
- القرارات المعمارية وسجل التعارضات → `docs/DECISIONS.md`.
- قواعد الذكاء الاصطناعي **كمنتج داخل سلسبيل** (حكيم) — مختلفة عن هذا الملف الذي يحكم أداة الذكاء الاصطناعي المستخدَمة في **بناء** سلسبيل → `docs/AI_RULES.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
