/** Ports and test-only secrets shared by the Playwright config and the tests. */
export const E2E = {
  apiPort: 8788,
  webPort: 4174,
  apiUrl: 'http://localhost:8788',
  webUrl: 'http://localhost:4174',
  /** Test-only values: they only exist in this local Worker. */
  secret: 'e2e-secret',
  tokenKey: 'e2e-token-key',
  /** Local D1 for E2E runs, separate from `npm run dev:api` (git-ignored). */
  dbDir: '../../.wrangler-e2e',
} as const;
