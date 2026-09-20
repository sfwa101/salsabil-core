'use client';
// §31 بند 7 — يعرض كلمة المرور المؤقتة مرة واحدة فقط بعد الإضافة (نفس نمط
// scripts/backfill-existing-owner-passwords.ts — لا تُخزَّن ولا تُعرَض ثانية بعد مغادرة الصفحة).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addStaffAction } from '@/app/merchant/staff/actions';

export function MerchantStaffAddForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    setCreatedPassword(null);

    const result = await addStaffAction({ fullName, phone });
    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    setStatus('idle');
    setCreatedPassword(result.tempPassword);
    setFullName('');
    setPhone('');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground">إضافة موظف جديد</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-muted-foreground">الاسم</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-muted-foreground">رقم الهاتف</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'submitting' ? 'جارٍ الإضافة...' : 'إضافة'}
        </button>
      </form>
      {status === 'error' && error && <span className="text-xs text-destructive">{error}</span>}
      {createdPassword && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium text-foreground">تمت الإضافة. كلمة المرور المؤقتة (أرسلها للموظف الآن، لن تظهر ثانية):</p>
          <p dir="ltr" className="mt-1 font-mono text-lg font-bold text-primary">
            {createdPassword}
          </p>
        </div>
      )}
    </div>
  );
}
