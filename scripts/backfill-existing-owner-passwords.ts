// scripts/backfill-existing-owner-passwords.ts
// URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — سكربت مؤقت، يُشغَّل مرة واحدة، يُحذَف بعد الاستخدام
// (نفس نمط سكربتات التحقق المؤقتة الأخرى في هذا المشروع).
//
// ⚠️ إلزامي التشغيل *بعد* scripts/password-auth-schema.sql مباشرة، *قبل* نشر كود هذه الدفعة —
// وإلا يُقفَل فوراً على الحسابين التجريبيين (password_hash يبقى null = رفض دخول دائم، Fail Closed،
// راجع specs/identity/PASSWORD_AUTH_SPEC.md §4).
//
// يضبط كلمة مرور مؤقتة عشوائية لكل من: التاجر التجريبي (01000000000) وحساب platform_admin
// التجريبي (01000000001) — يطبعهما مرة واحدة فقط في الطرفية، لا تُخزَّنان نصاً صريحاً في أي مكان.
//
// تشغيل: npx tsx scripts/backfill-existing-owner-passwords.ts

import { khalilService } from '../src/core/kernel/khalil/service';
import { generateTempPassword } from '../src/core/kernel/security/password';

const ACCOUNTS = [
  { label: 'التاجر التجريبي (merchant_owner)', phone: '01000000000' },
  { label: 'مدير المنصة التجريبي (platform_admin)', phone: '01000000001' },
];

async function main() {
  for (const account of ACCOUNTS) {
    const user = await khalilService.findUserByPhone(account.phone);
    if (!user) {
      console.error(`❌ ${account.label} (${account.phone}) غير موجود — تأكَّد من تشغيل هذا ضد dev الصحيحة`);
      continue;
    }

    const tempPassword = generateTempPassword();
    await khalilService.setTemporaryPassword(user.id, tempPassword);

    console.log(`✅ ${account.label} | الهاتف: ${account.phone} | كلمة المرور المؤقتة: ${tempPassword}`);
  }

  console.log('\nلن تُطبَع كلمتا المرور أعلاه مرة أخرى — احفظهما الآن لاختبار تسجيل الدخول.');
}

main();
