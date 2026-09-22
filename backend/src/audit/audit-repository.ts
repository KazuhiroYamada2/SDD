import { randomUUID } from 'node:crypto';
import type { AuditQuery, AuditRecord, AuditRepository } from './audit-types.js';

export const createAuditRepository = (database: AuditQuery): AuditRepository => ({
  async insert(record, query = database) {
    await query.query(
      `INSERT INTO audit_logs (
        id, user_id, action, resource_type, resource_id, request_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        record.userId,
        record.action,
        record.resourceType,
        record.resourceId,
        record.requestId,
        record.ipAddress,
      ],
    );
  },
});

export const noOpAuditRepository: AuditRepository = {
  insert: async () => undefined,
};
