'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setMerchantActiveStatusAction } from '@/app/admin/dashboard/actions';

interface AdminMerchantRowProps {
  merchantId: string;
  businessName: string;
  phone: string;
  isActive: boolean;
}

export function AdminMerchantRow({ merchantId, businessName, phone, isActive }: AdminMerchantRowProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setPending(true);
    setError(null);
    const result = await setMerchantActiveStatusAction(merchantId, !isActive);
    setPending(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{businessName}</span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isActive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isActive ? 'نشط' : 'معطَّل'}
        </span>
      </div>
      <span className="text-sm text-muted-foreground" dir="ltr">
        {phone}
      </span>
      <button
        onClick={handleToggle}
        disabled={pending}
        className="self-start rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
      >
        {pending ? 'جارٍ التنفيذ...' : isActive ? 'تعطيل' : 'تفعيل'}
      </button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </li>
  );
}
