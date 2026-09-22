import { describe, expect, it, vi } from 'vitest';
import {
  assertRehearsalConnection,
  connectionForDatabase,
  rehearsalDatabase,
  runOrderedSteps,
} from './migration-rehearsal.js';

describe('migration rehearsal safety', () => {
  const safe = 'postgresql://customer_management_e2e:local-only@127.0.0.1:55432/customer_management_e2e';

  it('accepts only the dedicated local E2E source', () => {
    expect(assertRehearsalConnection('e2e', safe).hostname).toBe('127.0.0.1');
    expect(connectionForDatabase(new URL(safe), rehearsalDatabase)).toContain(`/${rehearsalDatabase}`);
  });

  it.each([
    ['production', safe],
    ['e2e', 'postgresql://user:password@production.example:5432/customer_management_e2e'],
    ['e2e', 'postgresql://customer_management_e2e:password@127.0.0.1:55432/production'],
    ['e2e', undefined],
  ])('rejects an unsafe target', (nodeEnv, url) => {
    expect(() => assertRehearsalConnection(nodeEnv, url)).toThrow('dedicated local E2E');
  });

  it('rejects unapproved derived database names', () => {
    expect(() => connectionForDatabase(new URL(safe), 'production')).toThrow('not allowed');
  });
});

describe('migration rehearsal sequencing', () => {
  it('does not run rollout steps after backup failure', async () => {
    const migration = vi.fn();
    await expect(runOrderedSteps(['backup', 'migration'], {
      backup: async () => { throw new Error('backup failed'); },
      migration,
    })).rejects.toMatchObject({ stepResults: { backup: 'FAIL', migration: 'NOT_RUN' } });
    expect(migration).not.toHaveBeenCalled();
  });

  it('does not run rollout after migration failure', async () => {
    const rollout = vi.fn();
    await expect(runOrderedSteps(['migration', 'rollout'], {
      migration: async () => { throw new Error('migration failed'); },
      rollout,
    })).rejects.toMatchObject({ stepResults: { migration: 'FAIL', rollout: 'NOT_RUN' } });
    expect(rollout).not.toHaveBeenCalled();
  });

  it('records completed steps and a machine-readable result', async () => {
    await expect(runOrderedSteps(['precheck', 'cleanup'], {
      precheck: async () => undefined,
      cleanup: async () => undefined,
    })).resolves.toEqual({ precheck: 'PASS', cleanup: 'PASS' });
  });
});
