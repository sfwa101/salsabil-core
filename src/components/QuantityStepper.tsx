// src/components/QuantityStepper.tsx
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — استُخرج من CartLineItem.tsx
// (كان markup الأزرار +/- مضمَّناً هناك مباشرة) ليصبح مكوّناً مشتركاً حقيقياً — بطاقة المنتج في صفحة
// الحي ([category]/page.tsx → ProductCard.tsx) تستهلك **نفس هذا المكوّن بالضبط**، لا نسخة موازية.
// لا منطق سلة هنا إطلاقاً — فقط markup + استدعاء الدالتين المُمرَّرتين.
//
// IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS — onDecrement/onIncrement لم تعودا Server Actions
// مربوطة عبر <form action> (القيد القديم بخصوص .bind() على Server Action مُصدَّرة لم يعد ينطبق).
// كلا مستهلكي هذا المكوّن (CartLineItem.tsx، ProductCard.tsx) أصبحا 'use client' صراحة يديران
// useOptimistic بأنفسهما (useOptimisticCartLine.ts) — الدالتان الآن closures عادية متزامنة (onClick)
// تُطلِق التحديث التفاؤلي فوراً، لا Promise يُنتظَر هنا. لا فرق بصري، فقط آلية النقر.
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantityStepperProps {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /**
   * 'separate' (افتراضي) — دائرتان مستقلتان، يطابق CartLineItem.tsx/ButcherSheet.tsx (مرجع Lovable،
   * FULL-VISUAL-PARITY-AUDIT-AND-FIX بند 4) — سياق سطر سلة واسع. 'pill' — كبسولة واحدة تحوي الزرين
   * والعدّاد، يطابق ProductCard.tsx (مرجع Lovable، COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS
   * بند 7) — سياق بطاقة شبكة مضغوطة. مرجعان مختلفان لسياقين مختلفين فعلياً في نفس مرجع Lovable
   * (ليس تناقضاً) — لا يُغيَّر الافتراضي حفاظاً على تطابق CartLineItem القائم فعلاً.
   */
  variant?: 'separate' | 'pill';
}

export function QuantityStepper({ quantity, onDecrement, onIncrement, variant = 'separate' }: QuantityStepperProps) {
  if (variant === 'pill') {
    return (
      <div className="flex h-9 items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-[var(--sb-shadow-pill)]">
        <Button
          type="button"
          onClick={onDecrement}
          aria-label="إنقاص"
          variant="ghost"
          size="icon"
          className="h-9 w-8 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Minus size={14} />
        </Button>
        <span className="min-w-[1ch] text-center text-sm font-bold tabular-nums text-white px-1.5">{quantity}</span>
        <Button
          type="button"
          onClick={onIncrement}
          aria-label="زيادة"
          variant="ghost"
          size="icon"
          className="h-9 w-8 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Plus size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" onClick={onDecrement} aria-label="إنقاص" variant="outline" size="icon" className="rounded-full shadow-sm">
        <Minus size={14} />
      </Button>
      <span className="min-w-[1.5ch] text-center text-sm tabular-nums text-gray-900 font-bold px-2">{quantity}</span>
      <Button type="button" onClick={onIncrement} aria-label="زيادة" variant="default" size="icon" className="rounded-full shadow-sm">
        <Plus size={14} />
      </Button>
    </div>
  );
}
