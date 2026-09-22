import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCustomerMigrationWorkbook } from './customer-migration-excel.js';
import {
  excelTokyoDateToUtc,
  validateCustomerMigrationWorkbook,
  type CustomerMigrationDatabase,
} from './customer-migration.js';
import type { RawCustomerMigrationRow } from './customer-migration-types.js';

const fixturePath = resolve(import.meta.dirname, '../../../examples/fixtures/sdd_customer_migration_source.xlsx');
const ownerIds = new Map(Array.from({ length: 5 }, (_, index) => [
  `staff${String(index + 1).padStart(2, '0')}@example.test`,
  `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
]));

describe('T-701 Excel fixture parsing and validation', () => {
  it('parses all masters, maps 31 rows, and classifies the 9 rejects', async () => {
    const workbook = await parseCustomerMigrationWorkbook(fixturePath);
    expect(workbook.customers).toHaveLength(40);
    expect(workbook.categories).toEqual(new Map([['A', '法人'], ['B', '個人'], ['C', '重点'], ['D', '休眠']]));
    const database = {
      query: async () => ({ rows: [...ownerIds].map(([email, id]) => ({ id, email, is_active: true })) }),
    } as CustomerMigrationDatabase;
    const result = await validateCustomerMigrationWorkbook(workbook, database);
    expect(result.valid).toHaveLength(31);
    expect(result.valid.filter(({ deleted_at }) => deleted_at === null)).toHaveLength(28);
    expect(result.valid.filter(({ deleted_at }) => deleted_at !== null)).toHaveLength(3);
    expect(result.rejects.map(({ reasonCode }) => reasonCode).sort()).toEqual([
      'DELETE_STATE_INCONSISTENT', 'DELETE_STATE_INCONSISTENT',
      'DUPLICATE_SOURCE_ID', 'DUPLICATE_SOURCE_ID',
      'INVALID_EMAIL', 'NAME_REQUIRED', 'OWNER_EMAIL_REQUIRED', 'OWNER_MAPPING_FAILED', 'UNKNOWN_CATEGORY',
    ].sort());
    expect(result.rejects.every(({ reasonSummary }) => !reasonSummary.includes('@') && !reasonSummary.includes('東京都'))).toBe(true);
    expect(result.valid[0]).toMatchObject({ category: '法人', owner_user_id: ownerIds.get('staff01@example.test') });
    expect(result.valid[0]?.created_at.toISOString()).toBe('2025-01-16T00:00:00.000Z');
  });

  it('interprets an Excel wall-clock Date as Asia/Tokyo', () => {
    expect(excelTokyoDateToUtc(new Date('2025-01-16T09:00:00.000Z'))?.toISOString())
      .toBe('2025-01-16T00:00:00.000Z');
    expect(excelTokyoDateToUtc('2025-01-16 09:00')).toBeNull();
  });

  it('classifies source ID, date, and Customer contract violations not present in the formal fixture', async () => {
    const base = (sourceCustomerId: unknown, sourceRowNumber: number): RawCustomerMigrationRow => ({
      sourceRowNumber,
      sourceCustomerId,
      name: 'Synthetic Customer',
      nameKana: null,
      email: null,
      phone: null,
      address: null,
      categoryCode: null,
      ownerEmail: 'staff01@example.test',
      createdAt: new Date('2025-01-01T09:00:00.000Z'),
      updatedAt: new Date('2025-01-02T09:00:00.000Z'),
      deletionFlag: 0,
      deletedAt: null,
    });
    const missingId = base(null, 2);
    const invalidDate = { ...base('SRC-DATE', 3), updatedAt: 'not-a-date' };
    const invalidCustomer = { ...base('SRC-TYPE', 4), phone: 123 };
    const database = {
      query: async () => ({ rows: [{
        id: ownerIds.get('staff01@example.test'), email: 'staff01@example.test', is_active: true,
      }] }),
    } as CustomerMigrationDatabase;

    const result = await validateCustomerMigrationWorkbook({
      customers: [missingId, invalidDate, invalidCustomer],
      activeOwnerEmails: new Set(['staff01@example.test']),
      categories: new Map(),
    }, database);

    expect(result.valid).toHaveLength(0);
    expect(result.rejects.map(({ reasonCode }) => reasonCode)).toEqual([
      'SOURCE_ID_REQUIRED', 'INVALID_DATE', 'CUSTOMER_VALIDATION_FAILED',
    ]);
  });
});
