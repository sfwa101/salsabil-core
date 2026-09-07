// src/app/(reef)/help/page.tsx
// صفحة مساعدة ثابتة — RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS. محتوى وصفي بحت لسلوك حقيقي مطبَّق
// فعلياً في الكود (لا وعود بميزات غير موجودة): الدفع عند الاستلام هو التطبيق الفعلي الوحيد لواجهة
// PaymentProvider (src/core/modules/payments/cash-on-delivery.provider.ts)، تتبّع الطلب عبر رابط
// دائم بلا حساب (src/app/(reef)/order/[id]/page.tsx، ordersService.getOrderForCustomerView)، ولا
// نظام حسابات/تسجيل دخول للعميل حقيقي بعد (عميل ضيف دائماً).

import Link from 'next/link';
import { Truck, Wallet, MapPinned } from 'lucide-react';

const ITEMS = [
  {
    icon: Truck,
    title: 'كيف أتتبّع طلبي؟',
    body: 'بعد إتمام الطلب تصلك صفحة تتبّع خاصة به فوراً، ويُحفَظ رابطها تلقائياً على هذا الجهاز — ستجدها دوماً من تبويب "طلباتي" بلا حاجة لتسجيل دخول.',
  },
  {
    icon: Wallet,
    title: 'ما طرق الدفع المتاحة؟',
    body: 'الدفع عند الاستلام هو الطريقة المتاحة حالياً لكل الطلبات.',
  },
  {
    icon: MapPinned,
    title: 'هل أحتاج حساباً لأطلب؟',
    body: 'لا. يمكنك تصفّح الأحياء، إضافة منتجات للسلة، وإتمام الطلب كضيف بلا تسجيل.',
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:max-w-4xl xl:max-w-6xl">
      <Link href="/account" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → حسابي
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-foreground">المساعدة</h1>

      <div className="flex flex-col gap-3">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon size={18} />
              </span>
              <h2 className="font-medium text-card-foreground">{title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
