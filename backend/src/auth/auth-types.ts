export type UserRole = 'staff' | 'manager' | 'admin';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

export type AuthUserIdentity = AuthenticatedUser & {
  email: string;
  is_active: boolean;
};

export type AuthUserCredentials = AuthUserIdentity & {
  password_hash: string;
};
