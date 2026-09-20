import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

const e2eEnv = parseEnv(readFileSync(resolve(__dirname, '.env.e2e'), 'utf8'));
const databaseUrl = e2eEnv.DATABASE_URL;
if (e2eEnv.NODE_ENV !== 'e2e' || !databaseUrl) {
  throw new Error('Report E2E requires NODE_ENV=e2e and DATABASE_URL in .env.e2e.');
}

let database: URL;
try {
  database = new URL(databaseUrl);
} catch {
  throw new Error('Report E2E DATABASE_URL is invalid.');
}
if (database.pathname !== '/customer_management_e2e' ||
    database.hostname !== '127.0.0.1' || database.port !== '55432') {
  throw new Error('Report E2E DATABASE_URL must target the dedicated local E2E database.');
}

export default defineConfig({
  testDir: 'e2e/reports',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'npm --prefix backend run dev',
      url: 'http://127.0.0.1:3000/health',
      env: { NODE_ENV: 'e2e', DATABASE_URL: databaseUrl, PORT: '3000', JWT_SECRET: e2eEnv.JWT_SECRET },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      env: { VITE_API_BASE_URL: '' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
