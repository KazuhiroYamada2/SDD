import { defineConfig } from '@playwright/test';
import reportsConfig from './playwright.reports.config';

// Reuse the Reports E2E database guard and Backend startup, but run HTTP tests once.
export default defineConfig({
  ...reportsConfig,
  testDir: 'e2e/auth',
  projects: [{ name: 'api', use: { baseURL: 'http://127.0.0.1:3000' } }],
  webServer: Array.isArray(reportsConfig.webServer)
    ? reportsConfig.webServer[0]
    : reportsConfig.webServer,
});
