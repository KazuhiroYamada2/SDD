import { describe, expect, it, vi } from 'vitest';
import { createAuditRepository } from './audit-repository.js';
import { recordBestEffortAudit } from './audit-recorder.js';

describe('Audit repository', () => {
  it('inserts only the approved audit fields through the supplied query client', async () => {
    const poolQuery = vi.fn();
    const transactionQuery = vi.fn().mockResolvedValue({ rows: [] });
    const repository = createAuditRepository({ query: poolQuery });
    const record = {
      userId: '11111111-1111-4111-8111-111111111111',
      action: 'CUSTOMER_UPDATE' as const,
      resourceType: 'CUSTOMER' as const,
      resourceId: '22222222-2222-4222-8222-222222222222',
      requestId: '33333333-3333-4333-8333-333333333333',
      ipAddress: '127.0.0.1',
    };

    await repository.insert(record, { query: transactionQuery });

    expect(poolQuery).not.toHaveBeenCalled();
    expect(transactionQuery).toHaveBeenCalledOnce();
    const [sql, values] = transactionQuery.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO audit_logs');
    expect(sql.replace(/\s+/g, ' ')).toContain(
      'id, user_id, action, resource_type, resource_id, request_id, ip_address',
    );
    expect(sql).not.toMatch(/password|email|customer_name|ciphertext/i);
    expect(values).toEqual([
      expect.any(String),
      record.userId,
      record.action,
      record.resourceType,
      record.resourceId,
      record.requestId,
      record.ipAddress,
    ]);
  });

  it('writes only sanitized metadata when a best-effort audit insert fails', async () => {
    const operationalRecords: Readonly<Record<string, unknown>>[] = [];

    await recordBestEffortAudit(
      { insert: vi.fn().mockRejectedValue(new Error('database credential and Customer PII')) },
      {
        userId: '11111111-1111-4111-8111-111111111111',
        action: 'AUTHORIZATION_SCOPE_DENIED',
        resourceType: 'CUSTOMER',
        resourceId: '22222222-2222-4222-8222-222222222222',
        requestId: '33333333-3333-4333-8333-333333333333',
        ipAddress: '127.0.0.1',
      },
      (record) => operationalRecords.push(record),
    );

    expect(operationalRecords).toEqual([expect.objectContaining({
      event: 'AUDIT_WRITE_FAILURE',
      request_id: '33333333-3333-4333-8333-333333333333',
      action: 'AUTHORIZATION_SCOPE_DENIED',
      failure_code: 'AUDIT_INSERT_FAILED',
      timestamp: expect.any(String),
    })]);
    expect(Object.keys(operationalRecords[0]!)).toEqual([
      'event', 'request_id', 'action', 'failure_code', 'timestamp',
    ]);
    const serialized = JSON.stringify(operationalRecords);
    expect(serialized).not.toContain('11111111-1111-4111-8111-111111111111');
    expect(serialized).not.toContain('22222222-2222-4222-8222-222222222222');
    expect(serialized).not.toContain('database credential');
  });
});
