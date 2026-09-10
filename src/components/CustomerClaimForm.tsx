'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { startClaimAction, confirmClaimAction } from '@/app/(reef)/account/claim/actions';

export function CustomerClaimForm() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await startClaimAction(phone);
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setChannel(result.channel);
    setStatus('idle');
    setStep('code');
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await confirmClaimAction({ phone, code, newPassword });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.push('/account');
    router.refresh();
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          أدخل رقم الهاتف المسجَّل لدينا مسبقاً (من طلب سابق كضيف مثلاً) — سنرسل رمز تحقق عبر واتساب.
        </p>
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
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'submitting' ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
        </button>
        {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
        <Link href="/account/login" className="text-center text-sm text-primary hover:underline">
          تذكَّرت كلمة المرور؟ سجّل الدخول
        </Link>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        أُرسل رمز مكوَّن من 6 أرقام إلى {phone} عبر {channel === 'whatsapp' ? 'واتساب' : 'رسالة نصية'}.
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">رمز التحقق</label>
        <input
          required
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-center text-lg tracking-widest text-foreground"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">كلمة مرور جديدة</label>
        <input
          required
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ التأكيد...' : 'تأكيد واسترجاع الحساب'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
