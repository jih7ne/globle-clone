import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/coverage',
      '**/.wrangler',
      '**/node_modules',
      '.cache',
      '.wrangler-e2e',
      'playwright-report',
      'test-results',
      'allure-results',
      'allure-report',
      'lighthouse-report',
      '.lighthouseci',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['*.{js,ts}', 'e2e/**/*.ts', '.github/scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // k6 scripts run in k6's own runtime: web APIs plus its __ENV, __VU and __ITER.
    files: ['perf/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' },
    },
  },
  {
    // Offline build tooling and tests index typed arrays in tight loops; app code stays strict.
    files: ['tools/**/*.ts', '**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
