---
title: Spec — كلمة مرور حقيقية لدخول التاجر/الإدارة (إغلاق DD-001 / AUTH-SECURITY-BLOCKER)
status: DRAFT — بانتظار موافقة المؤسس (Spec-first، لا كود بعد)
version: 0.1
last_updated: 2026-09-08
owner: Claude (صياغة) + المؤسس (اعتماد)
source_of_truth: هذا الملف حتى الاعتماد، ثم الكود الفعلي بعد التنفيذ
---

# Spec — كلمة مرور حقيقية لدخول التاجر/الإدارة

> **قراءة إلزامية سابقة:** `AGENTS.md`، `docs/DECISIONS.md → DD-001`، `docs/SECURITY.md §1` (BLOCKER)،
> `ADR-012`، `ADR-013`، `ADR-014` (Rate Limiting/Audit القائمَين). هذا Spec لا يخترع شيئاً خارج ما
> تسمح به هذه الوثائق — أي انحراف عنها مذكور صراحة أدناه كـCONFLICT، لا حسماً صامتاً.

---

## 0. تصحيح صريح على نص المهمة (اقرأ هذا أولاً)

موجّه المهمة طلب: *"أضف عمود `password_hash` لجدول `merchants`"*. **هذا غير صحيح معمارياً في
هذا الكود تحديداً** — يجب تصحيحه صراحة بدل تنفيذه حرفياً (`AGENTS.md §6`، Context Integrity Check):

- تسجيل دخول التاجر اليوم (`ADR-012`) يبحث بالهاتف **الشخصي لمالك التاجر** في جدول `users` (دور
  `merchant_owner`)، **لا** `merchants.phone` (هاتف العمل التجاري). `merchants` جدول "كيان تجاري"
  (اسم، عمولة، حالة تفعيل) — لا هوية دخول له بحد ذاته.
- نفس الشيء بالضبط لتسجيل دخول الإدارة (`ADR-013`): يبحث بالهاتف في `users` (دور `platform_admin`).
- **إذاً:** `password_hash` يجب أن يكون عموداً على `users`، لا `merchants` — نفس مكان `phone`/`role`
  المستخدَمين فعلياً في كلا تدفقَي الدخول اليوم. هذا أيضاً يعني: **آلية واحدة مشتركة تماماً لكلا
  التاجر والإدارة** (نفس الجدول، نفس دالة التحقق، نفس منطق تغيير كلمة المرور) — لا تطبيقان منفصلان،
  فقط اختلاف أي Cookie/Session يُنشَأ بعد نجاح الدخول (كما هو الحال اليوم تماماً بين
  `MerchantService.loginOwnerByPhone`/`AdminService.loginByPhone`).
- `sessions` **تحتاج فعلاً** عموداً جديداً (`must_change_password`) — لكن لسبب مختلف: ليس لتخزين كلمة
  المرور، بل لتذكّر (لحظة إنشاء الجلسة) هل يجب إجبار المستخدم على تغييرها قبل أي استخدام آخر، بلا
  حاجة لقراءة `users` من جديد في كل طلب لاحق (تفصيل §3 أدناه).

---

## 1. Purpose

إغلاق `DD-001`/`INV-AUTHN-001` (`BLOCKER`, `HIGH`) — منع انتحال هوية تاجر/إدارة كاملة عبر معرفة رقم
هاتف نشط فقط، قبل استقبال 70 تاجراً حقيقياً (`docs/ROADMAP.md → 🚨 أولوية عاجلة`).

## 2. Problem

اليوم: أي طرف يعرف هاتف تاجر أو إدارة نشط يسجّل دخوله بالكامل — لا فحص هوية ثانٍ إطلاقاً. مقبول
صراحة **لتجربة تاجر واحد** (`ADR-012`)، **غير مقبول** لـ70 تاجراً حقيقياً (سطح هجوم يتضاعف 70 مرة،
وأرقام هواتف تجار قد تُشارَك مع موظفين/شركاء بحسن نية، فتتحوّل لصلاحية كاملة بلا قصد).

## 3. Scope (هذه الدفعة فقط — لا أكثر)

✅ **داخل النطاق:**
1. عمودان جديدان على `users`: `password_hash text` (nullable)، `must_change_password boolean not
   null default false`.
2. عمود جديد على `sessions`: `must_change_password boolean not null default false` (نسخة عند لحظة
   إنشاء الجلسة، لا مصدر حقيقة دائم — `users.must_change_password` هو المصدر الحقيقي).
3. تجزئة كلمة المرور عبر `node:crypto` المدمجة (`scrypt` + ملح عشوائي لكل كلمة مرور) — **لا تبعية
   npm جديدة** (`bcrypt` كان سيحتاج تجميعاً أصلياً/native bindings، مشاكل معروفة على Windows تحديداً
   — بيئة تطوير هذا المشروع فعلياً؛ `scrypt` المدمج موصى به من توثيق Node نفسه لهذا الغرض بالضبط،
   بلا أي تثبيت إضافي). راجع §7 للتفصيل التقني الكامل.
4. تدفق دخول موحَّد (تاجر + إدارة، نفس المنطق): هاتف + كلمة مرور معاً → رفض فوري وموحَّد الرسالة
   (بلا تمييز "هاتف خطأ" عن "كلمة مرور خطأ" — يمنع تسريب معلومة، نفس مبدأ الرفض الصامت الحالي في
   `loginOwnerByPhone`) عند أي فشل.
5. إجبار تغيير كلمة المرور عند أول دخول (`must_change_password=true`) — صفحة/فعل جديد لكل من
   التاجر والإدارة، يمنع الوصول لأي صفحة أخرى حتى يُغيَّر.
6. سكربت جديد (`scripts/create-merchant-account.ts`، نمط `scripts/seed-*.ts` القائم حرفياً) — ينشئ
   `users` (دور `merchant_owner`) + `merchants` معاً بكلمة مرور مؤقتة عشوائية، يطبعها **مرة واحدة**
   في الطرفية (Console) لتُبلَّغ يدوياً عبر واتساب/مكالمة — **لا تُخزَّن نصاً صريحاً في أي مكان**، ولا
   بريد إلكتروني تلقائي (غير موجود بعد، مطابق لتعليمات الموجّه صراحة).
7. نفس السكربت (بمعامل `--role platform_admin`) لحساب الإدارة الجديد (رقمك أنت).
8. Rate Limiting الموجود فعلاً (`ADR-014`, 5 محاولات/15 دقيقة لكل هاتف) يبقى كما هو — يُطبَّق الآن
   على فشل الهاتف **أو** كلمة المرور معاً (نفس المفتاح، لا تغيير في `rate-limit.ts` نفسه).
9. تسجيل تدقيق (`audit_log`, `ADR-014`) لعملية تغيير كلمة المرور (`auth.password_changed`) — نفس
   نمط `auth.login_success`/`auth.login_failed` القائم.

❌ **خارج النطاق صراحة (لا يُبنى الآن):**
- OTP أو أي قناة تحقق ثانية (SMS/WhatsApp API حقيقي) — مذكور صراحة في الموجّه كمرفوض للسرعة.
- Supabase Auth الكاملة — نطاق أكبر بكثير، قرار منفصل موثَّق أصلاً كـ`PROPOSED` (`docs/SECURITY.md
  §1`).
- "نسيت كلمة المرور" (Self-service reset) — لا قناة تحقق هوية ثانية موجودة لبنائه بأمان الآن (يحتاج
  SMS/OTP فعلياً، وهذا خارج النطاق أعلاه). **البديل المؤقت المقترح:** المؤسس (عبر `service_role`
  مباشرة أو سكربت مصغّر لاحق) يعيد تعيين كلمة مرور مؤقتة يدوياً لأي تاجر ناسٍ، بنفس آلية الإنشاء —
  **هذا يحتاج قراراً صريحاً منك أدناه (سؤال مفتوح 1)**، لا افتراضاً.
- واجهة إدارية (UI) لإنشاء تاجر جديد — سكربت CLI فقط لهذه الدفعة (أسرع للـ70 تاجراً من بناء نموذج
  إدارة كامل الآن؛ **فجوة موثَّقة**، لا حل نهائي — راجع Open Questions).
- قفل موزَّع لـRate Limiting (`DD-002`) — بند منفصل تماماً، غير مرتبط بهذه المهمة.
- الكتالوج الموحَّد / الاستيراد الجماعي (`IDEA-004`) — مهام منفصلة صراحة حسب طلبك السابق.

---

## 4. بنية الجدول الدقيقة (SQL — تنفيذ يدوي عبر Supabase SQL Editor، نفس عُرف كل DDL سابق في هذا المشروع، لا نظام Migrations رسمي بعد)

```sql
-- users: عمودان جديدان، كلاهما nullable/بقيمة افتراضية آمنة — لا Backfill إجباري فوري على مستوى DB
alter table users add column password_hash text;
alter table users add column must_change_password boolean not null default false;

-- sessions: نسخة "هل يجب تغيير كلمة المرور" وقت إنشاء الجلسة — القراءة اللاحقة (كل طلب) من sessions
-- لا من users، لتفادي استعلام إضافي على كل طلب محمي
alter table sessions add column must_change_password boolean not null default false;
```

**لماذا `password_hash` بلا `not null`:** الحسابان الوحيدان الموجودان اليوم (تاجر تجريبي + إدارة
تجريبية) لا يملكان كلمة مرور بعد — فرض `not null` يكسرهما فوراً عند الـ`ALTER`. القاعدة الآمنة بدلاً
من قيد DB: **منطق التطبيق يرفض أي محاولة دخول بكلمة مرور لمستخدم `password_hash is null`** (نفس نمط
الرفض الصامت الموحَّد — لا فرق بينه وبين "كلمة مرور خطأ" من منظور المهاجم). هذا **Fail Closed**
حرفياً (`AGENTS.md §8`) بلا حاجة لقيد DB إضافي. **لكن عملياً:** يجب تشغيل السكربت (§6) على الحسابين
التجريبيين الموجودين *قبل* نشر هذا الكود، وإلا يُقفَل عليهما فوراً بلا كلمة مرور — مُدرَج صراحة في
خطوات الطرح (§9).

---

## 5. تدفق تسجيل الدخول الجديد (تاجر وإدارة — نفس المنطق حرفياً)

```
1. المستخدم يُدخِل: رقم الهاتف + كلمة المرور
2. Server Action (loginMerchantAction/loginAdminAction، بلا تغيير في الاسم/الموقع):
   a. egyptianPhoneSchema.safeParse(phone) — كما هو اليوم، بلا تغيير
   b. passwordSchema.safeParse(password) — جديد (الحد الأدنى: 8 أحرف، لا قواعد تعقيد إضافية
      إلزامية — راجع سؤال مفتوح 2)
   c. isRateLimited(`merchant:${phone}` أو `admin:${phone}`) — كما هو اليوم، بلا تغيير في rate-limit.ts
   d. service.loginOwnerByPhone(phone, password) / service.loginByPhone(phone, password):
      - يبحث المستخدم بالهاتف (كما اليوم)
      - يتحقق الدور الصحيح (merchant_owner / platform_admin، كما اليوم)
      - **جديد:** إن كان password_hash = null → فشل (نفس رسالة الفشل الموحَّدة، لا تمييز)
      - **جديد:** verifyPassword(password, user.passwordHash) عبر scrypt+timingSafeEqual — فشل
        بنفس الرسالة الموحَّدة إن لم تتطابق
      - (تاجر فقط) يتحقق التاجر مرتبط ونشط — كما اليوم
      - عند النجاح: createSession(..., mustChangePassword: user.mustChangePassword) — الحقل
        الجديد الوحيد الفعلي في التوقيع
   e. عند الفشل (أي سبب من الأعلى): recordFailedAttempt + رسالة موحَّدة واحدة ("رقم الهاتف أو كلمة
      المرور غير صحيحة") — **تغيير طفيف عن رسالة اليوم** ("رقم الهاتف غير مسجَّل...") لأنها كانت
      تسرّب معلومة "الهاتف مسجَّل لكن ليس تاجراً" ضمنياً؛ الرسالة الموحَّدة الجديدة أكثر أماناً وتُعلَن
      صراحة هنا كتغيير سلوك ملحوظ (`AGENTS.md §13`)
   f. عند النجاح: clearAttempts + setSessionCookie(token) — كما اليوم
   g. **جديد:** إن كانت session.mustChangePassword === true → redirect('/merchant/change-password')
      بدل `/merchant/orders` (أو `/admin/change-password` بدل `/admin/dashboard`)
3. صفحة/فعل تغيير كلمة المرور الإجباري (جديد، مشترك تصميماً بين تاجر/إدارة):
   a. يتطلب جلسة صالحة فقط (المستخدم مسجَّل دخول بالفعل بكلمة المرور المؤقتة) — لا يطلب كلمة المرور
      القديمة مرة أخرى (عبء إضافي بلا فائدة أمنية حقيقية هنا، الجلسة نفسها إثبات كافٍ)
   b. كلمة مرور جديدة + تأكيدها (تطابق حرفي، ≥ 8 أحرف)
   c. hashPassword(newPassword) → khalilService.setNewPassword(userId, hash) — يحدّث
      users.password_hash + users.must_change_password=false في عملية واحدة
   d. auditService.log({ action: 'auth.password_changed', ... })
   e. destroySession(currentToken) + createSession(..., mustChangePassword: false) — جلسة جديدة
      نظيفة بدل تعديل الجلسة القديمة (يعيد استخدام destroySession/createSession الموجودتين حرفياً،
      صفر دالة repository جديدة لـsessions تحديداً)
   f. redirect للوجهة الطبيعية (/merchant/orders أو /admin/dashboard)
4. حماية الصفحات المحمية (merchant/orders، admin/dashboard):
   سطر واحد إضافي في كل صفحة: إن كانت session.mustChangePassword === true → redirect لصفحة تغيير
   كلمة المرور (بدل عرض المحتوى) — نفس نمط فحص `if (!session) redirect(...)` الموجود فعلياً في هاتين
   الصفحتين اليوم، لا طبقة Middleware جديدة.
```

**رفض موحَّد الرسالة — لماذا مهم:** لو ميّزنا رسالة "هاتف غير مسجَّل" عن "كلمة مرور خاطئة"، يستطيع
مهاجم تعداد أرقام هواتف تجار حقيقيين (Enumeration Attack) بلا حتى معرفة كلمة مرور واحدة. هذا تحسين
أمني حقيقي على السلوك الحالي، لا مجرد إعادة صياغة.

---

## 6. كيف تُنشئ حساب تاجر جديد بكلمة مرور مؤقتة (سكربت جديد)

`scripts/create-merchant-account.ts` — نفس عُرف `scripts/seed-*.ts` القائم (تشغيل يدوي عبر
`npx tsx scripts/create-merchant-account.ts`)، **دائم لا مؤقت** (يُستخدَم 70 مرة قريباً، ثم مستقبلاً
لكل تاجر جديد حتى تُبنى واجهة إدارة حقيقية — لا يُحذَف بعد الاستخدام كسكربتات التحقق المؤقتة).

```
المدخلات (CLI args أو ملف JSON/CSV لدفعة — التفصيل الدقيق قرار تنفيذي بسيط، لا حاجة لحسمه في
Spec؛ الأهم اليوم: يعمل لحساب واحد يدوياً 70 مرة إن لزم، بلا تعقيد إضافي):
  --business-name "اسم المحل"
  --phone "01xxxxxxxxx"     (هاتف مالك التاجر الشخصي — نفس هاتف تسجيل الدخول)
  --slug "unique-slug"
  --commission-rate 10
  --role merchant_owner     (أو platform_admin لحساب إدارة، بلا --business-name/--slug/--commission-rate عندها)

الخطوات داخلياً (كل خطوة تعيد استخدام قدرة موجودة فعلياً — صفر تكرار):
  1. generateTempPassword() — 10 محارف عشوائية آمنة (node:crypto.randomBytes)، مجموعة أحرف تستبعد
     المتشابه بصرياً (0/O، 1/l/I) — أسهل إملاءً عبر مكالمة/واتساب صوتي
  2. hashPassword(tempPassword) — scrypt (§7)
  3. khalilRepository.createUser({ fullName: businessName, phone, role }) + تحديث فوري
     لـpassword_hash/must_change_password=true (توسيع بسيط لـcreateUser لقبول هذين الحقلين
     اختيارياً — الاستدعاءات الحالية الأخرى، مثل findOrCreateCustomerByPhone، لا تمرّرهما فتبقى
     كما هي بلا كسر)
  4. إن كان role=merchant_owner: merchantRepository.create({ ownerId: user.id, businessName, phone,
     slug, commissionRate }) — نفس الدالة الموجودة فعلياً، بلا أي تعديل عليها
  5. console.log الأخير فقط (لا console.log وسيطة قد تُسجَّل في نظام مراقبة خارجي لاحقاً):
     "التاجر: {businessName} | الهاتف: {phone} | كلمة المرور المؤقتة: {tempPassword} — أبلغه الآن،
     لن تُطبَع مرة أخرى."
```

**للحسابين التجريبيين الموجودين فعلياً اليوم (لا يُنسيا):** يُشغَّل سكربت صغير مستقل
(`scripts/backfill-existing-owner-passwords.ts`، مؤقت — يُحذَف بعد الاستخدام مرة واحدة، نفس نمط
سكربتات التحقق المؤقتة) على التاجر التجريبي + حساب `platform_admin` التجريبي **قبل** نشر هذا الكود،
وإلا يُقفَل عليهما فوراً (`password_hash is null` = رفض دخول دائم، §4).

---

## 7. التفصيل التقني — تجزئة كلمة المرور (بلا تبعية جديدة)

`src/core/kernel/security/password.ts` (جديد، بجانب `rate-limit.ts` في نفس المجلد):

```ts
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, 'hex');
  return derivedKey.length === storedBuffer.length && timingSafeEqual(derivedKey, storedBuffer);
}

export function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // بلا 0/O/1/l/I
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}
```

**لماذا `scrypt` لا `bcrypt`:** موثَّق رسمياً في توثيق Node.js نفسه كنمط تجزئة كلمات مرور آمن جاهز
بلا أي تبعية خارجية. `bcrypt` (مكتبة `bcrypt`/`bcryptjs`) كانت ستضيف تبعية npm جديدة (`bcrypt` تحديداً
يحتاج تجميع native، مشاكل معروفة على Windows — بيئة التطوير الفعلية لهذا المشروع). `timingSafeEqual`
يمنع هجوم توقيت (Timing Attack) عند المقارنة — تفصيل أمني حقيقي، لا زخرفة.

---

## 8. Complexity Budget (الإعلان المسبق، `AGENTS.md §4`)

| البند | التقدير |
|---|---|
| ملفات جديدة | ~7 (`password.ts`، سكربتا الإنشاء/الـBackfill، صفحة+فعل تغيير كلمة مرور ×2 (تاجر/إدارة) أو مكوّن مشترك واحد + صفحتان رقيقتان، هذا Spec) |
| ملفات مُعدَّلة | ~10 (`types.ts`، `khalil.repository.ts`، `khalil.service.ts`، `merchant.service.ts`، `admin.service.ts`، `schemas.ts`، فعلا الدخول ×2، نموذجا الدخول ×2 (إضافة حقل كلمة مرور)، صفحتا `orders`/`dashboard` (سطر حراسة واحد)) |
| LOC تقريبية | +350 إلى +450 (أغلبها منطق تحقق/تجزئة صغير مكرَّر مرتين بتماثل تام تاجر/إدارة — لا منطق معقد جديد) |
| تبعيات جديدة | **صفر** (`node:crypto` مدمجة) |
| جداول DB جديدة | 0 (تعديل أعمدة فقط على `users`/`sessions` الموجودين) |
| أعمدة جديدة | 3 (`users.password_hash`, `users.must_change_password`, `sessions.must_change_password`) |
| Endpoints/Actions جديدة | ~4 (`changeMerchantPasswordAction`, `changeAdminPasswordAction` — أو فعل مشترك واحد بمعامل نوع الجلسة) |

---

## 9. خطوات الطرح (Rollout Order — إلزامي بهذا الترتيب)

1. تشغيل SQL (§4) على `dev` (Supabase SQL Editor، يدوي كالمعتاد).
2. تشغيل `backfill-existing-owner-passwords.ts` على الحسابين التجريبيين الموجودين — **قبل** الخطوة 3.
3. دمج الكود (بعد Guardian Review DEEP، §10).
4. تشغيل `create-merchant-account.ts` لكل تاجر من الـ70 (يدوياً أو بدفعة من ملف واحد — تفصيل تنفيذي).
5. **تكرار كل خطوات 1-2 على `staging`/الإنتاج الحقيقي** قبل تفعيل الدخول الجديد هناك (نفس فجوة
   Migrations الموثَّقة أصلاً، `docs/SECURITY.md OPEN_QUESTIONS بند 8` — لا حل جديد لها هنا).

---

## 10. Guardian Review — إلزامي (`AGENTS.md §17`)

**النطاق:** Authentication → شدة **DEEP** افتراضياً حسب جدول Guardian Matrix، ولا مبرر لتخفيضها هنا
(تغيير كامل لآلية دخول تاجر/إدارة، لا تعديل سطحي). يجب أن يشمل Guardian Review تحديداً:
- التحقق من عدم تسرّب `password_hash` في أي استجابة/سجل/رسالة خطأ.
- التحقق من أن `timingSafeEqual` تُستخدَم فعلياً (لا `===` على السلاسل النصية).
- محاولة استغلال حية: دخول بكلمة مرور خاطئة يعطي نفس زمن استجابة تقريبي لدخول بهاتف غير موجود
  (مقاومة Timing Attack على مستوى التطبيق ككل، لا فقط دالة المقارنة).
- التحقق من Rate Limiting يعمل فعلياً على المسار الجديد (لم يُكسَر بتغيير التوقيع).
- التحقق من أن صفحات `merchant/orders`/`admin/dashboard` فعلاً ترفض الوصول قبل تغيير كلمة المرور
  الإجباري (لا يمكن تجاوزها بالانتقال المباشر للرابط).

---

## 11. تقدير الوقت الفعلي

بناءً على أحجام دفعات مماثلة فعلية في هذا المستودع بالضبط (يوم أمان كامل `ADR-014`: audit_log +
IDOR + Zod + Rate Limiting، ويوم جلسات `ADR-012`: جدول جديد + تدفق دخول كامل + عزل مستأجرين —
كلاهما أُنجِز في **يوم عمل واحد** لكل منهما مع Claude Code):

- **التنفيذ + الاختبار + التحقق الحي:** يوم عمل واحد (~4-6 ساعات فعلية) — النطاق هنا فعلياً أبسط من
  كلا اليومين المذكورين (لا جدول جديد، تعديل أعمدة إضافية فقط + منطق تجزئة قياسي).
- **Guardian Review DEEP (مراجع/جلسة مستقلة):** نصف يوم إلى يوم إضافي، حسب توفر مراجع مستقل — **لا
  يمكنني التزام رقم دقيق لهذا الجزء تحديداً** (يعتمد على من يراجع ومتى).
- **الإجمالي الواقعي:** يوم إلى يومَي عمل، لا أسبوعاً — مطابق لطلبك صراحة.

---

## Open Questions (تحتاج قرارك قبل أي كود)

1. **"نسيت كلمة المرور":** هل تقبل الحل المؤقت (أنت تعيد تعيين كلمة مرور مؤقتة يدوياً عبر نفس
   السكربت عند الحاجة، لا تدفق ذاتي الخدمة) لهذه الدفعة، أم هذا يمنع الإطلاق فعلياً حتى يُبنى حل
   ذاتي الخدمة (يحتاج OTP، خارج النطاق المُعلَن)؟
2. **قواعد قوة كلمة المرور:** 8 أحرف حد أدنى بلا قواعد تعقيد إضافية (حروف كبيرة/أرقام/رموز إلزامية)
   — كافٍ لك، أم تريد حداً أدنى أعلى/قواعد تعقيد صريحة؟ (ملاحظة: المعيار الحديث NIST 800-63B يفضّل
   الطول البسيط على قواعد التعقيد المعقَّدة — هذا ليس تبسيطاً كسولاً، بل الممارسة الموصى بها فعلياً).
3. **مدة صلاحية الجلسة (7 أيام):** لا تزال `TODO` غير معتمدة رسمياً (`ADR-012`/`ADR-013`) — هل تُحسَم
   الآن ضمن هذه الدفعة، أم تبقى كما هي؟
4. **دفعة الـ70 تاجراً:** هل تُدخِل بياناتهم (اسم/هاتف/عمولة) لي دفعة واحدة (ملف/رسالة) لأولّد سكربت
   تشغيل جماعي، أم تُشغِّل السكربت بنفسك تاجراً تاجراً؟

---

## Status

`DRAFT` — بانتظار موافقتك الصريحة على هذا الـSpec (بما فيه تصحيح §0) قبل أي سطر كود.
