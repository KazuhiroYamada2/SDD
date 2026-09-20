import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

if (process.env.NODE_ENV !== 'e2e' ||
    !process.env.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).pathname !== '/customer_management_e2e') {
  throw new Error('E2E API verification requires the dedicated E2E database.');
}

const port = process.env.PORT || '3100';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/server.js'], { env: process.env, stdio: 'ignore' });

async function get(path) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  return response.json();
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Backend exited before becoming ready.');
    try {
      await get('/health');
      ready = true;
      break;
    } catch { await delay(100); }
  }
  assert.ok(ready, 'Backend did not become ready.');

  const trend = await get('/api/v1/reports/sales-trend?from=2026-01-15&to=2026-03-10');
  assert.deepEqual(trend.items, [
    { month: '2026-01', salesAmount: '3000.00' },
    { month: '2026-02', salesAmount: '0.00' },
    { month: '2026-03', salesAmount: '2000.00' },
  ]);
  const categories = await get('/api/v1/reports/customer-categories');
  assert.deepEqual(categories.items, [
    { category: 'A', customerCount: 2 },
    { category: 'B', customerCount: 2 },
    { category: '未分類', customerCount: 1 },
  ]);
  const staff = await get('/api/v1/reports/staff-performance?from=2026-01-15&to=2026-03-10');
  assert.deepEqual(staff.items.map(({ staffEmail, salesAmount, salesCount }) => ({ staffEmail, salesAmount, salesCount })), [
    { staffEmail: 'sales-a@example.com', salesAmount: '3500.00', salesCount: 3 },
    { staffEmail: 'sales-b@example.com', salesAmount: '1500.00', salesCount: 1 },
  ]);
  const tie = await get('/api/v1/reports/staff-performance?from=2026-04-01&to=2026-04-30');
  assert.deepEqual(tie.items.map(({ staffEmail, salesAmount, salesCount }) => ({ staffEmail, salesAmount, salesCount })), [
    { staffEmail: 'sales-a@example.com', salesAmount: '100.00', salesCount: 1 },
    { staffEmail: 'sales-b@example.com', salesAmount: '100.00', salesCount: 1 },
  ]);
  console.log(JSON.stringify({ health: 'ok', trend: trend.items, categories: categories.items, staff: staff.items, tie: tie.items }));
} finally {
  server.kill();
}
