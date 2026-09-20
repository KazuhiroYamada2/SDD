export type UserRole = 'staff' | 'manager' | 'admin';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthenticationState = {
  accessToken: string;
  user: AuthenticatedUser;
} | null;

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: 1800;
  user: AuthenticatedUser;
};
