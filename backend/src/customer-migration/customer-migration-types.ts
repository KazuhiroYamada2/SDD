export const rejectReasonCodes = [
  'DUPLICATE_SOURCE_ID',
  'SOURCE_ID_REQUIRED',
  'NAME_REQUIRED',
  'OWNER_EMAIL_REQUIRED',
  'OWNER_MAPPING_FAILED',
  'UNKNOWN_CATEGORY',
  'INVALID_EMAIL',
  'INVALID_DATE',
  'DELETE_STATE_INCONSISTENT',
  'CUSTOMER_VALIDATION_FAILED',
  'SOURCE_CHANGED_AFTER_MIGRATION',
] as const;

export type RejectReasonCode = typeof rejectReasonCodes[number];

export type RawCustomerMigrationRow = {
  sourceRowNumber: number;
  sourceCustomerId: unknown;
  name: unknown;
  nameKana: unknown;
  email: unknown;
  phone: unknown;
  address: unknown;
  categoryCode: unknown;
  ownerEmail: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  deletionFlag: unknown;
  deletedAt: unknown;
};

export type ParsedCustomerMigrationWorkbook = {
  customers: RawCustomerMigrationRow[];
  activeOwnerEmails: ReadonlySet<string>;
  categories: ReadonlyMap<string, string>;
};

export type CustomerMigrationReject = {
  sourceCustomerId: string;
  sourceRowNumber: number;
  reasonCode: RejectReasonCode;
  reasonSummary: string;
};

export type ValidatedCustomerMigrationRow = {
  sourceRowNumber: number;
  sourceCustomerId: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  ownerEmail: string;
  owner_user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  sourceFingerprint: string;
};

export type CustomerMigrationSummary = {
  dataset_id: string;
  source_total: number;
  inserted: number;
  already_migrated: number;
  rejected_records: number;
  reject_reason_counts: Partial<Record<RejectReasonCode, number>>;
};

export type CustomerMigrationResult = {
  summary: CustomerMigrationSummary;
  rejects: CustomerMigrationReject[];
};
