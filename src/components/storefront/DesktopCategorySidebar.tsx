'use client';
// TASK-18: كانت Category[] من جدول categories القديم — الآن District[] من catalog_districts
// (catalogService.getDistricts()، 19 حياً حقيقياً مستورَداً TASK-17).
//
// FULL-VISUAL-IMPORT-REMAINING-SURFACES (2026-09-22) — غلاف زجاجي (--sb-bg-glass/--sb-radius-3xl/
// --sb-shadow-apple-soft، نفس توكنز DesktopCartSidebar المجاورة له على نفس الصفحة) بدل bg-card
// المسطَّحة القديمة، وأفاتار حرف أول بتدرّج --sb-primary/--sb-accent (نفس أسلوب الفallback الذي
// أُضيف لـCategoryBarStem في الشريحة السابقة لنفس السبب: لا حقل صورة على District) بدل أيقونات
// lucide الثابتة (Store/Leaf/...) التي لا علاقة لها بمحتوى الحي فعلياً. زر العنوان يبقى غير تفاعلي
// كما كان (raison: منصة أحادية المدينة فعلياً — راجع تقرير المهمة، القرار نفسه من الشريحة السابقة).
import Link from 'next/link';
import type { District } from '@/core/modules/catalog/types';

interface DesktopCategorySidebarProps {
  districts?: District[];
  customerAddress?: string;
}

export function DesktopCategorySidebar({ districts = [], customerAddress }: DesktopCategorySidebarProps) {
  return (
    <aside className="sticky top-16 h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-lg)] rounded-[var(--sb-radius-3xl)] border border-border/40 shadow-[var(--sb-shadow-apple-soft)] hidden lg:flex">
      {/* Delivery Address Selector */}
      <button
        className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between group text-start w-full cursor-default"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">التوصيل إلى</span>
          <span className="font-bold text-sm text-foreground truncate max-w-[150px]">{customerAddress || 'المدينة المنورة'}</span>
        </div>
      </button>

      {/* District List */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col">
        {districts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            جاري التحميل...
          </div>
        ) : (
          districts.map((district) => (
            <Link
              key={district.id}
              href={`/${district.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
            >
              <div className="w-9 h-9 shrink-0 rounded-[var(--sb-radius-2xl)] flex items-center justify-center bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-accent)] overflow-hidden">
                <span className="text-sm font-black text-[var(--sb-primary-foreground)]">
                  {district.nameAr.charAt(0)}
                </span>
              </div>
              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                {district.nameAr}
              </span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
