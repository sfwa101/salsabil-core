'use client';
// src/components/HeaderSearchBar.tsx
// شريط بحث مدموج في Header.tsx على الشاشات الكبيرة (اليوم 31، BAYAN-HOME-FEED-001) — يستبدل
// الحاجة لزر بحث منفصل في FeedTopBar.tsx من lg (1024px) فصاعداً (ذلك الزر يبقى ظاهراً أسفل lg،
// راجع FeedTopBar.tsx). لا وظيفة بحث حقيقية بعد — نفس نمط "قريباً" المستخدَم فعلياً في
// FeedTopBar.tsx/WorldSwitcher.tsx (لا محرك بحث مبني بعد، لا اختراع واجهة لقدرة غير موجودة).
//
// مكوّن Client صغير مُركَّب داخل Header.tsx (Server Component) — نفس نمط تركيب FeedTabBar (Client)
// داخل page.tsx (Server) في اليوم 26، التركيب لا يحوّل الأب إلى Client.

import { useState } from 'react';
import { Search } from 'lucide-react';

const TOAST_DURATION_MS = 2000;

export function HeaderSearchBar() {
  const [toast, setToast] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(true);
    window.setTimeout(() => setToast(false), TOAST_DURATION_MS);
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden flex-1 max-w-md lg:block">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
        <Search size={16} className="shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="ابحث في ريف المدينة..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {toast && (
        <span className="absolute inset-x-0 top-full z-10 mt-2 rounded-xl bg-foreground px-3 py-1.5 text-center text-xs font-medium text-background shadow-lg">
          البحث قريباً
        </span>
      )}
    </form>
  );
}
