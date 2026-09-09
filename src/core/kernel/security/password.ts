// src/core/kernel/security/password.ts
// تجزئة كلمة المرور — URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH (إغلاق DD-001، Guardian DEEP إلزامي)
// راجع specs/identity/PASSWORD_AUTH_SPEC.md §7 للتبرير الكامل.
//
// node:crypto المدمجة (scrypt) — بلا أي تبعية npm جديدة. بديل موصى به رسمياً في توثيق Node.js نفسه
// لتجزئة كلمات المرور؛ bcrypt كان سيحتاج تجميعاً أصلياً (native bindings) بمشاكل معروفة على Windows
// (بيئة التطوير الفعلية لهذا المشروع). timingSafeEqual يمنع هجوم توقيت (Timing Attack) عند المقارنة.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/** يُنتج سلسلة "ملح:تجزئة" (hex كلاهما) — تُخزَّن كاملة في users.password_hash عمود واحد. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/** يقارن كلمة مرور مُدخَلة بتجزئة مخزَّنة — timingSafeEqual لمقاومة هجوم التوقيت. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, 'hex');
  return derivedKey.length === storedBuffer.length && timingSafeEqual(derivedKey, storedBuffer);
}

// FIX-TIMING-ATTACK-VULNERABILITY-AUTH — تجزئة وهمية ثابتة (salt:hash بنفس تنسيق hashPassword()
// وKEY_LENGTH تماماً، مُولَّدة مسبقاً مرة واحدة بكلمة مرور عشوائية لا تطابق أي حساب حقيقي أبداً — لا
// تُغيَّر لاحقاً، القيمة نفسها لا تحمل أي حساسية لأنها ليست تجزئة حساب فعلي). تُستخدَم حصراً في
// khalilService.verifyPasswordForPhone لتنفيذ verifyPassword() فعلياً (تكلفة scrypt الحقيقية) في
// مساري not_found/no_password_set تماماً كما في wrong_password — بدون هذا، رفض فوري بلا حساب scrypt
// في مسارين مقابل حساب فعلي في الثالث يُنتج فرقاً زمنياً قابلاً للقياس يُعدّ به مهاجم أرقام هواتف
// تجار مسجَّلين (Guardian Review DEEP، PASSWORD_AUTH_SPEC.md §10). راجع تعليق verifyPasswordForPhone
// في khalil/service.ts للتفصيل الكامل لاستخدامها.
export const DUMMY_PASSWORD_HASH =
  '155c0b908ce3977378e278860b8fda58:20b3c31a11ec92e23efcf1cd92c770d73cfaa51020ed431c72ba0e5e0a25d9ca6107439a4c1198b6c9968206c23adf497d6002ea4565d248afd3fed425d005ac';

// بلا 0/O و1/l/I (تشابه بصري) — أسهل إملاءً عبر مكالمة/واتساب صوتي عند تبليغ تاجر بكلمة مرور مؤقتة
const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TEMP_PASSWORD_LENGTH = 10;

/** كلمة مرور مؤقتة عشوائية آمنة (crypto.randomBytes، لا Math.random) — للحسابات الجديدة/Backfill. */
export function generateTempPassword(): string {
  const bytes = randomBytes(TEMP_PASSWORD_LENGTH);
  return Array.from(bytes, (b) => TEMP_PASSWORD_CHARSET[b % TEMP_PASSWORD_CHARSET.length]).join('');
}
