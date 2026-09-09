import { redirect } from 'next/navigation';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { changeAdminPasswordAction } from './actions';

export default async function AdminChangePasswordPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
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
      <ChangePasswordForm action={changeAdminPasswordAction} redirectTo="/admin/dashboard" />
    </main>
  );
}
