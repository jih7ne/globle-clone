/**
 * NFR-05: API response time under 200 ms at the 95th percentile.
 *
 * Each iteration plays like a player: /api/start, then a few guesses. /start and /guess
 * never touch the database (stateless signed tokens), so a run never changes the global
 * stats; /finish is never called.
 *
 *   k6 run perf/api.k6.js                                          # production
 *   k6 run -e BASE_URL=http://localhost:8788 -e LOCAL=1 perf/api.k6.js   # 50 users, local
 *
 * Production allows 60 requests a minute per IP (NFR-04) and a test machine has one IP:
 * the default pace stays under it, so the run measures real latency, not the limiter.
 * The specification's 50 concurrent users need a target without that limit: LOCAL=1 gives
 * each request its own IP header, which only the local Worker (`wrangler dev`) trusts.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'https://getting-warmer.pages.dev';
const LOCAL = !!__ENV.LOCAL;
const GUESSES = ['BRA', 'JPN', 'KEN', 'CAN'];
/** Games a minute against production: up to 5 requests each, so at most 50 a minute. */
const RATE = Number(__ENV.RATE || 10);

export const options = {
  scenarios: LOCAL
    ? {
        players: {
          executor: 'constant-vus',
          vus: Number(__ENV.VUS || 50),
          duration: __ENV.DURATION || '1m',
        },
      }
    : {
        players: {
          executor: 'constant-arrival-rate',
          rate: RATE,
          timeUnit: '1m',
          duration: __ENV.DURATION || '3m',
          preAllocatedVUs: 3,
        },
      },
  thresholds: {
    'http_req_duration{route:start}': ['p(95)<200'],
    'http_req_duration{route:guess}': ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

/** The UTC date is always current somewhere, so the API always accepts it (NFR-03). */
const today = () => new Date().toISOString().slice(0, 10);

const fakeIp = () => `10.${__VU % 250}.${__ITER % 250}.${1 + Math.floor(Math.random() * 250)}`;

export default function () {
  const headers = { 'Content-Type': 'application/json' };
  if (LOCAL) headers['CF-Connecting-IP'] = fakeIp();

  const start = http.post(
    `${BASE}/api/start`,
    JSON.stringify({ date: today(), sessionId: crypto.randomUUID() }),
    { headers, tags: { route: 'start' } },
  );
  if (!check(start, { 'start: 200': (r) => r.status === 200 })) return;
  let token = start.json('token');

  for (const iso3 of GUESSES) {
    const res = http.post(`${BASE}/api/guess`, JSON.stringify({ token, iso3 }), {
      headers,
      tags: { route: 'guess' },
    });
    check(res, { 'guess: 200': (r) => r.status === 200 });
    if (res.status !== 200 || res.json('correct')) return; // a win ends the game
    token = res.json('token');
    if (LOCAL) sleep(0.5);
  }
}
