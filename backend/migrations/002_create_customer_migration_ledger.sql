CREATE TABLE customer_migration_ledger (
  dataset_id TEXT NOT NULL CHECK (BTRIM(dataset_id) <> ''),
  source_customer_id TEXT NOT NULL CHECK (BTRIM(source_customer_id) <> ''),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id),
  source_fingerprint CHAR(64) NOT NULL CHECK (source_fingerprint ~ '^[0-9a-f]{64}$'),
  source_row_number INTEGER NOT NULL CHECK (source_row_number >= 2),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dataset_id, source_customer_id)
);
