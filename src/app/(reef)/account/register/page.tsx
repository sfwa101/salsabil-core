import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/core/modules/customer/customer-session';
import { CustomerRegisterForm } from '@/components/CustomerRegisterForm';

export default async function CustomerRegisterPage() {
  const session = await getCustomerSession();
  if (session) {
    redirect('/account');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">إنشاء حساب جديد</h1>
      <CustomerRegisterForm />
    </main>
  );
}
