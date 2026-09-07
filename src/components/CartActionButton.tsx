'use client';
// src/components/CartActionButton.tsx
// FIX-DD-010-CART-QUANTITY-UI-STALE: تشخيص مُصحَّح — لا خلل Caching خاص بالإنتاج (تحقَّقتُ حياً:
// نفس الزمن تقريباً تحت next dev وnext start، والتحديث ينجح في الحالتين). السبب الفعلي: كل نقرة
// +/- تُشغِّل إعادة تصيير كاملة لصفحة /cart (التي أصبحت تجلب بيانات أكثر بعد REBUILD-CART-CHECKOUT
// — تجميع التاجر + رف "غالباً ما يُشترى معه") بلا أي مؤشر Pending أثناء الانتظار (~1-1.4 ثانية
// مقيسة حياً) — يبدو للمستخدم "متجمّداً" رغم أن التحديث ينجح فعلياً. هذا الغلاف يعرض مؤشراً بصرياً
// فورياً (useFormStatus، النمط القياسي لـServer Actions) أثناء معالجة النموذج المحيط تحديداً —
// بلا تحويل السلة بأكملها لمكوّن عميل، بلا تحديث متفائل (Optimistic) خارج نطاق هذه المهمة.

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button, type buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

interface CartActionButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export function CartActionButton({ children, ariaLabel, className, variant, size }: CartActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : children}
    </Button>
  );
}
