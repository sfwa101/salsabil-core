// src/core/modules/audit/audit.repository.ts
// الاتصال بقاعدة البيانات الخاص بسجل التدقيق العام — لا منطق أعمال هنا، فقط قراءة/كتابة
// يستخدم عميل service_role — RLS يمنع anon بالكامل على audit_log (نفس نمط ADR-008)

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { AuditAction, AuditActorRole, AuditLogEntry, CreateAuditLogInput } from './types';

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role as AuditActorRole,
    action: row.action as AuditAction,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export class AuditRepository {
  async insert(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        actor_id: input.actorId ?? null,
        actor_role: input.actorRole,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single();
    if (error) throw error;
    return toAuditLogEntry(data as AuditLogRow);
  }

  // الأحدث أولاً، بحد أقصى اختياري — نفس نمط ordersRepository.findAllStatusHistory (اليوم 11)
  async findRecent(limit: number): Promise<AuditLogEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as AuditLogRow[]).map(toAuditLogEntry);
  }
}

export const auditRepository = new AuditRepository();
