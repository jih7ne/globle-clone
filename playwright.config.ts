import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

/** Chromium only: Firefox and WebKit reject these permission names. */
const CLIPBOARD = ['clipboard-read', 'clipboard-write'];

/**
 * A deployed site to smoke-test instead (a Pages preview, or production after a deploy).
 * It talks to the production API, so only tests tagged @smoke run: they need no test
 * secret, and they never record a game in the global stats.
 */
const remote = process.env.E2E_BASE_URL;

/**
 * End-to-end tests (specification, section 10): the production build of the front end
 * against a local Worker with its own secret and its own empty database.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Each test drives a WebGL globe; more than two at once overloads a laptop as well as CI.
  workers: 2,
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results' }],
    // On CI, failures also become annotations: readable on the run page and from the API.
    ...(process.env.CI ? [['html', { open: 'never' }] as const, ['github'] as const] : []),
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: remote ?? E2E.webUrl,
    trace: 'retain-on-failure',
  },
  projects: remote
    ? [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grep: /@smoke/ },
        { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /(?=.*@smoke)(?=.*@mobile)/ },
      ]
    : [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], permissions: CLIPBOARD } },
        { name: 'mobile', use: { ...devices['Pixel 7'], permissions: CLIPBOARD }, grep: /@mobile/ },
        // NFR-10: the other engines run the whole suite on desktop.
        // Firefox on a Linux CI runner has no WebGL: its globe tests skip (needsWebGL).
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ],
  webServer: remote
    ? []
    : [
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
