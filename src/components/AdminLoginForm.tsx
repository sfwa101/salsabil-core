'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdminAction } from '@/app/admin/login/actions';

export function AdminLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await loginAdminAction(phone, password);

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.push(result.mustChangePassword ? '/admin/change-password' : '/admin/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">رقم هاتف مدير المنصة</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">كلمة المرور</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ الدخول...' : 'دخول'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
