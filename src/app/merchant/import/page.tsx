import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMerchantSession } from '@/core/modules/merchant/merchant-session';
import { MerchantImportForm } from '@/components/MerchantImportForm';

export default async function MerchantImportPage() {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    redirect('/merchant/login');
  }
  if (session.mustChangePassword) {
    redirect('/merchant/change-password');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <h1 className="text-xl font-semibold text-foreground">استيراد الكتالوج</h1>
        <Link href="/merchant/orders" className="text-sm text-muted-foreground underline">
          → طلباتي
        </Link>
      </div>

      <MerchantImportForm />
    </main>
  );
}
