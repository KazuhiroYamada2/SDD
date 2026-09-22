import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(import.meta.dirname, '../../migrations/001_create_core_schema.sql');

const schema = () => readFile(migrationPath, 'utf8');

describe('001_create_core_schema migration', () => {
  it('defines the five required tables and their columns', async () => {
    const sql = await schema();

    expect(sql).toMatch(/CREATE TABLE users \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?email TEXT NOT NULL UNIQUE[\s\S]*?password_hash TEXT NOT NULL[\s\S]*?role TEXT NOT NULL CHECK \(role IN \('staff', 'manager', 'admin'\)\)[\s\S]*?is_active BOOLEAN NOT NULL DEFAULT TRUE[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?updated_at TIMESTAMPTZ NOT NULL[\s\S]*?\);/);
    expect(sql).toMatch(/CREATE TABLE customers \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?name TEXT NOT NULL[\s\S]*?name_kana TEXT[\s\S]*?email TEXT[\s\S]*?phone TEXT[\s\S]*?address TEXT[\s\S]*?category TEXT[\s\S]*?owner_user_id UUID NOT NULL REFERENCES users\(id\)[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?updated_at TIMESTAMPTZ NOT NULL[\s\S]*?deleted_at TIMESTAMPTZ[\s\S]*?\);/);
    expect(sql).toMatch(/CREATE TABLE activities \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?customer_id UUID NOT NULL REFERENCES customers\(id\)[\s\S]*?user_id UUID NOT NULL REFERENCES users\(id\)[\s\S]*?activity_type TEXT NOT NULL CHECK \(activity_type IN \('visit', 'meeting'\)\)[\s\S]*?visited_at TIMESTAMPTZ[\s\S]*?meeting_note TEXT[\s\S]*?next_visit_at TIMESTAMPTZ[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?updated_at TIMESTAMPTZ NOT NULL[\s\S]*?\);/);
    expect(sql).toMatch(/CREATE TABLE sales_records \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?customer_id UUID NOT NULL REFERENCES customers\(id\)[\s\S]*?user_id UUID NOT NULL REFERENCES users\(id\)[\s\S]*?amount NUMERIC\(15, 2\) NOT NULL[\s\S]*?recorded_on DATE NOT NULL[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?updated_at TIMESTAMPTZ NOT NULL[\s\S]*?\);/);
    expect(sql).toMatch(/CREATE TABLE audit_logs \([\s\S]*?id UUID PRIMARY KEY[\s\S]*?user_id UUID REFERENCES users\(id\)[\s\S]*?action TEXT NOT NULL[\s\S]*?resource_type TEXT NOT NULL[\s\S]*?resource_id UUID[\s\S]*?request_id UUID[\s\S]*?ip_address INET[\s\S]*?created_at TIMESTAMPTZ NOT NULL[\s\S]*?\);/);
  });

  it('adds every customer search index required by the design', async () => {
    const sql = await schema();

    expect(sql).toContain('CREATE INDEX customers_name_idx ON customers (name);');
    expect(sql).toContain('CREATE INDEX customers_category_idx ON customers (category);');
    expect(sql).toContain('CREATE INDEX customers_owner_user_id_idx ON customers (owner_user_id);');
    expect(sql).toContain('CREATE INDEX customers_deleted_at_idx ON customers (deleted_at);');
  });
});
