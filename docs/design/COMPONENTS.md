---
title: فهرس المكوّنات المشتركة — طبقة العرض
status: ACTIVE
version: 1.0
last_updated: 2026-09-08
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف (فهرس)، تعليقات كل ملف مكوّن (التفصيل الكامل — لا تكرار هنا)
---

# فهرس المكوّنات المشتركة — طبقة العرض

مرجع سريع لمسؤولية كل مكوّن مشترك حي بعد دفعة
`CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01`. التفصيل التقني الكامل يعيش في تعليق أعلى كل
ملف — هذا الفهرس لا يكرّره، فقط يوجّه إليه.

## الهيدر (Header.tsx)

Server Component، مركَّب في `src/app/(reef)/layout.tsx`. صفّان ملتصقان:

1. **صف علوي** (`flex justify-between`): `WorldSwitcher.tsx` (يمين) — `[العنوان + عنوان التوصيل]`
   (وسط، عمودي) — `CartCapsule.tsx` (يسار).
2. **صف سفلي**: `HeaderSearchBar.tsx` (عرض كامل، ظاهر دائماً).

| المكوّن | النوع | المسؤولية |
|---|---|---|
| `WorldSwitcher.tsx` | Client | مبدّل العوالم — بلا تعديل منطقي في هذه الدفعة (دمج بصري فقط) |
| `DeliveryAddressButton.tsx` | Client، جديد | عنوان التوصيل + `BottomSheet` اختيار — مستخرَج من `FeedTopBar.tsx` المحذوف |
| `CartCapsule.tsx` | Client، جديد | كبسولة السلة (`rounded-full`) + نبضة CSS عند زيادة العدّاد |
| `HeaderSearchBar.tsx` | Client | شريط بحث "قريباً" — أصبح ظاهراً على كل الأحجام (كان `lg:` فقط) |

**`FeedTopBar.tsx` حُذف بالكامل** — كان يحمل مبدّل العوالم + عنوان التوصيل (انتقلا للهيدر) + زر
باركود "قريباً" بلا وظيفة فعلية (أُسقط) + زر بحث موبايل مكرّر (لم يعد ضرورياً).

## الخلاصة (StoryBar / FeedTabBar / Feed)

| المكوّن | التغيير في هذه الدفعة |
|---|---|
| `StoryBar.tsx` | حلقة تدرّج لوني (`primary→accent`) + ظل حول كل Avatar حي |
| `FeedTabBar.tsx` | مبني الآن فوق `Button` (shadcn/ui)؛ التبويبات الأربعة تُقرأ من `content-type-registry.ts` |
| `Feed.tsx` | فلتر `postTypes?: PostType[]` (مصفوفة) بدل `postType?: PostType` مفرد — يدعم تبويباً مُجمَّعاً |

## الشريط السفلي (BottomNav.tsx)

عائم (هامش من الحواف، `rounded-full`، `shadow-lg`) بدل شريط كامل العرض. زر "الأقسام" الأوسط مرفوع
(`-mt-6`) وأكبر (`h-14 w-14`) بخلفية `bg-primary`. الأزرار الخمسة وترتيبها ومنطق التوست/الروابط بلا
تغيير — راجع `SALSABIL_CONSTITUTION.md §25.1`.

## البحث السريع

| أحتاج... | اذهب إلى |
|---|---|
| قيم الألوان لكل عالم | `docs/UI_UX_SYSTEM.md §8.4` |
| بنية Post/PostType الكاملة | `src/core/modules/bayan/types.ts` |
| سجل تبويبات المحتوى | `src/config/content-type-registry.ts`، `docs/design/CONTENT_MODEL.md` |
| مبدأ Bottom Sheet/Portal | تعليق أعلى `src/components/BottomSheet.tsx` |
