import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'migrations/004_add_maintenance_first_attempted_at.sql'), 'utf8');

describe('maintenance timing migration', () => {
  it('backfills and preserves a required first-attempt timestamp', () => {
    expect(sql).toContain('ADD COLUMN first_attempted_at TIMESTAMPTZ');
    expect(sql).toContain('SET first_attempted_at = attempted_at');
    expect(sql).toContain('ALTER COLUMN first_attempted_at SET NOT NULL');
    expect(sql).toContain('CHECK (first_attempted_at <= attempted_at)');
  });
});
