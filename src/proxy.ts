// src/proxy.ts
// يضمن وجود كوكي هوية السلة (sb_cart_session) قبل وصول الطلب لأي صفحة زائر (مجموعة (reef)) —
// FIX-LIVE-BUG-SILENT-ADD-TO-CART-FAILURE: كان النطاق مقصوراً على /cart و/checkout فقط، فتفتح نافذة
// سباق حقيقية على أي صفحة أخرى (الرئيسية/المنتج/الحي، كلها تحوي زر "أضف للسلة" عبر ProductCard):
// أول نقرة "أضف للسلة" لزائر بلا كوكي سابقة تستدعي getCartIdentity() (cart-session.ts) التي تُنشئ
// توكن عشوائي جديد بنفسها؛ لو تنقّل العميل فوراً بعدها لـ/cart (طبيعي جداً — واجهة "أُضيف للسلة ✓"
// تفاؤلية تظهر قبل اكتمال الطلب فعلياً) قبل وصول Set-Cookie الخاص بتلك النقرة للمتصفح، كان هذا
// الملف (proxy، يعمل فقط على /cart و/checkout) يرى طلب /cart بلا أي كوكي بعد فيصنع توكن **ثانٍ**
// مختلف تماماً — والمنتج المُضاف فعلاً يبقى "يتيماً" تحت التوكن الأول الذي خسر السباق. تحقَّق حياً
// (10/10 محاولة على dev): البند المُضاف موجود دائماً في قاعدة البيانات، لكن تحت سلة غير التي انتهى
// إليها كوكي المتصفح. توسيع المطابقة هنا لكل صفحات (reef) يضمن أن الكوكي موجود فعلياً في استجابة
// أول تحميل صفحة كاملة — أي *قبل* أن يصبح أي زر "أضف للسلة" قابلاً للنقر أصلاً — فلا يبقى موقع ثانٍ
// (غير cart-session.ts→getCartIdentity) قد يصنع توكناً مستقلاً بعد تلك اللحظة لنفس الزائر. مستثنى
// عمداً: /admin, /merchant (لا علاقة لهما بهوية سلة عميل), /api, وأصول Next الداخلية.
//
// اسم الملف/الدالة "proxy" لا "middleware" عمداً — اصطلاح "middleware" أُهمِل رسمياً في
// Next.js 16 (راجع node_modules/next/dist/docs/.../file-conventions/proxy.md، AGENTS.md).

import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { CART_COOKIE, CART_COOKIE_OPTIONS } from '@/core/modules/cart/cart-session';

export function proxy(request: NextRequest) {
  if (request.cookies.get(CART_COOKIE)) {
    return NextResponse.next();
  }

  const token = randomUUID();
  // يُكتَب على الطلب الممرَّر للعرض التالي حتى تراه صفحة /cart أو /checkout في نفس الجولة —
  // بلا هذا، تظل الكوكي غائبة عن cookies() داخل RSC رغم وجودها في استجابة المتصفح لاحقاً فقط.
  const requestHeaders = new Headers(request.headers);
  const existingCookieHeader = requestHeaders.get('cookie');
  requestHeaders.set(
    'cookie',
    existingCookieHeader ? `${existingCookieHeader}; ${CART_COOKIE}=${token}` : `${CART_COOKIE}=${token}`
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(CART_COOKIE, token, CART_COOKIE_OPTIONS);
  return response;
}

export const config = {
  matcher: ['/((?!api|admin|merchant|_next/static|_next/image|favicon.ico).*)'],
};
