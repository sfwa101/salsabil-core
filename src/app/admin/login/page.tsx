import { redirect } from 'next/navigation';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { AdminLoginForm } from '@/components/AdminLoginForm';

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect(session.mustChangePassword ? '/admin/change-password' : '/admin/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-center text-xl font-semibold text-foreground">لوحة الإدارة — تسجيل الدخول</h1>
      <AdminLoginForm />
    </main>
  );
}
