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
// ⚠️ ملاحظة معمارية: لا يستورد khalilService/khalilRepository (كلاهما يستوردان
// src/core/kernel/database/supabase-admin-client.ts، المحمي بحزمة `server-only` — يرمي فوراً خارج
// سياق خادم Next.js حقيقي). نفس نمط scripts/seed-daily-food-demo-content.ts القائم بالضبط: عميل
// Supabase خاص بالسكربت مباشرة عبر @supabase/supabase-js. password.ts وحدها آمنة للاستيراد
// المباشر هنا (node:crypto بحتة، لا Supabase).
//
// تشغيل: npx tsx scripts/backfill-existing-owner-passwords.ts

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');
const { hashPassword, generateTempPassword } = await import('../src/core/kernel/security/password');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase admin environment variables');
}
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const ACCOUNTS = [
  { label: 'التاجر التجريبي (merchant_owner)', phone: '01000000000' },
  { label: 'مدير المنصة التجريبي (platform_admin)', phone: '01000000001' },
];

async function main() {
  for (const account of ACCOUNTS) {
    const { data: user, error: findError } = await supabaseAdmin.from('users').select('id').eq('phone', account.phone).maybeSingle();
    if (findError) throw findError;
    if (!user) {
      console.error(`❌ ${account.label} (${account.phone}) غير موجود — تأكَّد من تشغيل هذا ضد dev الصحيحة`);
      continue;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash, must_change_password: true })
      .eq('id', user.id);
    if (updateError) throw updateError;

    console.log(`✅ ${account.label} | الهاتف: ${account.phone} | كلمة المرور المؤقتة: ${tempPassword}`);
  }

  console.log('\nلن تُطبَع كلمتا المرور أعلاه مرة أخرى — احفظهما الآن لاختبار تسجيل الدخول.');
}

main().catch((error) => {
  console.error('❌ فشل السكربت:', error);
  process.exit(1);
});
