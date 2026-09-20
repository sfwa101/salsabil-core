// src/app/delivery/office/dashboard/page.tsx
// §31 بند 9 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §7/§29 بند 9) — أول لوحة تحكم فعلية لمكتب
// توصيل. V1: طلبات جاهزة للإسناد (بلا خوارزمية ترشيح، إسناد يدوي بسيط)، قائمة سائقين + إضافة، رحلات
// المكتب + إسناد سائق.

import { redirect } from 'next/navigation';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { merchantService } from '@/core/modules/merchant/merchant.service';
import { khalilService } from '@/core/kernel/khalil/service';
import { DELIVERY_JOB_STATUS_LABELS_AR } from '@/core/modules/delivery/types';
import { DeliveryOfficeLogout } from '@/components/delivery/DeliveryOfficeLogout';
import { ReadySuborderRow } from '@/components/delivery/ReadySuborderRow';
import { DeliveryDriverAddForm } from '@/components/delivery/DeliveryDriverAddForm';
import { DeliveryJobRow } from '@/components/delivery/DeliveryJobRow';

export default async function DeliveryOfficeDashboardPage() {
  const session = await getDeliverySession();
  if (!session) {
    redirect('/delivery/office/login');
  }
  if (session.mustChangePassword) {
    redirect('/delivery/change-password');
  }

  const office = await deliveryService.getOfficeByOwnerId(session.userId);
  if (!office || !office.isActive) {
    redirect('/delivery/office/login');
  }

  const [candidates, drivers, jobs] = await Promise.all([
    deliveryService.listReadySuborderCandidates(),
    deliveryService.listDriversForOffice(office.id),
    deliveryService.listJobsForOffice(office.id),
  ]);

  const tenantIds = [...new Set(candidates.map((c) => c.tenantId))];
  const merchants = tenantIds.length > 0 ? await merchantService.getByIds(tenantIds) : [];
  const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

  const driverUsers = await Promise.all(drivers.map((d) => khalilService.findUserById(d.userId)));
  const driverNameById = new Map(drivers.map((d, i) => [d.id, driverUsers[i]?.fullName ?? 'سائق غير معروف']));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">{office.name}</h1>
        <DeliveryOfficeLogout />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">طلبات جاهزة للإسناد ({candidates.length})</h2>
        {candidates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد طلبات جاهزة الآن</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((c) => (
              <ReadySuborderRow key={c.id} suborderId={c.id} merchantName={merchantNameById.get(c.tenantId) ?? 'تاجر غير معروف'} total={c.total} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">سائقو المكتب ({drivers.length})</h2>
        <DeliveryDriverAddForm />
        {drivers.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {drivers.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-2 text-sm">
                <span>{driverNameById.get(d.id)}</span>
                <span className={d.isActive ? 'text-primary' : 'text-muted-foreground'}>{d.isActive ? 'نشط' : 'معطَّل'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">رحلات المكتب ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد رحلات بعد</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => (
              <DeliveryJobRow
                key={job.id}
                jobId={job.id}
                statusLabel={DELIVERY_JOB_STATUS_LABELS_AR[job.status]}
                driverName={job.driverId ? (driverNameById.get(job.driverId) ?? null) : null}
                availableDrivers={drivers.filter((d) => d.isActive).map((d) => ({ id: d.id, name: driverNameById.get(d.id) ?? 'سائق' }))}
                canAssign={job.status === 'ready_for_pickup'}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
