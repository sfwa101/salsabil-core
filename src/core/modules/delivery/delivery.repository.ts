// src/core/modules/delivery/delivery.repository.ts
// الاتصال بقاعدة البيانات لنطاق التوصيل — لا منطق أعمال هنا، فقط قراءة/كتابة. كل الجداول هنا
// (delivery_offices/drivers/delivery_jobs/delivery_job_suborders) RLS مفعَّل بلا أي policy (نمط
// AUTH_SECRET/TENANT_PRIVATE، نفس merchants/carts) — service_role حصراً، لا قراءة anon.

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { DeliveryJobStatus } from './types';
import type { DeliveryOffice, Driver, DeliveryJob } from './types';

interface DeliveryOfficeRow {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

function toDeliveryOffice(row: DeliveryOfficeRow): DeliveryOffice {
  return { id: row.id, ownerId: row.owner_id, name: row.name, phone: row.phone, isActive: row.is_active, createdAt: row.created_at };
}

interface DriverRow {
  id: string;
  office_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
}

function toDriver(row: DriverRow): Driver {
  return { id: row.id, officeId: row.office_id, userId: row.user_id, isActive: row.is_active, createdAt: row.created_at };
}

interface DeliveryJobRow {
  id: string;
  customer_order_id: string;
  office_id: string | null;
  driver_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function toDeliveryJob(row: DeliveryJobRow): DeliveryJob {
  return {
    id: row.id,
    customerOrderId: row.customer_order_id,
    officeId: row.office_id,
    driverId: row.driver_id,
    status: row.status as DeliveryJobStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DeliveryRepository {
  async findOfficeByOwnerId(ownerId: string): Promise<DeliveryOffice | null> {
    const { data, error } = await supabaseAdmin.from('delivery_offices').select('*').eq('owner_id', ownerId).maybeSingle();
    if (error) throw error;
    return data ? toDeliveryOffice(data as DeliveryOfficeRow) : null;
  }

  async findOfficeById(id: string): Promise<DeliveryOffice | null> {
    const { data, error } = await supabaseAdmin.from('delivery_offices').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toDeliveryOffice(data as DeliveryOfficeRow) : null;
  }

  async findDriverByUserId(userId: string): Promise<Driver | null> {
    // مستخدَم فقط لتسجيل دخول السائق — .limit(1) بدل .single() لأن قيد drivers_office_user_unique
    // هو (office_id, user_id) لا user_id وحده، فنظرياً قد ينتمي مستخدِم لأكثر من مكتب. V1 تبسيط
    // متعمَّد (قرار معلَّق، راجع سجل البناء الليلي 2026-09-20 → بند 9): أول عضوية نشطة فقط، لا اختيار.
    const { data, error } = await supabaseAdmin.from('drivers').select('*').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();
    if (error) throw error;
    return data ? toDriver(data as DriverRow) : null;
  }

  async findDriverById(id: string): Promise<Driver | null> {
    const { data, error } = await supabaseAdmin.from('drivers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toDriver(data as DriverRow) : null;
  }

  async findDriversByOffice(officeId: string): Promise<Driver[]> {
    const { data, error } = await supabaseAdmin.from('drivers').select('*').eq('office_id', officeId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DriverRow[]).map(toDriver);
  }

  async createDriver(officeId: string, userId: string): Promise<Driver> {
    const { data, error } = await supabaseAdmin.from('drivers').insert({ office_id: officeId, user_id: userId }).select('*').single();
    if (error) throw error;
    return toDriver(data as DriverRow);
  }

  async setDriverActiveStatus(id: string, isActive: boolean): Promise<Driver> {
    const { data, error } = await supabaseAdmin.from('drivers').update({ is_active: isActive }).eq('id', id).select('*').single();
    if (error) throw error;
    return toDriver(data as DriverRow);
  }

  // معرّفات merchant_suborder المرتبطة فعلاً برحلة توصيل بالفعل — لاستبعادها من قائمة "جاهزة
  // للإسناد" (لا تكرار إنشاء رحلة لنفس الطلب).
  async findAssignedSuborderIds(): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from('delivery_job_suborders').select('merchant_suborder_id');
    if (error) throw error;
    return (data as { merchant_suborder_id: string }[]).map((r) => r.merchant_suborder_id);
  }

  async createDeliveryJob(customerOrderId: string, officeId: string, merchantSuborderId: string): Promise<DeliveryJob> {
    const { data, error } = await supabaseAdmin
      .from('delivery_jobs')
      .insert({ customer_order_id: customerOrderId, office_id: officeId, status: 'ready_for_pickup' })
      .select('*')
      .single();
    if (error) throw error;
    const job = toDeliveryJob(data as DeliveryJobRow);

    const { error: linkError } = await supabaseAdmin.from('delivery_job_suborders').insert({ delivery_job_id: job.id, merchant_suborder_id: merchantSuborderId });
    if (linkError) {
      // تعويض فوري — نفس فلسفة orders.service.ts عند فشل خطوة لاحقة بعد إنشاء ناجح (لا صف يتيم بلا ربط)
      await supabaseAdmin.from('delivery_jobs').delete().eq('id', job.id);
      throw linkError;
    }
    return job;
  }

  async findJobsByOffice(officeId: string): Promise<DeliveryJob[]> {
    const { data, error } = await supabaseAdmin.from('delivery_jobs').select('*').eq('office_id', officeId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DeliveryJobRow[]).map(toDeliveryJob);
  }

  async findJobById(id: string): Promise<DeliveryJob | null> {
    const { data, error } = await supabaseAdmin.from('delivery_jobs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toDeliveryJob(data as DeliveryJobRow) : null;
  }

  async findJobsByDriver(driverId: string): Promise<DeliveryJob[]> {
    const { data, error } = await supabaseAdmin.from('delivery_jobs').select('*').eq('driver_id', driverId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DeliveryJobRow[]).map(toDeliveryJob);
  }

  async findSuborderIdsForJob(jobId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from('delivery_job_suborders').select('merchant_suborder_id').eq('delivery_job_id', jobId);
    if (error) throw error;
    return (data as { merchant_suborder_id: string }[]).map((r) => r.merchant_suborder_id);
  }

  async assignDriver(jobId: string, driverId: string): Promise<DeliveryJob> {
    const { data, error } = await supabaseAdmin
      .from('delivery_jobs')
      .update({ driver_id: driverId, status: 'driver_assigned', updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('status', 'ready_for_pickup')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('الرحلة غير موجودة أو ليست بحالة تسمح بإسناد سائق');
    return toDeliveryJob(data as DeliveryJobRow);
  }

  async updateJobStatus(jobId: string, fromStatus: DeliveryJobStatus, toStatus: DeliveryJobStatus): Promise<DeliveryJob | null> {
    const { data, error } = await supabaseAdmin
      .from('delivery_jobs')
      .update({ status: toStatus, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('status', fromStatus)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toDeliveryJob(data as DeliveryJobRow) : null;
  }
}

export const deliveryRepository = new DeliveryRepository();
