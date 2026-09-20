import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (password: string): Promise<string> =>
  argon2.hash(password, hashOptions);

export const verifyPassword = (encodedHash: string, password: string): Promise<boolean> =>
  argon2.verify(encodedHash, password);

// Generate once when a future Login Service starts, then verify unknown emails against it.
export const createDummyPasswordHash = (): Promise<string> =>
  hashPassword(randomBytes(32).toString('hex'));
