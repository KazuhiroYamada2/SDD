import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(import.meta.dirname, '../../migrations/001_create_core_schema.sql');

const schema = () => readFile(migrationPath, 'utf8');

describe('activities database schema', () => {
  it('defines only the specified activity fields with customer and user foreign keys', async () => {
    const sql = await schema();

    expect(sql).toMatch(/CREATE TABLE activities \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?customer_id UUID NOT NULL REFERENCES customers\(id\)[\s\S]*?user_id UUID NOT NULL REFERENCES users\(id\)[\s\S]*?activity_type TEXT NOT NULL CHECK \(activity_type IN \('visit', 'meeting'\)\)[\s\S]*?visited_at TIMESTAMPTZ[\s\S]*?meeting_note TEXT[\s\S]*?next_visit_at TIMESTAMPTZ[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?updated_at TIMESTAMPTZ NOT NULL[\s\S]*?\);/);
  });
});
