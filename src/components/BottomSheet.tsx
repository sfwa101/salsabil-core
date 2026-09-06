'use client';
// src/components/BottomSheet.tsx
// مكوّن مشترك عام (اليوم 25) — نافذة سفلية منزلقة (Bottom Sheet) لأي محتوى، لا محتوى محدد سلفاً
// (حسب تأكيد المؤسس). مغلق افتراضياً، يُفتح/يُغلق بالكامل عبر props من المستدعي — لا حالة داخلية
// لفتح/إغلاق نفسه.
//
// إصلاح اليوم 29: يُصيَّر الآن عبر createPortal إلى document.body مباشرة — بلا هذا، أي سلف يحمل
// خاصية CSS transform (مثل ScrollHideBar، اليوم 28) يُنشئ "containing block" جديداً لـ
// position:fixed فينحصر هذا العنصر داخل حدود ذلك السلف بدل تغطية الشاشة كاملة (اكتُشف حياً أثناء
// التحقُّق من مبدّل العوالم اليوم 29 — نافذة عناوين FeedTopBar، التي تستخدم هذا المكوّن نفسه، كانت
// قد انحصرت صامتة داخل ScrollHideBar منذ اليوم 28 بلا أي اختبار حي أعاد فتحها بعدها). Portal يفصل
// الشجرة البصرية عن أي سلف مُحوَّل (transformed) بصرف النظر عمن يستدعي هذا المكوّن مستقبلاً.
//
// اليوم 31 (Responsive Pass): نافذة سفلية بعرض كامل على الموبايل تبقى كما هي، لكن من md (768px)
// فصاعداً تتحوّل إلى Modal مُمركَز بعرض محدود (max-w-lg) — نفس نمط WorldSwitcher.tsx المُطبَّق فعلياً
// منذ اليوم 29 حرفياً (md:items-center/md:justify-center على الغلاف، md:rounded-2xl/md:border على
// اللوحة)، إعادة استخدام نمط قائم لا اختراع تصميم جديد.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div className="relative flex max-h-[85vh] w-full flex-col gap-4 rounded-t-2xl border-t border-border bg-card p-5 shadow-xl md:max-w-lg md:rounded-2xl md:border">
        <div className="flex items-center justify-between">
          {title ? <h2 className="text-lg font-medium text-card-foreground">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-xl border border-border px-3 py-1 text-sm text-muted-foreground transition hover:bg-muted"
          >
            إغلاق
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
