import { redirect } from 'next/navigation';
import { getDeliverySession } from '@/core/modules/delivery/delivery-session';
import { DeliveryLoginForm } from '@/components/delivery/DeliveryLoginForm';
import { loginOfficeAction } from './actions';

export default async function DeliveryOfficeLoginPage() {
  const session = await getDeliverySession();
  if (session) {
    redirect(session.mustChangePassword ? '/delivery/change-password' : '/delivery/office/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">دخول مكتب التوصيل</h1>
      <DeliveryLoginForm action={loginOfficeAction} successRedirect="/delivery/office/dashboard" changePasswordRedirect="/delivery/change-password" />
    </main>
  );
}
