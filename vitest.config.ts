import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'tools/*'],
    // Results for the Allure report (`npm run report`), next to the Playwright ones.
    reporters: ['default', ['allure-vitest/reporter', { resultsDir: 'allure-results' }]],
    coverage: {
      provider: 'v8',
      // json-summary feeds the README coverage badge (CI, badges job).
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'packages/*/src/**',
        'apps/api/src/**',
        'tools/geo/src/distance.ts',
        'apps/web/src/lib/stats.ts',
        'apps/web/src/lib/share.ts',
        'apps/web/src/lib/game.ts',
        'apps/web/src/lib/date.ts',
      ],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
});
