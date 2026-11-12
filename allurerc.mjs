import { defineConfig } from 'allure';

/**
 * One Allure report for every level of the test pyramid: Vitest (unit, property, data, API)
 * and Playwright (E2E, security, accessibility, on each browser). `npm run report`.
 */
export default defineConfig({
  name: 'Getting Warmer: test report',
  output: './allure-report',
  plugins: {
    awesome: {
      options: {
        reportLanguage: 'en',
        groupBy: ['parentSuite', 'suite', 'subSuite'],
      },
    },
  },
});
