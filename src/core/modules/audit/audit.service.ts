// src/core/modules/audit/audit.service.ts
// منطق الأعمال الخاص بسجل التدقيق العام — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر auditRepository

import { auditRepository } from './audit.repository';
import type { AuditLogEntry, CreateAuditLogInput } from './types';

export class AuditService {
  async log(input: CreateAuditLogInput): Promise<AuditLogEntry> {
    return auditRepository.insert(input);
  }

  async findRecent(limit: number = 50): Promise<AuditLogEntry[]> {
    return auditRepository.findRecent(limit);
  }
}

export const auditService = new AuditService();
