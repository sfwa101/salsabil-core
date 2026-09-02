// src/core/kernel/validation/schemas.ts
// أنماط تحقق مشتركة (zod) — اليوم 12، ADR-014. لا يُستدعى هذا الملف من repository.ts/service.ts
// إطلاقاً (لا قاعدة dependency-cruiser تفرض ذلك، لكن التحقق ينتمي لحافة النظام — Server Actions —
// لا طبقة الأعمال، نفس منطق "لا تثق ببيانات العميل"، docs/SECURITY.md قاعدة 13).

import { z } from 'zod';

// نمط هاتف مصري: 01 ثم [0،1،2،5] ثم 8 أرقام — نفس الأرقام التجريبية الحية (01000000000/01000000001)
export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0125]\d{8}$/, 'رقم هاتف غير صحيح — يجب أن يكون رقماً مصرياً من 11 رقماً');

export const uuidSchema = z.uuid('معرّف غير صحيح');
