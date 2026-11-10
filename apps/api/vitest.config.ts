import { defineProject } from 'vitest/config';

// Plain Node tests through Hono's app.request(). Miniflare-based tests arrive with D1 in week 2.
export default defineProject({
  test: { name: 'api', environment: 'node' },
});
