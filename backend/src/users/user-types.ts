import type { UserRole } from '../auth/auth-types.js';

export type UserDto = {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
};

