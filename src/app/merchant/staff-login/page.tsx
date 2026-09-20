import { redirect } from 'next/navigation';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { MerchantStaffLoginForm } from '@/components/MerchantStaffLoginForm';

export default async function MerchantStaffLoginPage() {
  const session = await getMerchantSession();
  if (session) {
    redirect(session.mustChangePassword ? '/merchant/change-password' : '/merchant/orders');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">دخول موظف — بوابة التاجر</h1>
      <MerchantStaffLoginForm />
    </main>
  );
}
