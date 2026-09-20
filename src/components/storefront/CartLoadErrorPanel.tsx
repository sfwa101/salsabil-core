'use client';
// src/components/storefront/CartLoadErrorPanel.tsx
// TASK-03 (REEF_V1_MASTER_EXECUTION_PLAN.md Phase 1 #3، docs/audits/2026-09-14-reef-v1-engineering-
// audit.md §5/§19#3) — يظهر بدل DesktopCartSidebar في HomePage (page.tsx) عندما يفشل جلب ملخص السلة
// فعلياً، بدل عرض نفس حالة "السلة فارغة حالياً" (DesktopCartSidebar.tsx) خطأً على مستخدم لديه بنود
// حقيقية في سلته. لا تعديل على DesktopCartSidebar.tsx نفسه — خارج نطاق TASK-03 (عُولج في TASK-02).

import { useRouter } from 'next/navigation';
import { AlertTriangle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CartLoadErrorPanel() {
  const router = useRouter();

  return (
    <aside className="w-80 shrink-0 h-full flex flex-col bg-card rounded-xl shadow-sm border lg:my-4 overflow-hidden hidden lg:flex">
      <div className="p-4 shrink-0 border-b border-border bg-muted/30">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <ShoppingBag size={20} className="text-primary" />
          سلتك
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-4 px-4 py-10">
        <AlertTriangle size={48} className="opacity-20" />
        <p className="font-medium text-sm">تعذّر تحميل السلة</p>
        <Button variant="outline" onClick={() => router.refresh()} className="rounded-xl font-bold">
          إعادة المحاولة
        </Button>
      </div>
    </aside>
  );
}
