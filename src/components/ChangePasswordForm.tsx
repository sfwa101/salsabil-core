'use client';
// src/components/ChangePasswordForm.tsx — URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH
// مكوّن مشترك بين تاجر/إدارة (نفس نمط OrderRow.tsx: يقبل `action` كـ prop بدل استيراد Server
// Action محدَّد — راجع docs/design/COMPONENTS.md). لا يطلب كلمة المرور الحالية (الجلسة نفسها إثبات
// كافٍ — راجع specs/identity/PASSWORD_AUTH_SPEC.md §5)، فقط كلمة جديدة + تأكيدها.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ChangePasswordResult = { success: true } | { error: string };

export function ChangePasswordForm({
  action,
  redirectTo,
}: {
  action: (newPassword: string, confirmPassword: string) => Promise<ChangePasswordResult>;
  redirectTo: string;
}) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await action(newPassword, confirmPassword);

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">كلمة المرور الجديدة</label>
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">تأكيد كلمة المرور</label>
        <input
          required
          type="password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
