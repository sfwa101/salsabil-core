import { redirect } from 'next/navigation';

// §31 بند 6 — الوجهة الافتراضية أصبحت لوحة أساسية (dashboard)، لا قفزاً مباشراً لقائمة الطلبات كما
// كانت (Journey B من تقرير التدقيق: "دخول→Dashboard→...").
export default function MerchantRootPage() {
  redirect('/merchant/dashboard');
}
