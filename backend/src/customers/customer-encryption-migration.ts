import type { CustomerCrypto, EncryptedCustomerField } from './customer-crypto.js';
import { encryptedCustomerFields } from './customer-crypto.js';

type MigrationRow = { id: string } & Record<EncryptedCustomerField, string | null>;

export type MigrationDatabase = {
  query<Result>(sql: string, values?: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type CustomerEncryptionMigrationResult = {
  scannedCustomers: number;
  updatedCustomers: number;
  encryptedValues: number;
};

const selectedColumns = `id, ${encryptedCustomerFields.join(', ')}`;

const migrateValue = (
  crypto: CustomerCrypto,
  field: EncryptedCustomerField,
  value: string | null,
): { value: string | null; encrypted: boolean } => {
  if (value === null) return { value, encrypted: false };
  if (value.startsWith('enc:v1:')) {
    crypto.validateEnvelope(field, value);
    return { value, encrypted: false };
  }
  return { value: crypto.encrypt(field, value), encrypted: true };
};

export const migrateCustomerEncryption = async (
  database: MigrationDatabase,
  crypto: CustomerCrypto,
): Promise<CustomerEncryptionMigrationResult> => {
  await database.query('BEGIN');
  try {
    const result = await database.query<MigrationRow>(
      `SELECT ${selectedColumns} FROM customers ORDER BY id FOR UPDATE`,
    );
    let updatedCustomers = 0;
    let encryptedValues = 0;

    for (const row of result.rows) {
      const migrated = { ...row };
      let changed = false;
      for (const field of encryptedCustomerFields) {
        const fieldResult = migrateValue(crypto, field, row[field]);
        migrated[field] = fieldResult.value;
        changed ||= fieldResult.encrypted;
        if (fieldResult.encrypted) encryptedValues += 1;
      }
      if (!changed) continue;
      await database.query(
        `UPDATE customers
        SET name_kana = $1, email = $2, phone = $3, address = $4
        WHERE id = $5`,
        [migrated.name_kana, migrated.email, migrated.phone, migrated.address, row.id],
      );
      updatedCustomers += 1;
    }

    const verification = await database.query<MigrationRow>(
      `SELECT ${selectedColumns} FROM customers ORDER BY id`,
    );
    for (const row of verification.rows) {
      for (const field of encryptedCustomerFields) {
        if (row[field] !== null) crypto.validateEnvelope(field, row[field]!);
      }
    }
    await database.query('COMMIT');
    return { scannedCustomers: result.rows.length, updatedCustomers, encryptedValues };
  } catch (error) {
    try { await database.query('ROLLBACK'); } catch { /* Preserve the original failure. */ }
    throw error;
  }
};
