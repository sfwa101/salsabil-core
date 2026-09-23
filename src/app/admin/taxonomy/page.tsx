// src/app/admin/taxonomy/page.tsx
// §31 بند 8 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §12/§29 بند 15) — CRUD حقيقي فوق
// catalog_districts/catalog_categories/catalog_subcategories من لوحة الإدارة، بدل سكريبتات SQL
// يدوية لمرة واحدة. كانت هذه الشجرة (المُستهلَكة فعلياً من واجهة العميل الحقيقية، TASK-18) بلا أي
// واجهة إدارية إطلاقاً — أي تغيير كان يتطلب مهندساً يكتب SQL مباشرة.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { TaxonomyDistrictCard } from '@/components/admin/TaxonomyDistrictCard';
import { TaxonomyAddDistrictForm } from '@/components/admin/TaxonomyAddDistrictForm';

export default async function AdminTaxonomyPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  if (session.mustChangePassword) {
    redirect('/admin/change-password');
  }

  const districts = await catalogService.listAllDistrictsForAdmin();

  // شجرة كاملة بجولة واحدة متوازية لكل مستوى — حجم الشجرة صغير (46 حياً كحد أقصى بعد دمج شجرة
  // المؤسس، راجع DD الجديد في docs/DECISIONS.md)، نفس تحفّظ findAllProducts الموثَّق أصلاً في الكود
  // ("لا خطر أداء اليوم... يُعاد تقييمه عند النمو الفعلي").
  const districtsWithCategories = await Promise.all(
    districts.map(async (district) => {
      const categories = await catalogService.listAllCategoriesForAdmin(district.id);
      const categoriesWithSubcategories = await Promise.all(
        categories.map(async (category) => ({
          category,
          subcategories: await catalogService.listAllSubcategoriesForAdmin(category.id),
        }))
      );
      return { district, categories: categoriesWithSubcategories };
    })
  );

  // للنقل بين الآباء (نقل قسم رئيسي لحي آخر، نقل قسم فرعي لقسم رئيسي آخر) — قائمة مسطَّحة صغيرة تكفي
  // لعناصر <select>، لا حاجة لجولة إضافية لكل عنصر شجرة.
  const allCategoriesFlat = districtsWithCategories.flatMap(({ district, categories }) =>
    categories.map(({ category }) => ({ id: category.id, nameAr: category.nameAr, districtNameAr: district.nameAr }))
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">إدارة الأحياء والأقسام</h1>
        <Link href="/admin/dashboard" className="text-sm text-muted-foreground underline">
          → لوحة الإدارة
        </Link>
      </div>

      <TaxonomyAddDistrictForm existingCount={districts.length} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-foreground">الأحياء ({districts.length})</h2>
        {districtsWithCategories.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد أحياء بعد</p>
        ) : (
          districtsWithCategories.map(({ district, categories }) => (
            <TaxonomyDistrictCard
              key={district.id}
              district={district}
              categories={categories}
              allDistricts={districts}
              allCategoriesFlat={allCategoriesFlat}
            />
          ))
        )}
      </section>
    </main>
  );
}
