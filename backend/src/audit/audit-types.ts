export const auditActions = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'AUTHORIZATION_SCOPE_DENIED',
  'CUSTOMER_LIST',
  'CUSTOMER_READ',
  'CUSTOMER_UPDATE',
  'CUSTOMER_DELETE',
  'USER_ROLE_CHANGE',
] as const;

export type AuditAction = typeof auditActions[number];

export type AuditResourceType =
  | 'AUTH'
  | 'AUTHORIZATION'
  | 'CUSTOMER_COLLECTION'
  | 'CUSTOMER'
  | 'USER';

export type AuditRecord = {
  userId: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  requestId: string;
  ipAddress: string | null;
};

export type AuditQuery = {
  query<Result>(sql: string, values?: readonly unknown[]): Promise<{ rows: Result[] }>;
};

export type AuditRepository = {
  insert(record: AuditRecord, query?: AuditQuery): Promise<void>;
};
