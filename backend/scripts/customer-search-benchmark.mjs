import { performance } from 'node:perf_hooks';
import pg from 'pg';
import { e2eAdmin, e2eManager, e2eStaff } from '../../e2e/fixtures/auth-users.mjs';
import { createApp } from '../src/app.ts';
import { closeDatabase, database } from '../src/db.ts';

const expectedDatabase = 'customer_management_e2e';
const customerCount = 100_000;
const activeCount = 95_000;
const loadMode = process.argv.includes('--load');
const warmUpRequests = 10;
const measuredRequests = 100;
const loadConcurrency = 50;
const loadWarmUpWaves = 2;
const loadMeasuredWaves = 20;
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

async function requestAttempt(baseUrl, token, query) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/v1/customers?${query}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const text = await response.text();
    const elapsedMs = performance.now() - startedAt;
    if (response.status !== 200) {
      return { startedAt, elapsedMs, status: response.status, errorType: 'unexpected_status' };
    }
    try {
      validateListResponse(JSON.parse(text));
      return { startedAt, elapsedMs, status: response.status, errorType: null };
    } catch {
      return { startedAt, elapsedMs, status: response.status, errorType: 'invalid_response' };
    }
  } catch {
    return {
      startedAt,
      elapsedMs: performance.now() - startedAt,
      status: null,
      errorType: 'request_error',
    };
  }
}

async function requestOnce(baseUrl, token, query) {
  const result = await requestAttempt(baseUrl, token, query);
  if (result.errorType !== null) {
    const status = result.status === null ? 'request error' : `HTTP ${result.status}`;
    throw new Error(`Customer benchmark request failed with ${status}.`);
  }
  return result.elapsedMs;
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

function poolSnapshot() {
  return {
    total: database?.totalCount ?? 0,
    idle: database?.idleCount ?? 0,
    waiting: database?.waitingCount ?? 0,
  };
}

function recordPoolObservation(observation, snapshot = poolSnapshot()) {
  observation.max_total = Math.max(observation.max_total, snapshot.total);
  observation.min_idle = Math.min(observation.min_idle, snapshot.idle);
  observation.max_waiting = Math.max(observation.max_waiting, snapshot.waiting);
}

async function executeWave(baseUrl, scenario, observePool) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const requests = Array.from({ length: loadConcurrency }, async () => {
    await gate;
    return requestAttempt(baseUrl, scenario.token, scenario.query);
  });
  const observation = { max_total: 0, min_idle: Number.POSITIVE_INFINITY, max_waiting: 0 };
  let timer;
  if (observePool) {
    recordPoolObservation(observation);
    timer = setInterval(() => recordPoolObservation(observation), 1);
  }
  release();
  const results = await Promise.all(requests);
  if (timer !== undefined) clearInterval(timer);
  if (observePool) recordPoolObservation(observation);
  return {
    results,
    pool: observation,
    start_spread_ms: Math.max(...results.map((result) => result.startedAt)) -
      Math.min(...results.map((result) => result.startedAt)),
  };
}

async function waitForPoolIdle() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const snapshot = poolSnapshot();
    if (snapshot.waiting === 0 && snapshot.idle === snapshot.total) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return poolSnapshot();
}

async function measureLoadScenario(baseUrl, scenario) {
  for (let wave = 0; wave < loadWarmUpWaves; wave += 1) {
    const warmUp = await executeWave(baseUrl, scenario, false);
    if (warmUp.results.some((result) => result.errorType !== null)) {
      throw new Error(`Warm-up failed for load scenario: ${scenario.name}.`);
    }
  }

  const results = [];
  const pool = { max_total: 0, min_idle: Number.POSITIVE_INFINITY, max_waiting: 0 };
  let maxStartSpreadMs = 0;
  for (let wave = 0; wave < loadMeasuredWaves; wave += 1) {
    const measurement = await executeWave(baseUrl, scenario, true);
    results.push(...measurement.results);
    pool.max_total = Math.max(pool.max_total, measurement.pool.max_total);
    pool.min_idle = Math.min(pool.min_idle, measurement.pool.min_idle);
    pool.max_waiting = Math.max(pool.max_waiting, measurement.pool.max_waiting);
    maxStartSpreadMs = Math.max(maxStartSpreadMs, measurement.start_spread_ms);
  }

  const durations = results.map((result) => result.elapsedMs).sort((left, right) => left - right);
  const unexpectedStatus = results.filter((result) => result.errorType === 'unexpected_status').length;
  const requestErrors = results.filter((result) => result.errorType === 'request_error').length;
  const invalidResponses = results.filter((result) => result.errorType === 'invalid_response').length;
  const successes = results.filter((result) => result.errorType === null).length;
  const after = await waitForPoolIdle();
  const result = {
    scenario: scenario.name,
    requests: results.length,
    successes,
    unexpected_statuses: unexpectedStatus,
    request_errors: requestErrors,
    invalid_responses: invalidResponses,
    min_ms: round(durations[0]),
    median_ms: round(median(durations)),
    p95_ms: round(nearestRank(durations, 0.95)),
    p99_ms: round(nearestRank(durations, 0.99)),
    max_ms: round(durations[durations.length - 1]),
    max_start_spread_ms: round(maxStartSpreadMs),
    pool: {
      max_total: pool.max_total,
      min_idle: pool.min_idle,
      max_waiting: pool.max_waiting,
      after,
    },
  };
  const passed = result.successes === loadConcurrency * loadMeasuredWaves &&
    result.unexpected_statuses === 0 && result.request_errors === 0 && result.invalid_responses === 0 &&
    result.p95_ms <= acceptanceMs && after.waiting === 0 && after.idle === after.total;
  return { ...result, status: passed ? 'PASS' : 'FAIL' };
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
    const sequentialScenarios = [
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
    const loadScenarios = [
      { name: 'default list', token: admin, query: 'page=1&page_size=20' },
      { name: 'name low-hit', token: admin, query: `page=1&page_size=20&query=${searchTerms.lowHit}` },
      { name: 'name high-hit', token: admin, query: `page=1&page_size=20&query=${searchTerms.highHit}` },
      { name: 'category filter', token: admin, query: 'page=1&page_size=20&category=T602-CATEGORY-01' },
      { name: 'query + category AND', token: admin, query: `page=1&page_size=20&query=${searchTerms.highHit}&category=T602-CATEGORY-01` },
      { name: 'created_at_desc sort', token: admin, query: 'page=1&page_size=20&sort=created_at_desc' },
      { name: 'deep pagination', token: admin, query: `page=${deepPage}&page_size=100` },
      { name: 'staff scope', token: staff, query: `page=1&page_size=20&query=${searchTerms.highHit}` },
    ];
    const scenarios = loadMode ? loadScenarios : sequentialScenarios;
    const measurements = [];
    for (const scenario of scenarios) {
      measurements.push(loadMode
        ? await measureLoadScenario(baseUrl, scenario)
        : await measureScenario(baseUrl, scenario));
    }

    const explains = loadMode ? undefined : {
        'default list': await explain(client, {}),
        'staff scope': await explain(client, { ownerScopeUserId: e2eStaff.id, query: searchTerms.highHit }),
        'name high-hit': await explain(client, { query: searchTerms.highHit }),
        'deep pagination': await explain(client, { limit: 100, offset: (deepPage - 1) * 100 }),
      };
    const output = {
      benchmark: loadMode ? 'T-603' : 'T-602',
      environment: {
        node_version: process.version,
        postgres_version: inspection.postgres_version,
        concurrency: loadMode ? loadConcurrency : 1,
        pool_max: database?.options.max ?? null,
        ...(loadMode ? {
          warm_up_waves: loadWarmUpWaves,
          measured_waves: loadMeasuredWaves,
          requests_per_wave: loadConcurrency,
          measured_requests_per_scenario: loadConcurrency * loadMeasuredWaves,
        } : {
          warm_up_requests: warmUpRequests,
          measured_requests: measuredRequests,
        }),
        acceptance_ms: acceptanceMs,
      },
      dataset: inspection.dataset,
      deep_pagination: { page: deepPage, page_size: 100, offset: (deepPage - 1) * 100 },
      measurements,
      ...(explains === undefined ? { explain_evidence: 'T-602 plans reused; concurrency does not change SQL plans.' } : { explains }),
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
