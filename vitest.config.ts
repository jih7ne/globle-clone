import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'tools/*'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/*/src/**',
        'apps/api/src/**',
        'tools/geo/src/distance.ts',
        'apps/web/src/lib/stats.ts',
        'apps/web/src/lib/share.ts',
      ],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
});
