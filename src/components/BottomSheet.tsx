'use client';
// src/components/BottomSheet.tsx
// مكوّن مشترك عام (اليوم 25) — نافذة سفلية منزلقة (Bottom Sheet) لأي محتوى، لا محتوى محدد سلفاً
// (حسب تأكيد المؤسس). مغلق افتراضياً، يُفتح/يُغلق بالكامل عبر props من المستدعي — لا حالة داخلية
// لفتح/إغلاق نفسه. الاستخدام المقصود لاحقاً (الأيام 26-27): تفاصيل وصفة (RecipeLink) أو عرض سريع
// لمنتج من خلاصة بيان — بلا ربط فعلي بأي منهما بعد.

import { useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div className="relative flex max-h-[85vh] flex-col gap-4 rounded-t-2xl border-t border-border bg-card p-5 shadow-xl">
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
    </div>
  );
}
