// src/core/modules/merchantStaff/merchantStaff.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks. يبني تاجرين معزولين تماماً
// (كل منهما owner خاص به) بدل استخدام التاجر التجريبي المشترك (نفس منطق DD-011 في
// orders.integration.test.ts — تفادي تعارض مع ملفات اختبار أخرى). ينظّف كل بياناته في afterAll.
//
// يغطي حالات الاختبار الإلزامية من TASK-14 (الموجّه §4):
//   1) Owner يضيف staff جديد لمتجره
//   2) Staff يصل لـsuborders تاجره فقط — محاولة وصول لتاجر آخر تُرفَض (عبر
//      orders.service.assertActorCanAccessOrder الحالية، غير مُعدَّلة هنا إطلاقاً)
//   3) Owner يعطّل موظفاً، ويفقد الوصول فوراً (assertActiveStaff/resolveActorContextForTenant
//      يُعاد استدعاؤهما حياً على Supabase — لا كاش)
//   4) محاولة إضافة staff من حساب مش owner للمتجر ده تُرفَض
// حالة الورديات (5) مؤجَّلة بقرار المؤسس — راجع تقرير الإنجاز.
// حالة الانحدار (6) مُغطاة عبر تشغيل الحزمة الكاملة (npm test) بلا أي تعديل على ملفات TASK-13/TASK-08.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import { merchantStaffService } from './merchantStaff.service';
import { khalilService } from '../../kernel/khalil/service';
import { ordersService } from '../orders/orders.service';

describe('MerchantStaff integration (Supabase حقيقي)', () => {
  let ownerA: { id: string };
  let ownerB: { id: string };
  let staffCandidate: { id: string };
  let tenantA: { id: string };
  let tenantB: { id: string };
  let customerOrderId: string;
  let suborderA: string;
  let suborderB: string;

  const userIdsToClean: string[] = [];
  const merchantIdsToClean: string[] = [];
  const staffIdsToClean: string[] = [];
  const suborderIdsToClean: string[] = [];
  const customerOrderIdsToClean: string[] = [];

  async function createTestUser(role: 'merchant_owner' | 'customer'): Promise<{ id: string }> {
    const phone = `0108${Math.floor(1000000 + Math.random() * 8999999)}`;
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ full_name: `مستخدم اختبار TASK-14 ${role}`, phone, role })
      .select('id')
      .single();
    if (error) throw error;
    userIdsToClean.push(data.id as string);
    return { id: data.id as string };
  }

  async function createTestMerchant(ownerId: string): Promise<{ id: string }> {
    const slug = `test-merchant-task14-${randomUUID().slice(0, 8)}`;
    const { data, error } = await supabaseAdmin
      .from('merchants')
      .insert({ owner_id: ownerId, business_name: 'تاجر اختبار TASK-14', phone: '01000000009', slug, commission_rate: 10 })
      .select('id')
      .single();
    if (error) throw error;
    merchantIdsToClean.push(data.id as string);
    return { id: data.id as string };
  }

  beforeAll(async () => {
    ownerA = await createTestUser('merchant_owner');
    ownerB = await createTestUser('merchant_owner');
    staffCandidate = await createTestUser('customer');
    tenantA = await createTestMerchant(ownerA.id);
    tenantB = await createTestMerchant(ownerB.id);

    // customer_order + suborder لكل تاجر — بيانات دنيا مباشرة (لا Checkout كامل، غير مطلوب هنا)
    const { data: customerOrder, error: coError } = await supabaseAdmin
      .from('customer_orders')
      .insert({
        user_id: staffCandidate.id,
        delivery_address: { line1: 'شارع اختبار', city: 'القاهرة' },
        subtotal_snapshot: 50,
        total_snapshot: 50,
      })
      .select('id')
      .single();
    if (coError) throw coError;
    customerOrderId = customerOrder.id as string;
    customerOrderIdsToClean.push(customerOrderId);

    const { data: subA, error: subAError } = await supabaseAdmin
      .from('merchant_suborders')
      .insert({ customer_order_id: customerOrderId, user_id: staffCandidate.id, tenant_id: tenantA.id, settlement_model: 'reef_collected', total: 50 })
      .select('id')
      .single();
    if (subAError) throw subAError;
    suborderA = subA.id as string;
    suborderIdsToClean.push(suborderA);

    const { data: subB, error: subBError } = await supabaseAdmin
      .from('merchant_suborders')
      .insert({ customer_order_id: customerOrderId, user_id: staffCandidate.id, tenant_id: tenantB.id, settlement_model: 'reef_collected', total: 50 })
      .select('id')
      .single();
    if (subBError) throw subBError;
    suborderB = subB.id as string;
    suborderIdsToClean.push(suborderB);
  });

  afterAll(async () => {
    for (const id of staffIdsToClean) {
      await supabaseAdmin.from('merchant_staff').delete().eq('id', id);
    }
    for (const id of suborderIdsToClean) {
      await supabaseAdmin.from('merchant_suborders').delete().eq('id', id);
    }
    for (const id of customerOrderIdsToClean) {
      await supabaseAdmin.from('customer_orders').delete().eq('id', id);
    }
    for (const id of merchantIdsToClean) {
      await supabaseAdmin.from('merchants').delete().eq('id', id);
    }
    for (const id of userIdsToClean) {
      await supabaseAdmin.from('users').delete().eq('id', id);
    }
  });

  it('حالة 4: يرفض إضافة موظف من حساب owner لا يملك هذا التاجر', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: tenantB.id }, { tenantId: tenantA.id, userId: staffCandidate.id })
    ).rejects.toThrow(/فقط مالك/);

    const staff = await supabaseAdmin.from('merchant_staff').select('*').eq('tenant_id', tenantA.id).eq('user_id', staffCandidate.id).maybeSingle();
    expect(staff.data).toBeNull();
  });

  it('حالة 1: owner تنانتA ينجح في إضافة staffCandidate — الدور يُرقَّى فعلياً إلى employee على Supabase', async () => {
    const staff = await merchantStaffService.addStaff(
      { role: 'merchant_owner', tenantId: tenantA.id },
      { tenantId: tenantA.id, userId: staffCandidate.id }
    );
    staffIdsToClean.push(staff.id);

    expect(staff.tenantId).toBe(tenantA.id);
    expect(staff.userId).toBe(staffCandidate.id);
    expect(staff.isActive).toBe(true);

    const updatedUser = await khalilService.findUserById(staffCandidate.id);
    expect(updatedUser!.role).toBe('employee');
  });

  it('حالة 2: staff نشط في tenantA يصل لـsuborder تاجره فقط — محاولة وصول suborder تاجر آخر تُرفَض', async () => {
    const actorContext = await merchantStaffService.resolveActorContextForTenant(staffCandidate.id, tenantA.id);
    expect(actorContext).toEqual({ role: 'employee', tenantId: tenantA.id });

    const ownResult = await ordersService.getOrderWithItems(actorContext, suborderA);
    expect(ownResult!.order.id).toBe(suborderA);

    await expect(ordersService.getOrderWithItems(actorContext, suborderB)).rejects.toThrow(/لا يخص تاجرك/);
  });

  it('حالة 3: owner يعطّل الموظف — يفقد الوصول فوراً على استعلام حي لاحق', async () => {
    const staffRow = await supabaseAdmin.from('merchant_staff').select('id').eq('tenant_id', tenantA.id).eq('user_id', staffCandidate.id).single();
    const staffId = staffRow.data!.id as string;

    await merchantStaffService.setStaffActiveStatus({ role: 'merchant_owner', tenantId: tenantA.id }, staffId, false);

    await expect(merchantStaffService.assertActiveStaff(tenantA.id, staffCandidate.id)).rejects.toThrow(/لا عضوية نشطة/);
    await expect(merchantStaffService.resolveActorContextForTenant(staffCandidate.id, tenantA.id)).rejects.toThrow(/لا عضوية نشطة/);

    // تحقق حي مباشر من الصف نفسه على Supabase — لا افتراض من نتيجة الخدمة وحدها
    const { data: liveRow } = await supabaseAdmin.from('merchant_staff').select('is_active').eq('id', staffId).single();
    expect(liveRow!.is_active).toBe(false);
  });

  it('owner الصحيح يُحل كـmerchant_owner بلا حاجة لصف merchant_staff (مصدر الحقيقة merchants.owner_id)', async () => {
    const actorContext = await merchantStaffService.resolveActorContextForTenant(ownerA.id, tenantA.id);
    expect(actorContext).toEqual({ role: 'merchant_owner', tenantId: tenantA.id });
  });
});
