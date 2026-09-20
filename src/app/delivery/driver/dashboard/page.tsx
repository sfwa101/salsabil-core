// src/app/delivery/driver/dashboard/page.tsx
// §31 بند 9 — لوحة السائق: رحلاته المُسنَدة (عنوان + تاجر + إجمالي) وأزرار تحديث الحالة.

import { redirect } from 'next/navigation';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { merchantService } from '@/core/modules/merchant/merchant.service';
import { DELIVERY_JOB_STATUS_LABELS_AR, DELIVERY_JOB_TRANSITIONS } from '@/core/modules/delivery/types';
import { DeliveryOfficeLogout } from '@/components/delivery/DeliveryOfficeLogout';
import { DriverJobCard } from '@/components/delivery/DriverJobCard';

export default async function DeliveryDriverDashboardPage() {
  const session = await getDeliverySession();
  if (!session) {
    redirect('/delivery/driver/login');
  }
  if (session.mustChangePassword) {
    redirect('/delivery/change-password');
  }

  const driver = await deliveryService.getDriverByUserId(session.userId);
  if (!driver) {
    redirect('/delivery/driver/login');
  }

  const jobs = await deliveryService.listJobsForDriver(driver.id);
  const jobsWithSuborders = await Promise.all(
    jobs.map(async (job) => {
      const suborders = await deliveryService.getSubordersForJob(job.id);
      return { job, suborders };
    })
  );

  const tenantIds = [...new Set(jobsWithSuborders.flatMap(({ suborders }) => suborders.map((s) => s.tenantId)))];
  const merchants = tenantIds.length > 0 ? await merchantService.getByIds(tenantIds) : [];
  const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">رحلاتي</h1>
        <DeliveryOfficeLogout />
      </div>

      {jobsWithSuborders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">لا توجد رحلات مُسنَدة لك بعد</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobsWithSuborders.map(({ job, suborders }) => (
            <DriverJobCard
              key={job.id}
              jobId={job.id}
              statusLabel={DELIVERY_JOB_STATUS_LABELS_AR[job.status]}
              nextStatuses={DELIVERY_JOB_TRANSITIONS[job.status].map((s) => ({ value: s, label: DELIVERY_JOB_STATUS_LABELS_AR[s] }))}
              suborders={suborders.map((s) => ({
                merchantName: merchantNameById.get(s.tenantId) ?? 'تاجر غير معروف',
                total: s.total,
                addressLine1: s.deliveryAddress.line1,
                addressCity: s.deliveryAddress.city,
              }))}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
