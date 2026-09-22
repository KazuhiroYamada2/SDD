import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(import.meta.dirname, '../../migrations/002_create_customer_migration_ledger.sql');

describe('002_create_customer_migration_ledger migration', () => {
  it('defines the idempotency ledger and its Customer reference', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toMatch(/CREATE TABLE customer_migration_ledger \([\s\S]*?dataset_id TEXT NOT NULL[\s\S]*?source_customer_id TEXT NOT NULL[\s\S]*?customer_id UUID NOT NULL UNIQUE REFERENCES customers\(id\)[\s\S]*?source_fingerprint CHAR\(64\) NOT NULL[\s\S]*?source_row_number INTEGER NOT NULL[\s\S]*?migrated_at TIMESTAMPTZ NOT NULL[\s\S]*?PRIMARY KEY \(dataset_id, source_customer_id\)[\s\S]*?\);/);
  });
});
