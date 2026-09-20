import { redirect } from 'next/navigation';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { changeDeliveryPasswordAction } from './actions';

export default async function DeliveryChangePasswordPage() {
  const session = await getDeliverySession();
  if (!session) {
    redirect('/delivery/office/login');
  }
  if (!session.mustChangePassword) {
    redirect('/delivery/office/dashboard');
  }

  // بعد التغيير، الوجهة تعتمد على نوع الحساب (مالك مكتب أم سائق) — كلاهما يشترك بنفس آلية الجلسة.
  const [office, driver] = await Promise.all([
    deliveryService.getOfficeByOwnerId(session.userId),
    deliveryService.getDriverByUserId(session.userId),
  ]);
  const redirectTo = office ? '/delivery/office/dashboard' : driver ? '/delivery/driver/dashboard' : '/delivery/office/login';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">تغيير كلمة المرور (إلزامي)</h1>
      <ChangePasswordForm action={changeDeliveryPasswordAction} redirectTo={redirectTo} />
    </main>
  );
}
