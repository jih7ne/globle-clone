import { Hono, type Context } from 'hono';
import {
  bandFor,
  type ApiErrorCode,
  type FinishResponse,
  type GlobalStats,
  type GuessResponse,
  type StartResponse,
} from '@gw/shared';
import distances from './data/distances.json' with { type: 'json' };
import { createDailyPicker } from './daily';
import { dayNumber, isLiveDate, parseDate } from './dates';
import { aggregate, isSuspect, type ResultRow } from './stats';
import { signToken, verifyToken, type GamePayload } from './token';

export interface Env {
  DB: D1Database;
  RATE_LIMITER: RateLimit;
  /** Seeds the daily shuffle. Set with `wrangler secret put SECRET`. */
  SECRET: string;
  /** Signs game tokens. Set with `wrangler secret put TOKEN_KEY`. */
  TOKEN_KEY: string;
  /** Date of day #1, YYYY-MM-DD. */
  LAUNCH_DATE: string;
}

export interface AppOptions {
  /** Clock, injectable for tests. */
  now?: () => number;
}

type Ctx = Context<{ Bindings: Env }>;

const CODES: readonly string[] = distances.codes;
const INDEX = new Map(CODES.map((code, i) => [code, i]));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATS_CACHE_SECONDS = 300;

function distanceKm(a: string, b: string): number {
  const row = distances.km[INDEX.get(a) ?? -1];
  const km = row?.[INDEX.get(b) ?? -1];
  if (km === undefined) throw new Error(`No distance for ${a}-${b}`);
  return km;
}

const fail = (c: Ctx, error: ApiErrorCode, status: 400 | 401 | 404 | 409 | 429) =>
  c.json({ error }, status);

async function readJson(c: Ctx): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await c.req.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function createApp({ now = Date.now }: AppOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();
  const pickers = new Map<string, ReturnType<typeof createDailyPicker>>();
  const answerFor = (env: Env, date: string) => {
    let pick = pickers.get(env.SECRET);
    if (!pick) {
      pick = createDailyPicker(env.SECRET, CODES);
      pickers.set(env.SECRET, pick);
    }
    return pick(dayNumber(date, env.LAUNCH_DATE));
  };

  /** Verifies a token and checks that its date is still live. */
  const readToken = async (
    c: Ctx,
    token: unknown,
  ): Promise<GamePayload | { error: ApiErrorCode }> => {
    const payload = await verifyToken(token, c.env.TOKEN_KEY);
    if (!payload) return { error: 'invalid_token' };
    if (!isLiveDate(payload.date, now())) return { error: 'token_expired' };
    return payload;
  };

  const loadStats = async (db: D1Database, date: string): Promise<GlobalStats> => {
    const [grouped, first] = await db.batch([
      db
        .prepare(
          'SELECT guesses, won, COUNT(*) AS n FROM results WHERE date = ? AND suspect = 0 GROUP BY guesses, won',
        )
        .bind(date),
      db
        .prepare(
          `SELECT first_guess, COUNT(*) AS n FROM results
           WHERE date = ? AND suspect = 0 AND first_guess IS NOT NULL
           GROUP BY first_guess ORDER BY n DESC, first_guess LIMIT 1`,
        )
        .bind(date),
    ]);
    const top = (first?.results[0] as { first_guess: string } | undefined)?.first_guess ?? null;
    return aggregate(date, (grouped?.results ?? []) as unknown as ResultRow[], top);
  };

  // NFR-04: the IP is only a counting key for Cloudflare's rate limiter; it is never stored.
  app.use('/api/*', async (c, next) => {
    const key = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const { success } = await c.env.RATE_LIMITER.limit({ key });
    if (!success) {
      c.header('Retry-After', '60');
      return fail(c, 'rate_limited', 429);
    }
    await next();
  });

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.post('/api/start', async (c) => {
    const body = await readJson(c);
    if (!body) return fail(c, 'invalid_body', 400);
    const { date, sessionId } = body;
    if (parseDate(date) === null) return fail(c, 'invalid_date', 400);
    if (!isLiveDate(date as string, now())) return fail(c, 'date_out_of_range', 400);
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
      return fail(c, 'invalid_session', 400);
    }
    const day = dayNumber(date as string, c.env.LAUNCH_DATE);
    if (day < 1) return fail(c, 'before_launch', 400);

    const token = await signToken(
      { v: 1, date: date as string, sid: sessionId.toLowerCase(), guesses: [], startedAt: now() },
      c.env.TOKEN_KEY,
    );
    return c.json<StartResponse>({ dayNumber: day, token });
  });

  app.post('/api/guess', async (c) => {
    const body = await readJson(c);
    if (!body) return fail(c, 'invalid_body', 400);
    const game = await readToken(c, body.token);
    if ('error' in game) return fail(c, game.error, 401);
    const iso3 = typeof body.iso3 === 'string' ? body.iso3.toUpperCase() : '';
    if (!INDEX.has(iso3)) return fail(c, 'unknown_country', 400);

    const answer = await answerFor(c.env, game.date);
    if (game.guesses.includes(answer)) return fail(c, 'game_over', 409);
    if (game.guesses.includes(iso3)) return fail(c, 'already_guessed', 409);

    const correct = iso3 === answer;
    const km = distanceKm(iso3, answer);
    const token = await signToken({ ...game, guesses: [...game.guesses, iso3] }, c.env.TOKEN_KEY);
    return c.json<GuessResponse>({
      distanceKm: km,
      band: bandFor(km, correct),
      correct,
      ...(correct ? { answer } : {}),
      token,
    });
  });

  app.post('/api/finish', async (c) => {
    const body = await readJson(c);
    if (!body) return fail(c, 'invalid_body', 400);
    const game = await readToken(c, body.token);
    if ('error' in game) return fail(c, game.error, 401);

    // NFR-14: the result comes from the signed token, never from the client.
    const answer = await answerFor(c.env, game.date);
    const won = game.guesses.includes(answer);
    const guesses = game.guesses.length;
    const durationMs = Math.max(0, now() - game.startedAt);

    let globalStats: GlobalStats | null = null;
    try {
      const insert = await c.env.DB.prepare(
        `INSERT INTO results (date, session_id, guesses, won, first_guess, duration_ms, suspect)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (date, session_id) DO NOTHING`,
      )
        .bind(
          game.date,
          game.sid,
          guesses,
          won ? 1 : 0,
          game.guesses[0] ?? null,
          durationMs,
          isSuspect(guesses, durationMs) ? 1 : 0,
        )
        .run();
      if (insert.meta.changes === 0) return fail(c, 'already_finished', 409);
      globalStats = await loadStats(c.env.DB, game.date);
    } catch (err) {
      // NFR-07: if D1 is down or over quota, the game still ends; only the stats are missing.
      console.error('finish: stats unavailable', err);
    }
    return c.json<FinishResponse>({ answer, won, guesses, globalStats });
  });

  app.get('/api/stats', async (c) => {
    const date = c.req.query('date');
    if (parseDate(date) === null) return fail(c, 'invalid_date', 400);

    // Worker responses are not cached by default: use the Cache API where it exists.
    const cache =
      typeof caches === 'undefined' ? null : (caches as unknown as { default: Cache }).default;
    const cacheKey = new Request(new URL(`/api/stats?date=${date}`, c.req.url).toString());
    const hit = await cache?.match(cacheKey);
    if (hit) return hit;

    const res = c.json<GlobalStats>(await loadStats(c.env.DB, date as string), 200, {
      'Cache-Control': `public, max-age=${STATS_CACHE_SECONDS}`,
    });
    if (cache) c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  });

  app.notFound((c) => fail(c, 'not_found', 404));

  return app;
}
