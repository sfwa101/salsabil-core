import { redirect } from 'next/navigation';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { DeliveryLoginForm } from '@/components/delivery/DeliveryLoginForm';
import { loginDriverAction } from './actions';

export default async function DeliveryDriverLoginPage() {
  const session = await getDeliverySession();
  if (session) {
    redirect(session.mustChangePassword ? '/delivery/change-password' : '/delivery/driver/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">دخول السائق</h1>
      <DeliveryLoginForm action={loginDriverAction} successRedirect="/delivery/driver/dashboard" changePasswordRedirect="/delivery/change-password" />
    </main>
  );
}
