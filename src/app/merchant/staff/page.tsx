// src/app/merchant/staff/page.tsx
// §31 بند 7 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §5/§29 بند 8) — owner يضيف/يعطّل موظفي
// متجره من الواجهة. Backend جاهز بالكامل منذ TASK-14 (merchantStaffService) — عمل واجهة بحت.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { merchantService } from '@/core/modules/merchant/merchant.service';
import { merchantStaffService } from '@/core/modules/merchantStaff/merchantStaff.service';
import { khalilService } from '@/core/kernel/khalil/service';
import { MerchantStaffAddForm } from '@/components/merchant/MerchantStaffAddForm';
import { toggleStaffStatusFormAction } from './actions';

export default async function MerchantStaffPage() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    redirect('/merchant/login');
  }
  if (session.mustChangePassword) {
    redirect('/merchant/change-password');
  }
  // موظفو المتجر لا يملكون صلاحية إدارة موظفين آخرين — نفس التحقق المفروض أصلاً داخل
  // merchantStaffService.listStaffForTenant (دفاع مزدوج، لا اعتماد على طبقة واحدة).
  if (session.role !== 'merchant_owner') {
    redirect('/merchant/dashboard');
  }

  const [merchant, staffList] = await Promise.all([
    merchantService.findById(session.tenantId),
    merchantStaffService.listStaffForTenant({ role: session.role, tenantId: session.tenantId }, session.tenantId),
  ]);

  const staffUsers = await Promise.all(staffList.map((s) => khalilService.findUserById(s.userId)));
  const userById = new Map(staffUsers.filter((u) => u !== null).map((u) => [u!.id, u!]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">موظفو متجري</h1>
        <Link href="/merchant/dashboard" className="text-sm text-muted-foreground transition hover:text-primary">
          → لوحتي
        </Link>
      </div>

      {merchant && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          معرّف متجرك (شاركه مع موظفيك مع كلمة المرور المؤقتة — يحتاجونه لتسجيل الدخول من{' '}
          <span dir="ltr" className="font-mono">/merchant/staff-login</span>):{' '}
          <span dir="ltr" className="font-mono font-bold text-foreground">{merchant.slug}</span>
        </div>
      )}

      <MerchantStaffAddForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">القائمة الحالية ({staffList.length})</h2>
        {staffList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا يوجد موظفون بعد
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {staffList.map((staff) => {
              const user = userById.get(staff.userId);
              return (
                <li key={staff.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="font-medium text-foreground">{user?.fullName ?? 'مستخدم غير معروف'}</p>
                    <p dir="ltr" className="text-sm text-muted-foreground">{user?.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${staff.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {staff.isActive ? 'نشط' : 'معطَّل'}
                    </span>
                    <form action={toggleStaffStatusFormAction.bind(null, staff.id, !staff.isActive)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
                      >
                        {staff.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
