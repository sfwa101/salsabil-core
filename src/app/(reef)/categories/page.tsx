// src/app/(reef)/categories/page.tsx
// وجهة تبويب "الأقسام" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS) — "الأحياء" هنا تعني كتالوج
// catalog_districts الحقيقي (TASK-18، 19 حياً مستورَداً في TASK-17)، لا جدول categories القديم
// (6 صفوف تجريبية) الذي كانت تستهلكه هذه الصفحة سابقاً. يعكس src/app/(reef)/[district]/page.tsx
// بنيوياً — يستهلك catalogService.getDistricts() الجديدة.
//
// RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS: حلقة الأفاتار تستهلك الآن
// src/config/neighborhood-identity-registry.ts (لون تمييز الحي إن وُجد، وإلا border-primary العام
// كما كانت) + رابط لصفحة العروض (/offers، RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS أيضاً).
// ⚠️ TASK-18: السجل مفتاحه slugs الأحياء القديمة (daily-food/produce/...) — لا حي جديد من الـ19
// يطابق مفتاحاً مسجَّلاً اليوم، فـgetNeighborhoodIdentity تُعيد null للجميع (توكنز الثيم العامة
// تُستخدَم بدل ذلك) — تدهور سلوك متوقَّع بالتصميم (راجع تعليق الملف نفسه)، لا خطأ.

import Link from 'next/link';
import { Tag } from 'lucide-react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';

export default async function CategoriesPage() {
  const districts = await catalogService.getDistricts();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">كل الأحياء</h1>
        <Link
          href="/offers"
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
        >
          <Tag size={16} />
          العروض
        </Link>
      </div>

      {districts.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أحياء بعد.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {districts.map((district) => {
            const identity = getNeighborhoodIdentity('reef', district.slug);
            return (
              <Link
                key={district.id}
                href={`/${district.slug}`}
                className="sb-press flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition hover:border-primary hover:shadow-[var(--sb-shadow-soft)]"
              >
                <span
                  className="animate-sb-scale-pop flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-muted text-lg font-semibold text-primary"
                  style={identity ? { borderColor: identity.accentColor, color: identity.accentColor } : undefined}
                >
                  {district.nameAr.charAt(0)}
                </span>
                <span className="font-medium text-card-foreground">{district.nameAr}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
