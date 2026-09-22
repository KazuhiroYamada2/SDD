import type { Request } from 'express';
import type { AuditAction, AuditRecord, AuditRepository, AuditResourceType } from './audit-types.js';
import { requestIp } from '../http/request-ip.js';
import type { StructuredLogWriter } from '../logging/structured-log.js';

export const auditRecordFor = (
  request: Request,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string | null,
  userId: string | null = request.authenticatedUser?.id ?? null,
): AuditRecord => ({
  userId,
  action,
  resourceType,
  resourceId,
  requestId: request.requestId,
  ipAddress: requestIp(request),
});

export const recordBestEffortAudit = async (
  repository: AuditRepository,
  record: AuditRecord,
  operationalLog: StructuredLogWriter,
): Promise<void> => {
  try {
    await repository.insert(record);
  } catch {
    try {
      operationalLog({
        event: 'AUDIT_WRITE_FAILURE',
        request_id: record.requestId,
        action: record.action,
        failure_code: 'AUDIT_INSERT_FAILED',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Best-effort audit and its sanitized operational log never alter the security response.
    }
  }
};
