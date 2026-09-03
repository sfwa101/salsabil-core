// src/proxy.ts
// يضمن وجود كوكي هوية السلة (sb_cart_session) قبل وصول الطلب لصفحتي /cart و/checkout —
// كلتاهما تعرضان الهوية أثناء عرض RSC مباشرة (لا عبر Server Action من نقرة عميل)، وNext.js
// يمنع كتابة الكوكيز في ذلك السياق (docs/DECISIONS.md → ADR-016، اليوم 14). النطاق مقصور على
// هاتين الصفحتين فقط عمداً — لا حاجة لفرض كوكي تتبّع على زائر يتصفح الكتالوج فقط بلا نية شراء
// (عدّاد الـHeader يقرأ بلا إنشاء، راجع cart-session.ts → getExistingCartSessionToken).
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
  matcher: ['/cart', '/checkout'],
};
