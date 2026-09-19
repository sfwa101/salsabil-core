'use client';
// src/components/cartMutationGate.ts
// FIX-LIVE-BUG-SILENT-ADD-TO-CART-FAILURE — قفل تسلسل مشترك عبر كل مكوّنات السلة (ProductCard.tsx/
// ProductOptions.tsx/CartCapsule.tsx). السبب الجذري المُشخَّص حياً على dev (10/10 محاولة، منهجية:
// نقر "أضف للسلة" ثم فتح كبسولة السلة فوراً بلا انتظار): addToCartAction (كتابة cart_items) وقراءة
// السلة (getCartSummaryAction عبر CartCapsule.handleOpenSheet أو صفحة /cart) طلبان مستقلان تماماً
// بلا أي ترتيب مضمون بينهما — الكتابة تُؤكَّد فعلاً في قاعدة البيانات دائماً (cartRepository.insertItem
// مُنتظَرة بالكامل قبل عودة addToCartAction)، لكن قراءة مستقلة قد تصل وتُنفَّذ فعلياً على الخادم
// **قبل** وصول تلك الكتابة إطلاقاً إن أُطلِقت القراءة بالتوازي (لا بالتتابع) معها من نفس الجلسة —
// تحقُّق حي مباشر من قاعدة البيانات أثبت أن العنصر يصل فعلاً لكن بعد لحظات من قراءة فارغة سابقة.
// **هذا ليس تعطُّلاً للطلب (Abort) ولا تضارب توكن جلسة** — تحقَّقنا من كليهما حياً وانتفيا.
//
// الإصلاح: كل كتابة سلة تُسجَّل هنا فور بدئها؛ أي قراءة تُعرَض للعميل (فتح كبسولة السلة، أو التنقل
// الفعلي لصفحة /cart/checkout عبر الرابط داخل الكبسولة) تنتظر أولاً اكتمال أي كتابة سابقة معلَّقة من
// نفس الجلسة قبل إطلاق قراءتها الخاصة — يضمن ألا تسبق أي قراءة كتابة مُعلَّقة حقيقية لنفس المستخدم.
// قفل عملية واحدة (module-level) كافٍ هنا: نطاقه محصور بمتصفح الزائر نفسه (لا خادم متعدد الجلسات)،
// ومكوّنات السلة كلها 'use client' أصلاً — لا حاجة لتنسيق عبر الشبكة لضمان الترتيب داخل جلسة واحدة.

let pendingMutations: Promise<unknown> = Promise.resolve();

// يُستدعى حول كل addToCartAction/updateCartItemAction/removeCartItemAction فعلي من مكوّن عميل —
// يُبقي القفل "مشغولاً" طوال مدة الطلب بصرف النظر عن نجاحه أو فشله (catch يمنع كسر السلسلة لا أكثر).
export function trackCartMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = pendingMutations.then(mutation, mutation);
  pendingMutations = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

// يُستدعى قبل أي قراءة سلة تُعرَض للعميل مباشرة (فتح الكبسولة، التنقل لـ/cart أو /checkout) — لا قبل
// كل قراءة مطلقاً (عدّاد الهيدر الصامت مثلاً لا يحتاج هذا الضمان الصارم).
export function awaitPendingCartMutations(): Promise<void> {
  return pendingMutations.then(
    () => undefined,
    () => undefined
  );
}
