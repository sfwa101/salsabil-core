// src/components/QuantityStepper.tsx
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — استُخرج من CartLineItem.tsx
// (كان markup الأزرار +/- مضمَّناً هناك مباشرة) ليصبح مكوّناً مشتركاً حقيقياً — بطاقة المنتج في صفحة
// الحي ([category]/page.tsx → ProductCard.tsx) تستهلك **نفس هذا المكوّن بالضبط**، لا نسخة موازية.
// لا منطق سلة هنا إطلاقاً — فقط markup + استدعاء الدالتين المُمرَّرتين.
//
// ⚠️ onDecrement/onIncrement **يجب** أن تكونا مرجعاً مُقيَّداً (.bind()) لـServer Action مُصدَّرة
// فعلياً من ملف `'use server'` (مثال: `updateCartItemAction.bind(null, itemId, qty)`) — لا closure
// عادية مُعرَّفة محلياً حتى بلا توجيه 'use server'. السبب: ProductCard.tsx يُستهلَك أيضاً من
// PostCard.tsx ('use client') فيُصبح جزءاً من حزمة العميل عبر كل استخداماته في المشروع (تصنيف
// Next.js على مستوى الملف لا موضع الاستخدام) — تمرير closure عادية (غير Server Action معترَف بها)
// من مكوّن خادم إلى مكوّن أصبح عميلاً يفشل فعلياً وقت التصيير: "Functions cannot be passed directly
// to Client Components unless you explicitly expose it by marking it with 'use server'" — اكتُشف
// حياً، مُختبَر. `.bind()` على Server Action مُصدَّرة يبقى مُعترَفاً به عبر حدود الخادم/العميل (نمط
// React الموثَّق رسمياً لتمرير معطيات إضافية لفعل نموذج). عائد `.bind()` (Promise<ActionResult> لا
// Promise<void>) يُهمَل بأمان وقت التشغيل من React نفسه — التحويل النوعي أدناه صوري فقط.
import { Minus, Plus } from 'lucide-react';
import { CartActionButton } from '@/components/CartActionButton';

interface QuantityStepperProps {
  quantity: number;
  onDecrement: () => Promise<unknown>;
  onIncrement: () => Promise<unknown>;
}

export function QuantityStepper({ quantity, onDecrement, onIncrement }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <form action={onDecrement as () => void}>
        <CartActionButton ariaLabel="إنقاص" variant="outline" size="icon" className="rounded-full shadow-sm">
          <Minus size={14} />
        </CartActionButton>
      </form>
      <span className="min-w-[1.5ch] text-center text-sm font-bold tabular-nums text-foreground">{quantity}</span>
      <form action={onIncrement as () => void}>
        <CartActionButton ariaLabel="زيادة" variant="default" size="icon" className="rounded-full shadow-sm">
          <Plus size={14} />
        </CartActionButton>
      </form>
    </div>
  );
}
