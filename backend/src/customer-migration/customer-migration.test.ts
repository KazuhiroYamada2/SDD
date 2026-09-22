import { describe, expect, it, vi } from 'vitest';
import { createCustomerCrypto } from '../customers/customer-crypto.js';
import { migrateCustomers, type CustomerMigrationDatabase } from './customer-migration.js';
import type { ParsedCustomerMigrationWorkbook, RawCustomerMigrationRow } from './customer-migration-types.js';

const ownerId = '71000000-0000-4000-8000-000000000001';
const ownerEmail = 'staff01@example.test';
const crypto = createCustomerCrypto({ currentKeyId: 'test', keys: new Map([['test', Buffer.alloc(32, 4)]]) });

const rawRow = (id: string, name = `Customer ${id}`, row = 2): RawCustomerMigrationRow => ({
  sourceRowNumber: row,
  sourceCustomerId: id,
  name,
  nameKana: `Kana ${id}`,
  email: `${id.toLowerCase()}@example.test`,
  phone: null,
  address: null,
  categoryCode: 'A',
  ownerEmail,
  createdAt: new Date('2025-01-01T09:00:00.000Z'),
  updatedAt: new Date('2025-01-02T09:00:00.000Z'),
  deletionFlag: 0,
  deletedAt: null,
});

const workbook = (...customers: RawCustomerMigrationRow[]): ParsedCustomerMigrationWorkbook => ({
  customers,
  activeOwnerEmails: new Set([ownerEmail]),
  categories: new Map([['A', '法人']]),
});

const memoryDatabase = (failCustomerInsertAt?: number) => {
  let customers: unknown[][] = [];
  let ledgers = new Map<string, { customer_id: string; source_fingerprint: string }>();
  let snapshot = { customers: [] as unknown[][], ledgers: new Map(ledgers) };
  let customerInsertCount = 0;
  const query = vi.fn(async (sql: string, values: readonly unknown[] = []) => {
    if (sql.startsWith('SELECT id, email')) return { rows: [{ id: ownerId, email: ownerEmail, is_active: true }] };
    if (sql === 'BEGIN') snapshot = { customers: structuredClone(customers), ledgers: new Map(ledgers) };
    else if (sql === 'ROLLBACK') {
      customers = structuredClone(snapshot.customers);
      ledgers = new Map(snapshot.ledgers);
    } else if (sql.includes('FROM customer_migration_ledger')) {
      const value = ledgers.get(`${values[0]}:${values[1]}`);
      return { rows: value === undefined ? [] : [value] };
    } else if (sql.includes('INSERT INTO customers')) {
      customerInsertCount += 1;
      if (customerInsertCount === failCustomerInsertAt) throw new Error('synthetic database failure');
      customers.push([...values]);
    } else if (sql.includes('INSERT INTO customer_migration_ledger')) {
      ledgers.set(`${values[0]}:${values[1]}`, { customer_id: values[2] as string, source_fingerprint: values[3] as string });
    }
    return { rows: [] };
  });
  return {
    database: { query } as CustomerMigrationDatabase,
    query,
    customers: () => structuredClone(customers),
    ledgers: () => new Map(ledgers),
  };
};

describe('T-701 batch Customer migration', () => {
  it('inserts encrypted Customers with UUID v4 and treats an identical retry as already migrated', async () => {
    const memory = memoryDatabase();
    const source = workbook(rawRow('SRC-1'));
    await expect(migrateCustomers(source, memory.database, crypto, { datasetId: 'dataset', batchSize: 1 }))
      .resolves.toMatchObject({ summary: { inserted: 1, already_migrated: 0, rejected_records: 0 } });
    const inserted = memory.customers()[0]!;
    expect(inserted[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/i);
    expect(inserted[2]).toMatch(/^enc:v1:/);
    expect(inserted[3]).toMatch(/^enc:v1:/);
    expect(inserted).not.toContain('Kana SRC-1');
    expect(inserted).not.toContain('src-1@example.test');

    await expect(migrateCustomers(source, memory.database, crypto, { datasetId: 'dataset', batchSize: 1 }))
      .resolves.toMatchObject({ summary: { inserted: 0, already_migrated: 1, rejected_records: 0 } });
    expect(memory.customers()).toHaveLength(1);
    expect(memory.ledgers().size).toBe(1);
  });

  it('does not update or generate another Customer when committed source content changed', async () => {
    const memory = memoryDatabase();
    await migrateCustomers(workbook(rawRow('SRC-1')), memory.database, crypto, { datasetId: 'dataset' });
    const first = memory.customers();
    const changed = await migrateCustomers(workbook(rawRow('SRC-1', 'Changed')), memory.database, crypto, { datasetId: 'dataset' });
    expect(changed.summary).toMatchObject({ inserted: 0, already_migrated: 0, rejected_records: 1 });
    expect(changed.rejects[0]?.reasonCode).toBe('SOURCE_CHANGED_AFTER_MIGRATION');
    expect(memory.customers()).toEqual(first);
  });

  it('rolls back Customer and ledger together for a failed batch', async () => {
    const memory = memoryDatabase(2);
    await expect(migrateCustomers(
      workbook(rawRow('SRC-1'), rawRow('SRC-2', undefined, 3)), memory.database, crypto,
      { datasetId: 'dataset', batchSize: 2 },
    )).rejects.toThrow('synthetic database failure');
    expect(memory.customers()).toHaveLength(0);
    expect(memory.ledgers().size).toBe(0);
    expect(memory.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('keeps earlier committed batches when a later batch fails', async () => {
    const memory = memoryDatabase(3);
    await expect(migrateCustomers(
      workbook(rawRow('SRC-1'), rawRow('SRC-2', undefined, 3), rawRow('SRC-3', undefined, 4)),
      memory.database, crypto, { datasetId: 'dataset', batchSize: 2 },
    )).rejects.toThrow();
    expect(memory.customers()).toHaveLength(2);
    expect(memory.ledgers().size).toBe(2);
  });
});
