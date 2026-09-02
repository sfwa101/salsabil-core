import { redirect } from 'next/navigation';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { MerchantLoginForm } from '@/components/MerchantLoginForm';

export default async function MerchantLoginPage() {
  const session = await getMerchantSession();
  if (session) {
    redirect('/merchant/orders');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">بوابة التاجر — تسجيل الدخول</h1>
      <MerchantLoginForm />
    </main>
  );
}
