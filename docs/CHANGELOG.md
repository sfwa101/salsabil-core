---
title: سجل التغييرات
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
owner: Claude (تلقائي مع كل مهمة كبيرة)
source_of_truth: هذا الملف + Git log
---

# سجل التغييرات

> يُسجَّل هنا فقط التغييرات المهمة (معمارية، قواعد أعمال، قاعدة بيانات، أمان، UX، قرارات، خارطة طريق) — لا كل commit صغير.

---

## 2026-09-01 (اليوم 7) — نطاق السلة (Cart Domain, CART-001)
- خطة Specification+Plan صريحة قبل أي كود (دورة §24 السبعية) — قرارا المؤسس المعتمدان قبل التنفيذ: (أ) سلة زائر عبر session_token nullable، (ب) حماية الكتابة عبر service_role خادم فقط لا RLS مفتوح لـanon — موثَّقان في ADR-008
- إنشاء جدولي carts, cart_items في Supabase (لا عمود سعر إطلاقاً، CHECK يفرض user_id XOR session_token، RLS بلا policy)
- إضافة src/core/kernel/database/supabase-admin-client.ts (مفتاح service_role، حزمة server-only كحارس بناء)
- إضافة نطاق src/core/modules/inventory/ جديد بالكامل (types, service: isAvailable فقط بلا حجز, repository) — لم يكن موجوداً رغم أن جدول inventory IMPLEMENTED منذ اليوم 3
- إضافة src/core/modules/cart/ (types, cart.service.ts, cart.repository.ts) — السعر يُحسَب دائماً حياً عبر catalogService.calculatePrice، لا تكرار لمنطق التسعير
- إضافة src/app/(reef)/cart/ (actions.ts بكوكي session httpOnly، page.tsx) وزر "أضف للسلة" في ProductOptions.tsx — تحقَّق أولاً أن shadcn/ui لا تزال غير مثبَّتة (نفس فحص اليوم 6)، تُستهلَك التوكنز الدلالية فقط
- BR-016 (الحد الأدنى للطلب) جديد بحالة OPEN_QUESTION — لا رقم مُخترَع، TODO صريح في الكود
- إضافة vitest: 8 اختبارات وحدة (منطق cart.service/inventory.service، الوصول لقاعدة البيانات مُموَّه) + 3 اختبارات تكامل (ضد Supabase حقيقي، تنظّف بياناتها في afterAll) — كلها خضراء
- تحقق فعلي عبر متصفح حقيقي (Playwright): إضافة "دجاجة كاملة طازجة" (صغير) → ظهورها في /cart بسعر 100 → زيادة الكمية إلى 200 حياً → حذف → سلة فارغة، بلا أخطاء console
- تحديث docs/DATABASE.md (§3 carts/cart_items)، docs/DOMAIN_MAP.md (Cart جديد، Inventory محدَّث، تصحيح قسم Tenant/Authorization الذي عاد لحالة قديمة خاطئة في تحديث خارجي)، docs/BUSINESS_RULES.md (BR-016)

## 2026-09-01 (اليوم 6) — معمارية الثيمات متعددة العوالم (Multi-World Theming)
- إضافة src/config/theme-registry.ts: السجل المركزي لثيمات 7 عوالم (ديوان، ريف، أسراب، نبض، نور الدين، تكوين، بيان) — slug + اسم AR/EN + توكنز دلالية كاملة
- تحقَّق فعلياً: shadcn/ui **غير مثبّتة** (لا components.json، src/components/ui/ فارغ، لا cva/clsx) — سُجِّل CONFLICT-005 في docs/DECISIONS.md، استُخدم بادئة --sb- بصيغة Hex كخطة احتياط موثَّقة مسبقاً
- src/app/globals.css: طبقتان — [data-world="<slug>"] (خام) + @theme inline (دلالية) لكل الأسماء القياسية (bg-primary, text-foreground, border-border...)
- **خطأ حقيقي وقع وأُصلح أثناء التنفيذ:** @theme العادية (لا inline) تُجمِّد قيمة --color-primary عند :root وقت البناء، فلا يتغيّر شيء فعلياً عند تبديل data-world في عنصر متداخل رغم أن --sb-primary نفسه يتغيّر بشكل صحيح. اكتُشف عبر لقطات شاشة فعلية (كانت تظهر ألوان ديوان الأرجوانية على صفحات ريف رغم DOM صحيح) — أُصلح باستخدام @theme inline، أُعيد التحقق والتقط لقطات جديدة تطابق الأصل تماماً
- src/app/layout.tsx: data-world="diwan" على <html> (الافتراضي)
- نقل صفحات ريف الثلاث إلى src/app/(reef)/ (Route Group، لا يغيّر مسارات URL) مع layout.tsx يضع data-world="reef" على عنصر جذر
- تحديث CategoryCard, ProductCard, ProductOptions وصفحات (reef) لاستهلاك التوكنز الدلالية فقط (bg-card, text-foreground, border-primary...) بدل ألوان Tailwind الثابتة (stone-*, brand-green/orange) — بحث نصي عن hex خارج globals.css يُرجع صفر نتائج
- تحقق فعلي عبر Playwright: (أ) واجهة ريف مطابقة بصرياً لليوم 5 بالضبط (نفس الأخضر/البرتقالي)، (ب) تبديل data-world يدوياً من reef إلى diwan غيّر --primary فوراً (#2d6a4f → #5b3e96) دون أي تعديل كود مكوّن، (ج) حساب السعر 100/150 لا يزال صحيحاً (Server Action لم يتأثر)، (د) صفر أخطاء console
- تحديث docs/ARCHITECTURE.md §2 (+ §2.1 جديد)، docs/UI_UX_SYSTEM.md §8/§2، docs/ROADMAP.md (اليوم 6 → DONE)
- حالة ADR-007 نفسها تبقى PROPOSED كما طلب المؤسس صراحة — لم تُغيَّر لـ ACCEPTED

## 2026-09-01 (اليوم 5) — واجهة العميل (Storefront)
- تأسيس Next.js الفعلي (لم يكن موجوداً رغم تثبيته يوم 0): next.config.ts, postcss.config.mjs (Tailwind v4 عبر @tailwindcss/postcss), src/app/layout.tsx + globals.css، أُضيفت scripts (dev/build/start) لـ package.json
- ADR-006: اعتماد ألوان الدستور (#2D6A4F, #F4845F) فعلياً لأول واجهة مستخدم
- إضافة src/app/page.tsx (الأقسام)، src/app/[category]/page.tsx (منتجات القسم)، src/app/product/[id]/page.tsx + actions.ts (تفاصيل + حساب سعر عبر Server Action)
- إضافة src/components/ (CategoryCard, ProductCard, ProductOptions)
- تحديث catalog.service.ts بدوال قراءة رقيقة (listCategories, getCategoryBySlug, listProductsByCategory, getProductById) حفاظاً على اتجاه الاعتماد الموثَّق (components → service → repository)
- تحقق فعلي عبر متصفح حقيقي (Playwright headless، لعدم توفر chromium-cli): المسار الكامل (أقسام → منتج → صغير=100 → كبير=150) يعمل، بلا أخطاء console
- next dev أضاف تلقائياً قسم توثيقي في AGENTS.md (يُعاد إنشاؤه تلقائياً، يُحتفَظ به) يشير لـ node_modules/next/dist/docs/ لأن Next.js 16 يتجاوز معرفة تدريب النموذج — تم فحص دليل الترقية للتأكد من توافق params/Server Actions قبل الاستمرار
- تحديث specs/catalog/SPEC.md (UX من UNKNOWN إلى IMPLEMENTED)، docs/UI_UX_SYSTEM.md، docs/DECISIONS.md

## 2026-09-01 — تنظيف: حذف ملفات مرجع سريع مكررة من الجذر
- حذف ARCHITECTURE.md, DATABASE.md, DOMAIN_MAP.md, ROADMAP.md, SECURITY.md من جذر المستودع (نسخ اليوم 0/1 المبسطة) — استُبدلت بالكامل بـ docs/*.md الرسمية
- حسم CONFLICT-004 في docs/DECISIONS.md بقرار صريح من المؤسس
- AGENTS.md وSALSABIL_CONSTITUTION.md بقيا في الجذر (غير مكررين مع docs/)

## 2026-09-01 (اليوم 4) — نطاق التاجر وتعدد المستأجرين (Merchant Domain & Multi-Tenancy)
- إنشاء جدول merchants + عمود products.tenant_id في Supabase
- إنشاء src/core/modules/merchant/ (types.ts, merchant.service.ts, merchant.repository.ts)
- تحديث src/core/modules/catalog/ (types.ts, catalog.repository.ts) لدعم tenantId وfindProductsByTenant
- تحقق فعلي: عزل تاجر وهمي (0 منتجات)، ربط منتج حقيقي بتاجر حقيقي، رفض جلسة تاجر آخر عبر canAccessTenant
- كتابة specs/merchant/SPEC.md رجعياً، تحديث specs/catalog/SPEC.md وdocs/DATABASE.md
- ملاحظة: specs/identity/SPEC.md وdocs/BUSINESS_RULES.md (BR-007..BR-011) لم يكونا موجودين في المستودع عند بدء اليوم 4، ووصلا لاحقاً ضمن نظام التوثيق أدناه

## 2026-09-01 — نظام التوثيق الرسمي (docs/, specs/, ideas/)
- إنشاء كامل نظام التوثيق: 15 ملفاً في docs/، بنية specs/، ideas/IDEAS.md وARCHIVED.md
- تسجيل 5 ADRs رجعية (ADR-001 إلى ADR-004 معتمدة، ADR-005 مقترحة)
- تسجيل 3 تعارضات (CONFLICT-001, 002, 003) — راجع docs/DECISIONS.md
- اعتماد 5 قواعد عدالة تجار جديدة (BR-007 إلى BR-011) بحالة ACCEPTED / FOUNDER_DECISION

## 2026-08-31 (اليوم 3) — محرك المنتج (Catalog)
- إنشاء جداول: categories, products (options JSONB), inventory
- إنشاء src/core/modules/catalog/ (types.ts, catalog.service.ts, catalog.repository.ts)
- ADR-004: قرار استخدام JSONB للخيارات المرنة بدل أعمدة ثابتة/EAV
- تحقق فعلي: حساب سعر دجاجة بأحجام مختلفة (100/150 جنيه) نجح

## 2026-08-31 (اليوم 2) — الاتصال الفعلي بـ Supabase
- إنشاء مشروع Supabase حقيقي
- إنشاء جدول users مع RLS (سياسة قراءة الذات فقط)
- إنشاء src/core/kernel/database/supabase-client.ts
- إنشاء src/core/kernel/khalil/khalil.repository.ts
- تحقق فعلي: رسالة نجاح الاتصال

## 2026-08-31 (اليوم 1) — Khalil Engine + ملفات الذاكرة
- إنشاء 6 ملفات ذاكرة أولية (AGENTS, ARCHITECTURE, DATABASE, SECURITY, DOMAIN_MAP, ROADMAP — نسخة مبسطة، استُبدلت لاحقاً بنظام التوثيق الكامل في 2026-09-01)
- إنشاء src/core/kernel/khalil/ (types.ts, khalil.service.ts)
- تحقق: npx tsc --noEmit بلا أخطاء

## 2026-08-31 (اليوم 0) — إعداد البيئة
- تثبيت Git, Node.js (LTS), VS Code
- إنشاء مستودع salsabil-core + GitHub repository
- إعداد Next.js + TypeScript + Tailwind الأساسي
