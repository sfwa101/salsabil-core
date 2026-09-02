// src/core/modules/audit/audit.service.test.ts
// اختبارات وحدة — تُموّه auditRepository؛ منطق audit.service.ts نفسه (تفويض بسيط) هو المُختبَر

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuditLogEntry } from './types';

const entry: AuditLogEntry = {
  id: 'audit-1',
  actorId: 'user-admin-1',
  actorRole: 'platform_admin',
  action: 'merchant.deactivated',
  entityType: 'merchant',
  entityId: 'merchant-1',
  metadata: { before: { isActive: true }, after: { isActive: false } },
  createdAt: new Date().toISOString(),
};

vi.mock('./audit.repository', () => ({
  auditRepository: {
    insert: vi.fn(async () => entry),
    findRecent: vi.fn(async () => [entry]),
  },
}));

const { auditService } = await import('./audit.service');
const { auditRepository } = await import('./audit.repository');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuditService.log', () => {
  it('يفوّض لـ auditRepository.insert بنفس المدخلات', async () => {
    const result = await auditService.log({
      actorId: 'user-admin-1',
      actorRole: 'platform_admin',
      action: 'merchant.deactivated',
      entityType: 'merchant',
      entityId: 'merchant-1',
      metadata: { before: { isActive: true }, after: { isActive: false } },
    });

    expect(auditRepository.insert).toHaveBeenCalledWith({
      actorId: 'user-admin-1',
      actorRole: 'platform_admin',
      action: 'merchant.deactivated',
      entityType: 'merchant',
      entityId: 'merchant-1',
      metadata: { before: { isActive: true }, after: { isActive: false } },
    });
    expect(result).toEqual(entry);
  });
});

describe('AuditService.findRecent', () => {
  it('يفوّض لـ auditRepository.findRecent بحد افتراضي 50', async () => {
    await auditService.findRecent();

    expect(auditRepository.findRecent).toHaveBeenCalledWith(50);
  });

  it('يمرّر حداً مخصَّصاً عند تمريره صراحة', async () => {
    await auditService.findRecent(10);

    expect(auditRepository.findRecent).toHaveBeenCalledWith(10);
  });
});
