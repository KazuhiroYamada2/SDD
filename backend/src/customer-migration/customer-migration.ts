import { createHash, randomUUID } from 'node:crypto';
import type { CustomerCrypto } from '../customers/customer-crypto.js';
import type {
  CustomerMigrationReject,
  CustomerMigrationResult,
  ParsedCustomerMigrationWorkbook,
  RawCustomerMigrationRow,
  RejectReasonCode,
  ValidatedCustomerMigrationRow,
} from './customer-migration-types.js';

export type CustomerMigrationDatabase = {
  query<Result>(sql: string, values?: readonly unknown[]): Promise<{ rows: Result[] }>;
};

type UserRow = { id: string; email: string; is_active: boolean };
type LedgerRow = { customer_id: string; source_fingerprint: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokyoOffsetMilliseconds = 9 * 60 * 60 * 1000;

const summaries: Record<RejectReasonCode, string> = {
  DUPLICATE_SOURCE_ID: 'Source customer ID is duplicated.',
  SOURCE_ID_REQUIRED: 'Source customer ID is required.',
  NAME_REQUIRED: 'Customer name is required.',
  OWNER_EMAIL_REQUIRED: 'Owner email is required.',
  OWNER_MAPPING_FAILED: 'Owner could not be mapped to one active user.',
  UNKNOWN_CATEGORY: 'Category code is not present in the category master.',
  INVALID_EMAIL: 'Customer email format is invalid.',
  INVALID_DATE: 'Customer date value or chronological order is invalid.',
  DELETE_STATE_INCONSISTENT: 'Deletion flag and deletion date are inconsistent.',
  CUSTOMER_VALIDATION_FAILED: 'Customer value does not satisfy the Customer contract.',
  SOURCE_CHANGED_AFTER_MIGRATION: 'Source content differs from the committed migration record.',
};

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const reject = (
  row: RawCustomerMigrationRow,
  reasonCode: RejectReasonCode,
): CustomerMigrationReject => ({
  sourceCustomerId: text(row.sourceCustomerId) ?? '',
  sourceRowNumber: row.sourceRowNumber,
  reasonCode,
  reasonSummary: summaries[reasonCode],
});

export const excelTokyoDateToUtc = (value: unknown): Date | null => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return new Date(Date.UTC(
    value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(),
    value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds(),
  ) - tokyoOffsetMilliseconds);
};

const fingerprintFor = (row: Omit<ValidatedCustomerMigrationRow, 'owner_user_id' | 'sourceFingerprint'>): string =>
  createHash('sha256').update(JSON.stringify({
    sourceCustomerId: row.sourceCustomerId,
    name: row.name,
    name_kana: row.name_kana,
    email: row.email,
    phone: row.phone,
    address: row.address,
    category: row.category,
    ownerEmail: row.ownerEmail,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    deleted_at: row.deleted_at?.toISOString() ?? null,
  })).digest('hex');

export const validateCustomerMigrationWorkbook = async (
  workbook: ParsedCustomerMigrationWorkbook,
  database: CustomerMigrationDatabase,
): Promise<{ valid: ValidatedCustomerMigrationRow[]; rejects: CustomerMigrationReject[] }> => {
  const ids = workbook.customers.map((row) => text(row.sourceCustomerId));
  const duplicateIds = new Set(ids.filter((id, index) => id !== null && ids.indexOf(id) !== index));
  const ownerEmails = [...new Set(workbook.customers.map((row) => text(row.ownerEmail)).filter((value): value is string => value !== null))];
  const userResult = ownerEmails.length === 0
    ? { rows: [] as UserRow[] }
    : await database.query<UserRow>(
      'SELECT id, email, is_active FROM users WHERE email = ANY($1::text[]) ORDER BY email, id',
      [ownerEmails],
    );
  const usersByEmail = new Map<string, UserRow[]>();
  for (const user of userResult.rows) usersByEmail.set(user.email, [...(usersByEmail.get(user.email) ?? []), user]);

  const valid: ValidatedCustomerMigrationRow[] = [];
  const rejects: CustomerMigrationReject[] = [];
  for (const row of workbook.customers) {
    const sourceCustomerId = text(row.sourceCustomerId);
    const name = text(row.name);
    const ownerEmail = text(row.ownerEmail);
    const email = text(row.email);
    const categoryCode = text(row.categoryCode);
    const createdAt = excelTokyoDateToUtc(row.createdAt);
    const updatedAt = excelTokyoDateToUtc(row.updatedAt);
    const deletedAt = excelTokyoDateToUtc(row.deletedAt);

    let reason: RejectReasonCode | undefined;
    if (sourceCustomerId !== null && duplicateIds.has(sourceCustomerId)) reason = 'DUPLICATE_SOURCE_ID';
    else if (sourceCustomerId === null) reason = 'SOURCE_ID_REQUIRED';
    else if (name === null) reason = 'NAME_REQUIRED';
    else if (ownerEmail === null) reason = 'OWNER_EMAIL_REQUIRED';
    else if (!workbook.activeOwnerEmails.has(ownerEmail)) reason = 'OWNER_MAPPING_FAILED';
    else {
      const matches = usersByEmail.get(ownerEmail) ?? [];
      if (matches.length !== 1 || matches[0]!.is_active !== true) reason = 'OWNER_MAPPING_FAILED';
    }
    if (reason === undefined && categoryCode !== null && !workbook.categories.has(categoryCode)) reason = 'UNKNOWN_CATEGORY';
    if (reason === undefined && email !== null && !emailPattern.test(email)) reason = 'INVALID_EMAIL';
    if (reason === undefined && row.deletionFlag !== 0 && row.deletionFlag !== 1) reason = 'DELETE_STATE_INCONSISTENT';
    if (reason === undefined && ((row.deletionFlag === 0 && row.deletedAt !== null) || (row.deletionFlag === 1 && row.deletedAt === null))) {
      reason = 'DELETE_STATE_INCONSISTENT';
    }
    if (reason === undefined && (createdAt === null || updatedAt === null || updatedAt < createdAt ||
      (row.deletionFlag === 1 && (deletedAt === null || deletedAt < createdAt)))) reason = 'INVALID_DATE';
    for (const value of [row.nameKana, row.email, row.phone, row.address, row.categoryCode]) {
      if (reason === undefined && value !== null && typeof value !== 'string') reason = 'CUSTOMER_VALIDATION_FAILED';
    }

    if (reason !== undefined) {
      rejects.push(reject(row, reason));
      continue;
    }

    const normalized = {
      sourceRowNumber: row.sourceRowNumber,
      sourceCustomerId: sourceCustomerId!,
      name: name!,
      name_kana: text(row.nameKana),
      email,
      phone: text(row.phone),
      address: text(row.address),
      category: categoryCode === null ? null : workbook.categories.get(categoryCode)!,
      ownerEmail: ownerEmail!,
      created_at: createdAt!,
      updated_at: updatedAt!,
      deleted_at: row.deletionFlag === 1 ? deletedAt! : null,
    };
    valid.push({
      ...normalized,
      owner_user_id: usersByEmail.get(ownerEmail!)![0]!.id,
      sourceFingerprint: fingerprintFor(normalized),
    });
  }
  return { valid, rejects };
};

const chunks = <T>(items: readonly T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

export const migrateCustomers = async (
  workbook: ParsedCustomerMigrationWorkbook,
  database: CustomerMigrationDatabase,
  customerCrypto: CustomerCrypto,
  options: { datasetId: string; batchSize?: number },
): Promise<CustomerMigrationResult> => {
  const datasetId = options.datasetId.trim();
  const batchSize = options.batchSize ?? 100;
  if (datasetId === '') throw new Error('dataset-id is required.');
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
    throw new Error('batch-size must be an integer between 1 and 10000.');
  }

  const validation = await validateCustomerMigrationWorkbook(workbook, database);
  const rejects = [...validation.rejects];
  let inserted = 0;
  let alreadyMigrated = 0;

  for (const batch of chunks(validation.valid, batchSize)) {
    await database.query('BEGIN');
    try {
      for (const row of batch) {
        const ledger = await database.query<LedgerRow>(
          `SELECT customer_id, source_fingerprint
          FROM customer_migration_ledger
          WHERE dataset_id = $1 AND source_customer_id = $2
          FOR UPDATE`,
          [datasetId, row.sourceCustomerId],
        );
        if (ledger.rows.length === 1) {
          if (ledger.rows[0]!.source_fingerprint === row.sourceFingerprint) alreadyMigrated += 1;
          else rejects.push({
            sourceCustomerId: row.sourceCustomerId,
            sourceRowNumber: row.sourceRowNumber,
            reasonCode: 'SOURCE_CHANGED_AFTER_MIGRATION',
            reasonSummary: summaries.SOURCE_CHANGED_AFTER_MIGRATION,
          });
          continue;
        }

        const customerId = randomUUID();
        const encrypted = customerCrypto.encryptCreateInput({
          name: row.name,
          name_kana: row.name_kana,
          email: row.email,
          phone: row.phone,
          address: row.address,
          category: row.category,
          owner_user_id: row.owner_user_id,
        });
        await database.query(
          `INSERT INTO customers (
            id, name, name_kana, email, phone, address, category, owner_user_id,
            created_at, updated_at, deleted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            customerId, encrypted.name, encrypted.name_kana, encrypted.email, encrypted.phone,
            encrypted.address, encrypted.category, encrypted.owner_user_id,
            row.created_at, row.updated_at, row.deleted_at,
          ],
        );
        await database.query(
          `INSERT INTO customer_migration_ledger (
            dataset_id, source_customer_id, customer_id, source_fingerprint, source_row_number
          ) VALUES ($1, $2, $3, $4, $5)`,
          [datasetId, row.sourceCustomerId, customerId, row.sourceFingerprint, row.sourceRowNumber],
        );
        inserted += 1;
      }
      await database.query('COMMIT');
    } catch (error) {
      try { await database.query('ROLLBACK'); } catch { /* Preserve the original failure. */ }
      throw error;
    }
  }

  const reasonCounts: CustomerMigrationResult['summary']['reject_reason_counts'] = {};
  for (const item of rejects) reasonCounts[item.reasonCode] = (reasonCounts[item.reasonCode] ?? 0) + 1;
  const summary = {
    dataset_id: datasetId,
    source_total: workbook.customers.length,
    inserted,
    already_migrated: alreadyMigrated,
    rejected_records: rejects.length,
    reject_reason_counts: reasonCounts,
  };
  if (summary.source_total !== summary.inserted + summary.already_migrated + summary.rejected_records) {
    throw new Error('Customer migration reconciliation failed.');
  }
  return { summary, rejects };
};
