'use client';
// §31 بند 7 — نفس بنية MerchantLoginForm.tsx تماماً + حقل معرّف المتجر (slug) الإضافي المطلوب
// لحل سياق التاجر قبل التحقق (merchantStaff/types.ts: "الاستدعاء دائماً ضمن سياق تاجر واحد
// معروف مسبقاً").

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStaffAction } from '@/app/merchant/staff-login/actions';

export function MerchantStaffLoginForm() {
  const router = useRouter();
  const [merchantSlug, setMerchantSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const result = await loginStaffAction(merchantSlug, phone, password);

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.push(result.mustChangePassword ? '/merchant/change-password' : '/merchant/orders');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">معرّف المتجر</label>
        <input
          required
          value={merchantSlug}
          onChange={(e) => setMerchantSlug(e.target.value)}
          placeholder="مثال: pilot-merchant-01"
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
        {status === 'submitting' ? 'جارٍ الدخول...' : 'دخول'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
