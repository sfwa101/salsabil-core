'use client';
// src/app/(reef)/CategoryBarNav.tsx
// VISUAL-PARITY-PASS (2026-09-22) — نظير RealCatalogShelfSDUI.tsx من ناحية الموقع (جذر (reef)،
// يُعاد استخدامه من أكثر من صفحة) لكن أبسط: CategoryBarStem بلا أي قدرة SDUI/backend جديدة — تصفح
// فئات حقيقي بالفعل (catalogService.getCategoriesForDistrict/getSubcategoriesForCategory، مُستهلَك
// أصلاً في [district]/page.tsx و[district]/[category]/page.tsx)، فقط يستبدل شبكة/chips قديمة بالـStem
// نفسه. onSelect محلي (useRouter().push) لا onAction/ApplicationRuntime — تنقل صفحة عادي، لا قدرة
// تُسجَّل، نفس مستوى بساطة أي <Link> عادي كان موجوداً قبله.
//
// CategoryStem.id يحمل slug القسم/القسم الفرعي هنا (لا id الحقيقي uuid) — id عند CategoryBarStem
// غير شفاف (React key + قيمة تُعاد في onSelect فقط)، وslug هو ما يحتاجه التنقل الفعلي، فلا حاجة لخريطة
// id→slug منفصلة.

import { useRouter } from 'next/navigation';
import { CategoryBarStem, type CategoryStem } from '@/components/ui/CategoryBarStem';

interface CategoryBarNavProps {
  items: CategoryStem[];
  basePath: string;
}

export function CategoryBarNav({ items, basePath }: CategoryBarNavProps) {
  const router = useRouter();
  return <CategoryBarStem categories={items} onSelect={(slug) => router.push(`${basePath}/${slug}`)} />;
}
