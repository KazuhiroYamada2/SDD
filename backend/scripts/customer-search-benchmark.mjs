import { performance } from 'node:perf_hooks';
import pg from 'pg';
import { e2eAdmin, e2eManager, e2eStaff } from '../../e2e/fixtures/auth-users.mjs';
import { createApp } from '../src/app.ts';
import { closeDatabase, database } from '../src/db.ts';

const expectedDatabase = 'customer_management_e2e';
const customerCount = 100_000;
const activeCount = 95_000;
const warmUpRequests = 10;
const measuredRequests = 100;
const acceptanceMs = 3_000;
const deepPage = 950;
const searchTerms = Object.freeze({
  noHit: 'T602-NO-HIT-KEY',
  lowHit: 'T602-LOW-HIT-KEY',
  highHit: 'T602-HIGH-HIT-KEY',
});

function safeConnectionString() {
  if (process.env.NODE_ENV !== 'e2e') throw new Error('Benchmark safety check failed: NODE_ENV must be e2e.');
  if (!process.env.DATABASE_URL) throw new Error('Benchmark safety check failed: DATABASE_URL is required.');
  let url;
  try { url = new URL(process.env.DATABASE_URL); }
  catch { throw new Error('Benchmark safety check failed: invalid DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase ||
      url.hostname !== '127.0.0.1' || url.port !== '55432' ||
      url.username !== expectedDatabase) {
    throw new Error('Benchmark safety check failed: DATABASE_URL must target the dedicated local E2E database.');
  }
  return process.env.DATABASE_URL;
}

async function checkConnection(client) {
  const result = await client.query(
    'SELECT current_database() AS database_name, current_user AS user_name, inet_server_port() AS port',
  );
  const row = result.rows[0];
  if (row.database_name !== expectedDatabase || row.user_name !== expectedDatabase || row.port !== 5432) {
    throw new Error('Benchmark safety check failed: connected database identity does not match.');
  }
}

function benchmarkOwnerIds() {
  const ids = [
    e2eStaff.id,
    '10000000-0000-4000-8000-000000000002',
    e2eManager.id,
    e2eAdmin.id,
  ];
  for (let index = 1; index <= 96; index += 1) {
    ids.push(`50000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
  }
  return ids;
}

async function prepareDataset(client) {
  const ownerIds = benchmarkOwnerIds();
  await client.query('BEGIN');
  try {
    const fixtureCheck = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (fixtureCheck.rows[0].count !== 4) {
      throw new Error('Benchmark preparation requires the freshly reset E2E fixture with exactly four users.');
    }
    await client.query('TRUNCATE audit_logs, sales_records, activities, customers CASCADE');
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
      SELECT ('50000000-0000-4000-8000-' || LPAD(n::text, 12, '0'))::uuid,
        't602-owner-' || LPAD(n::text, 3, '0') || '@example.test',
        'benchmark-no-login', 'staff', true,
        TIMESTAMPTZ '2025-01-01T00:00:00Z', TIMESTAMPTZ '2025-01-01T00:00:00Z'
      FROM generate_series(1, 96) AS n`,
    );
    await client.query(
      `WITH owners AS (
        SELECT id, ordinality
        FROM UNNEST($1::uuid[]) WITH ORDINALITY AS owner(id, ordinality)
      ), generated AS (
        SELECT n, owner.id AS owner_user_id
        FROM generate_series(1, $2::int) AS n
        JOIN owners AS owner ON owner.ordinality = ((n - 1) % 100) + 1
      )
      INSERT INTO customers (
        id, name, name_kana, email, phone, address, category, owner_user_id,
        created_at, updated_at, deleted_at
      )
      SELECT ('60000000-0000-4000-8000-' || LPAD(n::text, 12, '0'))::uuid,
        CASE
          WHEN n <= 100 THEN $3 || ' Customer ' || LPAD(n::text, 6, '0')
          WHEN n <= 10100 THEN $4 || ' Customer ' || LPAD(n::text, 6, '0')
          ELSE 'T602-BASE Customer ' || LPAD(n::text, 6, '0')
        END,
        NULL, NULL, NULL, NULL,
        CASE WHEN n % 10 = 0 THEN NULL ELSE
          'T602-CATEGORY-' || LPAD(((((n - (n / 10)) - 1) % 20) + 1)::text, 2, '0')
        END,
        owner_user_id,
        TIMESTAMPTZ '2025-01-01T00:00:00Z' + (n - 1) * INTERVAL '1 second',
        TIMESTAMPTZ '2025-01-01T00:00:00Z' + (n - 1) * INTERVAL '1 second',
        CASE WHEN n > $5::int THEN TIMESTAMPTZ '2026-01-01T00:00:00Z' ELSE NULL END
      FROM generated`,
      [ownerIds, customerCount, searchTerms.lowHit, searchTerms.highHit, activeCount],
    );
    await client.query('ANALYZE customers');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  return ownerIds;
}

async function inspectDataset(client) {
  const counts = await client.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS active,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted
      FROM customers`);
  const owners = await client.query(`SELECT COUNT(DISTINCT owner_user_id)::int AS owner_count,
      MIN(count)::int AS min_per_owner, MAX(count)::int AS max_per_owner
      FROM (SELECT owner_user_id, COUNT(*) AS count FROM customers GROUP BY owner_user_id) AS distribution`);
  const categories = await client.query(`SELECT COUNT(DISTINCT category)::int AS category_count,
      SUM(count) FILTER (WHERE category IS NULL)::int AS null_count,
      MIN(count) FILTER (WHERE category IS NOT NULL)::int AS min_per_category,
      MAX(count) FILTER (WHERE category IS NOT NULL)::int AS max_per_category
      FROM (SELECT category, COUNT(*) AS count FROM customers GROUP BY category) AS distribution`);
  const hits = await client.query(`SELECT
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND name ILIKE $1)::int AS no_hit,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND name ILIKE $2)::int AS low_hit,
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND name ILIKE $3)::int AS high_hit
      FROM customers`, [`%${searchTerms.noHit}%`, `%${searchTerms.lowHit}%`, `%${searchTerms.highHit}%`]);
  const version = await client.query('SHOW server_version');
  const dataset = {
    ...counts.rows[0],
    ...owners.rows[0],
    ...categories.rows[0],
    search_hits: hits.rows[0],
  };
  if (dataset.total !== customerCount || dataset.active !== activeCount || dataset.deleted !== 5_000 ||
      dataset.owner_count !== 100 || dataset.min_per_owner !== 1_000 || dataset.max_per_owner !== 1_000 ||
      dataset.category_count !== 20 || dataset.null_count !== 10_000 ||
      dataset.min_per_category !== 4_500 || dataset.max_per_category !== 4_500 ||
      dataset.search_hits.no_hit !== 0 || dataset.search_hits.low_hit !== 100 ||
      dataset.search_hits.high_hit !== 10_000) {
    throw new Error(`Benchmark dataset verification failed: ${JSON.stringify(dataset)}`);
  }
  return { dataset, postgres_version: version.rows[0].server_version };
}

async function listen(app) {
  return await new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function login(baseUrl, fixture) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });
  const body = await response.json();
  if (response.status !== 200 || typeof body.accessToken !== 'string') {
    throw new Error(`Benchmark login failed with HTTP ${response.status}.`);
  }
  return body.accessToken;
}

function validateListResponse(body) {
  if (typeof body !== 'object' || body === null || !Array.isArray(body.items) ||
      !Number.isInteger(body.page) || !Number.isInteger(body.page_size) ||
      !Number.isInteger(body.total_count) || !Number.isInteger(body.total_pages)) {
    throw new Error('Customer list response does not match the pagination envelope.');
  }
}

async function requestOnce(baseUrl, token, query) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/v1/customers?${query}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  const elapsedMs = performance.now() - startedAt;
  if (response.status !== 200) throw new Error(`Customer benchmark request failed with HTTP ${response.status}.`);
  const body = JSON.parse(text);
  validateListResponse(body);
  return elapsedMs;
}

function median(sorted) {
  const middle = sorted.length / 2;
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function nearestRank(sorted, percentile) {
  return sorted[Math.ceil(percentile * sorted.length) - 1];
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}

async function measureScenario(baseUrl, scenario) {
  for (let index = 0; index < warmUpRequests; index += 1) {
    await requestOnce(baseUrl, scenario.token, scenario.query);
  }
  const durations = [];
  for (let index = 0; index < measuredRequests; index += 1) {
    durations.push(await requestOnce(baseUrl, scenario.token, scenario.query));
  }
  durations.sort((left, right) => left - right);
  const result = {
    scenario: scenario.name,
    requests: measuredRequests,
    min_ms: round(durations[0]),
    median_ms: round(median(durations)),
    p95_ms: round(nearestRank(durations, 0.95)),
    max_ms: round(durations[durations.length - 1]),
  };
  return { ...result, status: result.p95_ms <= acceptanceMs ? 'PASS' : 'FAIL' };
}

const customerColumns = `id, name, name_kana, email, phone, address, category, owner_user_id,
  created_at, updated_at, deleted_at`;

function explainStatements(criteria) {
  const clauses = ['deleted_at IS NULL'];
  const values = [];
  const addCondition = (expression, value) => {
    values.push(value);
    clauses.push(`${expression} $${values.length}`);
  };
  if (criteria.ownerScopeUserId) addCondition('owner_user_id =', criteria.ownerScopeUserId);
  if (criteria.query) addCondition('name ILIKE', `%${criteria.query}%`);
  const where = `WHERE ${clauses.join(' AND ')}`;
  const limitParameter = values.length + 1;
  const offsetParameter = limitParameter + 1;
  return {
    items: {
      sql: `SELECT ${customerColumns} FROM customers ${where}
        ORDER BY ${criteria.orderBy ?? 'name ASC, id ASC'}
        LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
      values: [...values, criteria.limit ?? 20, criteria.offset ?? 0],
    },
    count: { sql: `SELECT COUNT(*) AS total_count FROM customers ${where}`, values },
  };
}

function summarizePlan(rawPlan) {
  const document = rawPlan[0];
  const nodeTypes = [];
  const visit = (node) => {
    nodeTypes.push(node['Node Type']);
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(document.Plan);
  return {
    planning_ms: round(document['Planning Time']),
    execution_ms: round(document['Execution Time']),
    root_node: document.Plan['Node Type'],
    actual_rows: document.Plan['Actual Rows'],
    shared_hit_blocks: document.Plan['Shared Hit Blocks'],
    shared_read_blocks: document.Plan['Shared Read Blocks'],
    node_types: nodeTypes,
  };
}

async function explain(client, criteria) {
  const statements = explainStatements(criteria);
  const run = async (statement) => {
    const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement.sql}`, statement.values);
    return summarizePlan(result.rows[0]['QUERY PLAN']);
  };
  return { items: await run(statements.items), count: await run(statements.count) };
}

async function main() {
  const connectionString = safeConnectionString();
  const client = new pg.Client({ connectionString });
  let server;
  try {
    await client.connect();
    await checkConnection(client);
    const ownerIds = await prepareDataset(client);
    const inspection = await inspectDataset(client);

    server = await listen(createApp());
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Benchmark HTTP listener address is unavailable.');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const [adminToken, staffToken] = await Promise.all([
      login(baseUrl, e2eAdmin),
      login(baseUrl, e2eStaff),
    ]);
    const admin = adminToken;
    const staff = staffToken;
    const scenarios = [
      { name: 'default list', token: admin, query: 'page=1&page_size=20' },
      { name: 'name no-hit', token: admin, query: `page=1&page_size=20&query=${searchTerms.noHit}` },
      { name: 'name low-hit', token: admin, query: `page=1&page_size=20&query=${searchTerms.lowHit}` },
      { name: 'name high-hit', token: admin, query: `page=1&page_size=20&query=${searchTerms.highHit}` },
      { name: 'category filter', token: admin, query: 'page=1&page_size=20&category=T602-CATEGORY-01' },
      { name: 'owner_user_id filter', token: admin, query: `page=1&page_size=20&owner_user_id=${ownerIds[0]}` },
      { name: 'query + category AND', token: admin, query: `page=1&page_size=20&query=${searchTerms.highHit}&category=T602-CATEGORY-01` },
      { name: 'name_desc sort', token: admin, query: 'page=1&page_size=20&sort=name_desc' },
      { name: 'created_at_desc sort', token: admin, query: 'page=1&page_size=20&sort=created_at_desc' },
      { name: 'deep pagination', token: admin, query: `page=${deepPage}&page_size=100` },
      { name: 'staff scope', token: staff, query: `page=1&page_size=20&query=${searchTerms.highHit}` },
    ];
    const measurements = [];
    for (const scenario of scenarios) {
      measurements.push(await measureScenario(baseUrl, scenario));
    }

    const explains = {
      'default list': await explain(client, {}),
      'staff scope': await explain(client, { ownerScopeUserId: e2eStaff.id, query: searchTerms.highHit }),
      'name high-hit': await explain(client, { query: searchTerms.highHit }),
      'deep pagination': await explain(client, { limit: 100, offset: (deepPage - 1) * 100 }),
    };
    const output = {
      environment: {
        node_version: process.version,
        postgres_version: inspection.postgres_version,
        concurrency: 1,
        pool_max: database?.options.max ?? null,
        warm_up_requests: warmUpRequests,
        measured_requests: measuredRequests,
        acceptance_ms: acceptanceMs,
      },
      dataset: inspection.dataset,
      deep_pagination: { page: deepPage, page_size: 100, offset: (deepPage - 1) * 100 },
      measurements,
      explains,
      status: measurements.every((measurement) => measurement.status === 'PASS') ? 'PASS' : 'FAIL',
    };
    console.log(JSON.stringify(output, null, 2));
    if (output.status !== 'PASS') process.exitCode = 1;
  } finally {
    if (server) await closeServer(server);
    await client.end().catch(() => undefined);
    await closeDatabase();
  }
}

main().catch((error) => {
  let password = '';
  try { password = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : ''; }
  catch { /* Invalid URL is already reported by the safety check. */ }
  console.error(password ? error.message.replaceAll(password, '[redacted]') : error.message);
  process.exitCode = 1;
});
