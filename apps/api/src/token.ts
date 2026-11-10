/**
 * Signed game token (specification, section 9): base64url(payload).base64url(HMAC-SHA256).
 * The client can read the payload, but it holds only the player's own guesses, never the
 * answer, and any change breaks the signature.
 */
export interface GamePayload {
  v: 1;
  /** Player's local date, YYYY-MM-DD. */
  date: string;
  /** Anonymous session ID. */
  sid: string;
  /** ISO codes guessed so far, in order. */
  guesses: string[];
  /** When /start was called, in ms since the epoch. */
  startedAt: number;
}

const enc = new TextEncoder();
const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
    keys.set(secret, key);
  }
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function signToken(payload: GamePayload, secret: string): Promise<string> {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

function isPayload(value: unknown): value is GamePayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.date === 'string' &&
    typeof p.sid === 'string' &&
    typeof p.startedAt === 'number' &&
    Array.isArray(p.guesses) &&
    p.guesses.every((g) => typeof g === 'string')
  );
}

/** Returns the payload if the token is well formed and its signature is valid, else null. */
export async function verifyToken(token: unknown, secret: string): Promise<GamePayload | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const sigBytes = fromBase64Url(sig);
  const bodyBytes = fromBase64Url(body);
  if (!sigBytes || !bodyBytes) return null;
  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    sigBytes,
    enc.encode(body),
  );
  if (!valid) return null;
  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(bodyBytes));
    return isPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}
