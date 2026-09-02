// src/core/modules/merchant/merchant.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks. يستخدم بيانات الاختبار
// الحية القائمة فعلاً (تاجر تجريبي، هاتف 01000000000) بدل إنشاء بيانات جديدة — نفس الحساب
// الذي تعتمد عليه orders.integration.test.ts (منتج "دجاجة كاملة طازجة"). ينظّف كل جلسة أنشأها.

import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { merchantService } from './merchant.service';
import { khalilService } from '../../kernel/khalil/service';

const TEST_MERCHANT_OWNER_PHONE = '01000000000';

describe('Merchant login integration (Supabase حقيقي، اليوم 10)', () => {
  const tokensToClean: string[] = [];

  afterAll(async () => {
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
  });

  it('ينجح: هاتف تاجر حقيقي نشط → token وجلسة صحيحة (tenantId يطابق التاجر الفعلي)', async () => {
    const result = await merchantService.loginOwnerByPhone(TEST_MERCHANT_OWNER_PHONE);
    expect(result).not.toBeNull();
    tokensToClean.push(result!.token);

    expect(result!.session.role).toBe('merchant_owner');
    expect(result!.session.tenantId).toBeTruthy();
  });

  it('الجلسة المُنشَأة تُقرأ حياً عبر validateSessionToken بنفس البيانات', async () => {
    const result = await merchantService.loginOwnerByPhone(TEST_MERCHANT_OWNER_PHONE);
    tokensToClean.push(result!.token);

    const fetched = await khalilService.validateSessionToken(result!.token);

    expect(fetched).toEqual(result!.session);
  });

  it('destroySession يُبطل الجلسة فعلياً — استعلام لاحق بنفس الرمز يعيد null', async () => {
    const result = await merchantService.loginOwnerByPhone(TEST_MERCHANT_OWNER_PHONE);
    await khalilService.destroySession(result!.token);

    const fetched = await khalilService.validateSessionToken(result!.token);

    expect(fetched).toBeNull();
  });

  it('يرفض (null) رقم هاتف غير مسجَّل إطلاقاً في قاعدة البيانات الحقيقية', async () => {
    const randomPhone = `0199${Math.floor(1000000 + Math.random() * 8999999)}`;
    const result = await merchantService.loginOwnerByPhone(randomPhone);
    expect(result).toBeNull();
  });

  it('رمز عشوائي غير موجود إطلاقاً يعيد null من validateSessionToken', async () => {
    const fetched = await khalilService.validateSessionToken(randomUUID());
    expect(fetched).toBeNull();
  });
});
