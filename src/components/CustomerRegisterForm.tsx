'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerCustomerAction } from '@/app/(reef)/account/register/actions';

export function CustomerRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    setAccountExists(false);

    const result = await registerCustomerAction({ fullName, phone, password });

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      setAccountExists(!!result.accountExists);
      return;
    }
    router.push('/account');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">الاسم</label>
        <input
          required
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">رقم الهاتف</label>
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
        {status === 'submitting' ? 'جارٍ الإنشاء...' : 'إنشاء حساب'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
      {accountExists && (
        <Link href="/account/claim" className="text-center text-sm text-primary hover:underline">
          هذا رقمك ولا تملك كلمة مرور؟ استرجع الحساب عبر رمز تحقق
        </Link>
      )}

      <Link href="/account/login" className="text-center text-sm text-primary hover:underline">
        لديك حساب بالفعل؟ سجّل الدخول
      </Link>
    </form>
  );
}
