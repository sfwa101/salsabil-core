// scripts/create-merchant-account.ts
// URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — سكربت دائم (لا يُحذَف بعد الاستخدام، بعكس سكربتات
// التحقق المؤقتة) — ينشئ حساب تاجر (users + merchants معاً) أو حساب إدارة (users فقط) بكلمة مرور
// مؤقتة عشوائية، يطبعها مرة واحدة فقط لتُبلَّغ يدوياً عبر واتساب/مكالمة. راجع
// specs/identity/PASSWORD_AUTH_SPEC.md §6 للتصميم الكامل.
//
// ⚠️ ملاحظة معمارية: لا يستورد khalilService/merchantService (كلاهما يستوردان عبر
// khalilRepository/merchantRepository → src/core/kernel/database/supabase-admin-client.ts، المحمي
// بحزمة `server-only` — يرمي فوراً خارج سياق خادم Next.js حقيقي). نفس نمط
// scripts/seed-daily-food-demo-content.ts القائم بالضبط: عميل Supabase خاص بالسكربت مباشرة عبر
// @supabase/supabase-js، منطق الأعمال (تحقق الحقول، توليد/تجزئة كلمة المرور) مُكرَّر هنا بأقل قدر
// ممكن (password.ts وحدها آمنة للاستيراد المباشر — node:crypto بحتة، لا Supabase).
//
// استخدام — تاجر جديد:
//   npx tsx scripts/create-merchant-account.ts --role merchant_owner \
//     --business-name "اسم المحل" --phone 01xxxxxxxxx --slug unique-slug --commission-rate 10
//
// استخدام — حساب إدارة جديد (platform_admin):
//   npx tsx scripts/create-merchant-account.ts --role platform_admin \
//     --business-name "اسم المدير" --phone 01xxxxxxxxx

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

function getArg(name: string): string | undefined {
  const prefix = `--${name}`;
  const index = process.argv.indexOf(prefix);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const role = getArg('role') ?? 'merchant_owner';
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

  const { data: existing, error: findError } = await supabaseAdmin.from('users').select('id, role').eq('phone', phone).maybeSingle();
  if (findError) throw findError;
  if (existing) {
    console.error(`❌ رقم الهاتف ${phone} مسجَّل بالفعل (المستخدم ${existing.id}، الدور ${existing.role})`);
    process.exit(1);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({ full_name: businessName, phone, role, password_hash: passwordHash, must_change_password: true })
    .select('id')
    .single();
  if (userError) throw userError;

  if (role === 'merchant_owner') {
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: user.id,
        business_name: businessName,
        phone,
        slug,
        commission_rate: Number(commissionRateArg),
      })
      .select('id, business_name')
      .single();
    if (merchantError) throw merchantError;
    console.log(`✅ تاجر جديد: ${merchant.business_name} (${merchant.id})`);
  } else {
    console.log(`✅ حساب إدارة جديد: ${businessName} (${user.id})`);
  }

  console.log(`الهاتف: ${phone}`);
  console.log(`كلمة المرور المؤقتة: ${tempPassword}`);
  console.log('لن تُطبَع مرة أخرى — أبلغه الآن عبر واتساب/مكالمة، لا رسالة نصية غير مشفَّرة دائمة.');
}

main();
