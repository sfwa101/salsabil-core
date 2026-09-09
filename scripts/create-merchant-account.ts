// scripts/create-merchant-account.ts
// URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — سكربت دائم (لا يُحذَف بعد الاستخدام، بعكس سكربتات
// التحقق المؤقتة) — ينشئ حساب تاجر (users + merchants معاً) أو حساب إدارة (users فقط) بكلمة مرور
// مؤقتة عشوائية، يطبعها مرة واحدة فقط لتُبلَّغ يدوياً عبر واتساب/مكالمة. راجع
// specs/identity/PASSWORD_AUTH_SPEC.md §6 للتصميم الكامل.
//
// استخدام — تاجر جديد:
//   npx tsx scripts/create-merchant-account.ts --role merchant_owner \
//     --business-name "اسم المحل" --phone 01xxxxxxxxx --slug unique-slug --commission-rate 10
//
// استخدام — حساب إدارة جديد (platform_admin):
//   npx tsx scripts/create-merchant-account.ts --role platform_admin \
//     --business-name "اسم المدير" --phone 01xxxxxxxxx

import { khalilService } from '../src/core/kernel/khalil/service';
import { merchantService } from '../src/core/modules/merchant/merchant.service';
import { generateTempPassword } from '../src/core/kernel/security/password';
import type { UserRole } from '../src/core/kernel/khalil/types';

function getArg(name: string): string | undefined {
  const prefix = `--${name}`;
  const index = process.argv.indexOf(prefix);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const role = (getArg('role') ?? 'merchant_owner') as UserRole;
  const businessName = getArg('business-name');
  const phone = getArg('phone');
  const slug = getArg('slug');
  const commissionRateArg = getArg('commission-rate');

  if (role !== 'merchant_owner' && role !== 'platform_admin') {
    console.error('❌ --role يجب أن يكون merchant_owner أو platform_admin');
    process.exit(1);
  }
  if (!businessName || !phone) {
    console.error('❌ --business-name و--phone إلزاميان');
    process.exit(1);
  }
  if (role === 'merchant_owner' && (!slug || !commissionRateArg)) {
    console.error('❌ --slug و--commission-rate إلزاميان لحساب merchant_owner');
    process.exit(1);
  }

  const existing = await khalilService.findUserByPhone(phone);
  if (existing) {
    console.error(`❌ رقم الهاتف ${phone} مسجَّل بالفعل (المستخدم ${existing.id}، الدور ${existing.role})`);
    process.exit(1);
  }

  const tempPassword = generateTempPassword();
  const user = await khalilService.createUser({ fullName: businessName, phone, role });
  await khalilService.setTemporaryPassword(user.id, tempPassword);

  if (role === 'merchant_owner') {
    const merchant = await merchantService.register({
      ownerId: user.id,
      businessName,
      phone,
      slug: slug!,
      commissionRate: Number(commissionRateArg),
    });
    console.log(`✅ تاجر جديد: ${merchant.businessName} (${merchant.id})`);
  } else {
    console.log(`✅ حساب إدارة جديد: ${businessName} (${user.id})`);
  }

  console.log(`الهاتف: ${phone}`);
  console.log(`كلمة المرور المؤقتة: ${tempPassword}`);
  console.log('لن تُطبَع مرة أخرى — أبلغه الآن عبر واتساب/مكالمة، لا رسالة نصية غير مشفَّرة دائمة.');
}

main();
