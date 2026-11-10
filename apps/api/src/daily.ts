/**
 * Daily country selection (specification, section 9).
 *
 * Countries are shuffled once per cycle of `codes.length` days with a Fisher-Yates
 * shuffle driven by a PRNG seeded with HMAC-SHA256(SECRET, "cycle-" + n). Day #1 is the
 * first day of cycle 0, so no country repeats within a cycle and nobody without the
 * secret can predict the order.
 */

/** xoshiro128**: small, fast, good-quality 32-bit PRNG. */
function xoshiro128(seed: Uint32Array): () => number {
  let [a = 0, b = 0, c = 0, d = 0] = seed;
  if ((a | b | c | d) === 0) a = 1; // the all-zero state never changes
  return () => {
    const result = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = rotl(d, 11);
    return result;
  };
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Uniform integer in [0, n) without modulo bias. */
function below(next: () => number, n: number): number {
  const limit = 2 ** 32 - (2 ** 32 % n);
  let x = next();
  while (x >= limit) x = next();
  return x % n;
}

async function hmacSha256(secret: string, message: string): Promise<Uint32Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint32Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

export async function cycleOrder(
  secret: string,
  cycle: number,
  codes: readonly string[],
): Promise<string[]> {
  const next = xoshiro128(await hmacSha256(secret, `cycle-${cycle}`));
  const order = [...codes];
  for (let i = order.length - 1; i > 0; i--) {
    const j = below(next, i + 1);
    const tmp = order[i] as string;
    order[i] = order[j] as string;
    order[j] = tmp;
  }
  return order;
}

/** Returns a function giving the mystery country of a day number (1-based). */
export function createDailyPicker(secret: string, codes: readonly string[]) {
  const cache = new Map<number, Promise<string[]>>();
  return async (day: number): Promise<string> => {
    if (!Number.isInteger(day) || day < 1) throw new RangeError(`Invalid day number: ${day}`);
    const cycle = Math.floor((day - 1) / codes.length);
    let order = cache.get(cycle);
    if (!order) {
      order = cycleOrder(secret, cycle, codes);
      cache.set(cycle, order);
    }
    return (await order)[(day - 1) % codes.length] as string;
  };
}
