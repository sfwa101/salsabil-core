import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/core/modules/customer/customer-session';
import { CustomerLoginForm } from '@/components/CustomerLoginForm';

export default async function CustomerLoginPage() {
  const session = await getCustomerSession();
  if (session) {
    redirect('/account');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">تسجيل الدخول</h1>
      <CustomerLoginForm />
    </main>
  );
}
