import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

/**
 * End-to-end tests (specification, section 10): the production build of the front end
 * against a local Worker with its own secret and its own empty database.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: E2E.webUrl,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      cwd: 'apps/api',
      command:
        `npx wrangler d1 migrations apply getting-warmer --local --persist-to ${E2E.dbDir} && ` +
        `npx wrangler dev --port ${E2E.apiPort} --persist-to ${E2E.dbDir} ` +
        `--var SECRET:${E2E.secret} --var TOKEN_KEY:${E2E.tokenKey}`,
      url: `${E2E.apiUrl}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      cwd: 'apps/web',
      command: `npx vite build && npx vite preview --port ${E2E.webPort} --strictPort`,
      env: { API_URL: E2E.apiUrl },
      url: E2E.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
