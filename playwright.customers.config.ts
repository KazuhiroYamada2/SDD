import { defineConfig } from '@playwright/test';
import reportsConfig from './playwright.reports.config';

export default defineConfig({
  ...reportsConfig,
  testDir: 'e2e/customers',
  workers: 1,
});
