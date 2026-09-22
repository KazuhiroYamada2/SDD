import { describe, expect, it, vi } from 'vitest';
import { createCustomerCrypto } from './customer-crypto.js';
import { migrateCustomerEncryption, type MigrationDatabase } from './customer-encryption-migration.js';

const crypto = createCustomerCrypto({ currentKeyId: 'test', keys: new Map([['test', Buffer.alloc(32, 7)]]) });
type TestRow = { id: string; name_kana: string | null; email: string | null; phone: string | null; address: string | null };
const row = (id: string, email: string | null): TestRow => ({ id, name_kana: null, email, phone: null, address: null });

const databaseFor = (initialRows: ReturnType<typeof row>[]) => {
  let rows = structuredClone(initialRows);
  let snapshot = structuredClone(initialRows);
  const query = vi.fn(async (sql: string, values: readonly unknown[] = []) => {
    if (sql === 'BEGIN') snapshot = structuredClone(rows);
    else if (sql === 'ROLLBACK') rows = structuredClone(snapshot);
    else if (sql.startsWith('SELECT')) return { rows: structuredClone(rows) };
    else if (sql.includes('UPDATE customers')) {
      const index = rows.findIndex(({ id }) => id === values[4]);
      rows[index] = {
        id: values[4] as string,
        name_kana: values[0] as string | null,
        email: values[1] as string | null,
        phone: values[2] as string | null,
        address: values[3] as string | null,
      };
    }
    return { rows: [] };
  });
  return { database: { query } as MigrationDatabase, query, rows: () => structuredClone(rows) };
};

describe('one-shot Customer encryption migration', () => {
  it('encrypts active/deleted-independent rows, preserves null, and is idempotent', async () => {
    const encrypted = crypto.encrypt('email', 'already@example.test');
    const fixture = databaseFor([
      row('active', 'active@example.test'),
      row('deleted', 'deleted@example.test'),
      row('null', null),
      row('encrypted', encrypted),
    ]);

    await expect(migrateCustomerEncryption(fixture.database, crypto)).resolves.toEqual({
      scannedCustomers: 4, updatedCustomers: 2, encryptedValues: 2,
    });
    const first = fixture.rows();
    expect(first.find(({ id }) => id === 'active')?.email).toMatch(/^enc:v1:/);
    expect(first.find(({ id }) => id === 'deleted')?.email).toMatch(/^enc:v1:/);
    expect(first.find(({ id }) => id === 'null')?.email).toBeNull();
    expect(first.find(({ id }) => id === 'encrypted')?.email).toBe(encrypted);

    await expect(migrateCustomerEncryption(fixture.database, crypto)).resolves.toEqual({
      scannedCustomers: 4, updatedCustomers: 0, encryptedValues: 0,
    });
    expect(fixture.rows()).toEqual(first);
    expect(fixture.query.mock.calls.find(([sql]) => String(sql).includes('FOR UPDATE'))?.[0])
      .not.toContain('deleted_at');
  });

  it('fails and rolls back when an enc:v1 value is malformed', async () => {
    const original = [row('plain', 'plain@example.test'), row('bad', 'enc:v1:malformed')];
    const fixture = databaseFor(original);
    await expect(migrateCustomerEncryption(fixture.database, crypto)).rejects.toThrow();
    expect(fixture.rows()).toEqual(original);
    expect(fixture.query).toHaveBeenCalledWith('ROLLBACK');
    expect(fixture.query).not.toHaveBeenCalledWith('COMMIT');
  });
});
