import { redirect } from 'next/navigation';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { changeMerchantPasswordAction } from './actions';

export default async function MerchantChangePasswordPage() {
  const session = await getMerchantSession();
  if (!session) {
    redirect('/merchant/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">تغيير كلمة المرور</h1>
        {session.mustChangePassword && (
          <p className="mt-2 text-sm text-muted-foreground">
            هذه كلمة مرور مؤقتة — يجب تغييرها قبل المتابعة.
          </p>
        )}
      </div>
      <ChangePasswordForm action={changeMerchantPasswordAction} redirectTo="/merchant/orders" />
    </main>
  );
}
