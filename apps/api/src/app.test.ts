/**
 * API integration tests: the real Hono app against a real local D1 database (Miniflare),
 * with an injectable clock and a fake rate limiter.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FinishResponse, GlobalStats, GuessResponse, StartResponse } from '@gw/shared';
import { createApp, type Env } from './app';
import { createDailyPicker } from './daily';
import distances from './data/distances.json';
import { dayNumber } from './dates';

const SECRET = 'test-secret';
const TOKEN_KEY = 'test-token-key';
const LAUNCH_DATE = '2026-11-10';
const TODAY = '2026-11-20';
const SESSION = '6f1c2c8e-8a7b-4b5e-9a39-0b6f4f7e2a11';
const OTHER_SESSION = 'a3d5e7f9-1b2c-4d3e-8f4a-5b6c7d8e9f00';

let mf: Miniflare;
let db: D1Database;
let nowMs: number;
let allowRequests: boolean;
let limiterKeys: string[];

const answer = await createDailyPicker(SECRET, distances.codes)(dayNumber(TODAY, LAUNCH_DATE));
const wrongGuess = distances.codes.find((c) => c !== answer)!;
const distance = (a: string, b: string) =>
  distances.km[distances.codes.indexOf(a)]![distances.codes.indexOf(b)]!;

const app = createApp({ now: () => nowMs });

function env(overrides: Partial<Env> = {}): Env {
  return {
    DB: db,
    RATE_LIMITER: {
      limit: async ({ key }: { key: string }) => {
        limiterKeys.push(key);
        return { success: allowRequests };
      },
    } as RateLimit,
    SECRET,
    TOKEN_KEY,
    LAUNCH_DATE,
    ...overrides,
  };
}

async function post(path: string, body: unknown, envOverrides: Partial<Env> = {}) {
  const res = await app.request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    env(envOverrides),
  );
  // Responses are checked field by field below; `any` keeps the assertions short.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, headers: res.headers, json: (await res.json()) as any };
}

const start = async (sessionId = SESSION, date = TODAY) =>
  (await post('/api/start', { date, sessionId })).json as StartResponse;

async function guess(token: string, iso3: string) {
  return post('/api/guess', { token, iso3 });
}

/** Plays a won game: one wrong guess, then the answer. Returns the final token. */
async function playToWin(sessionId = SESSION): Promise<string> {
  let { token } = await start(sessionId);
  token = (await guess(token, wrongGuess)).json.token;
  return (await guess(token, answer)).json.token;
}

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response(null); } }',
    d1Databases: ['DB'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  // Every migration, in order, like `wrangler d1 migrations apply` (one statement each).
  const dir = join(import.meta.dirname, '../migrations');
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8').replace(/--.*$/gm, '').trim();
    await db.prepare(sql).run();
  }
});

afterAll(async () => {
  await mf.dispose();
});

beforeEach(async () => {
  await db.prepare('DELETE FROM results').run();
  await db.prepare('DELETE FROM feedback').run();
  nowMs = Date.parse(`${TODAY}T12:00:00Z`);
  allowRequests = true;
  limiterKeys = [];
});

describe('POST /api/start', () => {
  it('returns the day number and a token that does not contain the answer', async () => {
    const res = await post('/api/start', { date: TODAY, sessionId: SESSION });
    expect(res.status).toBe(200);
    expect(res.json.dayNumber).toBe(11);
    const payload = atob(res.json.token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'));
    expect(JSON.parse(payload)).toMatchObject({ date: TODAY, sid: SESSION, guesses: [] });
    expect(payload).not.toContain(answer);
  });

  it.each([
    ['a body that is not JSON', 'nope', 'invalid_body'],
    ['a JSON array', '[]', 'invalid_body'],
    ['an impossible date', { date: '2026-02-30', sessionId: SESSION }, 'invalid_date'],
    ['a missing date', { sessionId: SESSION }, 'invalid_date'],
    ['a date not live anywhere', { date: '2026-11-22', sessionId: SESSION }, 'date_out_of_range'],
    ['a past date', { date: '2026-11-18', sessionId: SESSION }, 'date_out_of_range'],
    ['a session that is not a UUID', { date: TODAY, sessionId: 'abc' }, 'invalid_session'],
  ])('rejects %s with 400', async (_, body, error) => {
    const res = await post('/api/start', body);
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ error });
  });

  it('accepts tomorrow once it is live in UTC+14', async () => {
    nowMs = Date.parse(`${TODAY}T10:00:00Z`);
    expect((await post('/api/start', { date: '2026-11-21', sessionId: SESSION })).status).toBe(200);
    nowMs -= 1000;
    expect((await post('/api/start', { date: '2026-11-21', sessionId: SESSION })).status).toBe(400);
  });

  it('rejects dates before launch', async () => {
    const res = await post(
      '/api/start',
      { date: TODAY, sessionId: SESSION },
      { LAUNCH_DATE: '2026-11-21' },
    );
    expect(res.json).toEqual({ error: 'before_launch' });
  });
});

describe('POST /api/guess', () => {
  it('returns the distance and band of a wrong guess, without the answer', async () => {
    const { token } = await start();
    const res = await guess(token, wrongGuess);
    const body = res.json as GuessResponse;
    expect(res.status).toBe(200);
    expect(body.correct).toBe(false);
    expect(body.distanceKm).toBe(distance(wrongGuess, answer));
    expect(body).not.toHaveProperty('answer');
    expect(JSON.stringify(body)).not.toContain(`"${answer}"`);
    expect(body.token).not.toBe(token);
  });

  it('reveals the answer on a correct guess', async () => {
    const { token } = await start();
    const res = await guess(token, answer.toLowerCase());
    expect(res.json).toMatchObject({ correct: true, answer, band: 'found', distanceKm: 0 });
  });

  it('rejects an unknown country', async () => {
    const { token } = await start();
    expect((await guess(token, 'XXX')).json).toEqual({ error: 'unknown_country' });
    expect((await post('/api/guess', { token })).status).toBe(400);
  });

  it('rejects a country already guessed (409)', async () => {
    let { token } = await start();
    token = (await guess(token, wrongGuess)).json.token;
    const res = await guess(token, wrongGuess);
    expect(res.status).toBe(409);
    expect(res.json).toEqual({ error: 'already_guessed' });
  });

  it('rejects guesses after the game is won (409)', async () => {
    const token = await playToWin();
    const other = distances.codes.find((c) => c !== answer && c !== wrongGuess)!;
    expect((await guess(token, other)).json).toEqual({ error: 'game_over' });
  });

  it('rejects a forged, foreign or missing token (401)', async () => {
    const { token } = await start();
    const [body, sig] = token.split('.');
    const forged = btoa(atob(body!.replace(/-/g, '+').replace(/_/g, '/')).replace('[]', '["FRA"]'))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    for (const bad of [`${forged}.${sig}`, 'garbage', undefined]) {
      const res = await guess(bad as string, wrongGuess);
      expect(res.status).toBe(401);
      expect(res.json).toEqual({ error: 'invalid_token' });
    }
    const foreign = await post('/api/guess', { token, iso3: wrongGuess }, { TOKEN_KEY: 'other' });
    expect(foreign.status).toBe(401);
  });

  it('rejects a token whose date is no longer live (401)', async () => {
    const { token } = await start();
    nowMs += 2 * 24 * 3_600_000;
    const res = await guess(token, wrongGuess);
    expect(res.status).toBe(401);
    expect(res.json).toEqual({ error: 'token_expired' });
  });
});

describe('POST /api/finish', () => {
  it('records a win from the token and returns the global stats', async () => {
    const token = await playToWin();
    nowMs += 60_000;
    const res = await post('/api/finish', { token });
    const body = res.json as FinishResponse;
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ answer, won: true, guesses: 2 });
    expect(body.globalStats).toMatchObject({
      players: 1,
      wins: 1,
      medianGuesses: 2,
      topFirstGuess: wrongGuess,
    });
  });

  it('reveals the answer when the player gives up', async () => {
    let { token } = await start();
    token = (await guess(token, wrongGuess)).json.token;
    nowMs += 60_000;
    expect((await post('/api/finish', { token })).json).toMatchObject({
      answer,
      won: false,
      guesses: 1,
    });
  });

  it('ignores results claimed by the client (NFR-14)', async () => {
    const { token } = await start();
    nowMs += 60_000;
    const res = await post('/api/finish', { token, won: true, guesses: 1 });
    expect(res.json).toMatchObject({ won: false, guesses: 0 });
  });

  it('accepts only one finish per session and date (409)', async () => {
    const token = await playToWin();
    nowMs += 60_000;
    expect((await post('/api/finish', { token })).status).toBe(200);
    const again = await post('/api/finish', { token });
    expect(again.status).toBe(409);
    expect(again.json).toEqual({ error: 'already_finished' });
  });

  it('rejects a finish without a valid token (401)', async () => {
    expect((await post('/api/finish', {})).status).toBe(401);
    expect((await post('/api/finish', { token: 'x.y' })).status).toBe(401);
    expect((await post('/api/finish', 'nope')).status).toBe(400);
  });

  it('flags games finished in under 3 seconds as suspect and leaves them out of the stats', async () => {
    const token = await playToWin();
    nowMs += 2_000;
    const res = await post('/api/finish', { token });
    expect(res.json.globalStats.players).toBe(0);
    const row = await db.prepare('SELECT suspect FROM results').first<{ suspect: number }>();
    expect(row?.suspect).toBe(1);
  });

  it('still ends the game when D1 is unavailable (NFR-07)', async () => {
    const token = await playToWin();
    const broken = {
      prepare: () => {
        throw new Error('D1_ERROR: daily limit exceeded');
      },
    } as unknown as D1Database;
    const res = await post('/api/finish', { token }, { DB: broken });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ answer, won: true, globalStats: null });
  });
});

describe('GET /api/stats', () => {
  it('aggregates finished games for a date and is cacheable for 5 minutes', async () => {
    for (const sid of [SESSION, OTHER_SESSION]) {
      const token = await playToWin(sid);
      nowMs += 10_000;
      await post('/api/finish', { token });
    }
    const res = await app.request(`/api/stats?date=${TODAY}`, {}, env());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect((await res.json()) as GlobalStats).toMatchObject({
      date: TODAY,
      players: 2,
      wins: 2,
      medianGuesses: 2,
      pctWithin5: 100,
    });
  });

  it('rejects an invalid date', async () => {
    const res = await app.request('/api/stats?date=yesterday', {}, env());
    expect(res.status).toBe(400);
  });
});

describe('rate limiting (NFR-04)', () => {
  it('passes the client IP as the key and returns 429 with Retry-After when over the limit', async () => {
    allowRequests = false;
    const res = await post('/api/start', { date: TODAY, sessionId: SESSION });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(res.json).toEqual({ error: 'rate_limited' });
    expect(limiterKeys).toEqual(['203.0.113.7']);
  });
});

describe('other routes', () => {
  it('answers the health check', async () => {
    const res = await app.request('/api/health', {}, env());
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await app.request('/api/nope', {}, env());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });
});

describe('POST /api/feedback', () => {
  const rows = async () =>
    (await db.prepare('SELECT * FROM feedback').all<Record<string, unknown>>()).results;

  it('stores an answer without anything identifying', async () => {
    const res = await post('/api/feedback', {
      device: 'mobile',
      rating: 4,
      again: 'yes',
      problems: '  The globe was slow  ',
      ideas: 'A hard mode',
      setup: 'Pixel 7, Chrome',
      lang: 'fr',
    });
    expect(res.status).toBe(201);
    const [row] = await rows();
    expect(row).toMatchObject({
      device: 'mobile',
      rating: 4,
      again: 'yes',
      problems: 'The globe was slow',
      ideas: 'A hard mode',
      setup: 'Pixel 7, Chrome',
      lang: 'fr',
    });
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
  });

  it('accepts the two required answers alone', async () => {
    expect((await post('/api/feedback', { device: 'both', rating: 1 })).status).toBe(201);
    expect(await rows()).toHaveLength(1);
  });

  it('rejects a missing device or an out-of-range rating', async () => {
    for (const body of [
      { rating: 3 },
      { device: 'tv', rating: 3 },
      { device: 'desktop', rating: 6 },
      { device: 'desktop', rating: 2.5 },
      'not json',
    ]) {
      expect((await post('/api/feedback', body)).status).toBe(400);
    }
    expect(await rows()).toHaveLength(0);
  });

  it('answers bots that fill the hidden field as if it worked, and stores nothing', async () => {
    const res = await post('/api/feedback', {
      device: 'desktop',
      rating: 5,
      website: 'http://spam',
    });
    expect(res.status).toBe(201);
    expect(await rows()).toHaveLength(0);
  });
});
