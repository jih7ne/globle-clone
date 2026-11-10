import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { signToken, verifyToken, type GamePayload } from './token';

const KEY = 'test-token-key';
const PAYLOAD: GamePayload = {
  v: 1,
  date: '2026-11-20',
  sid: '6f1c2c8e-8a7b-4b5e-9a39-0b6f4f7e2a11',
  guesses: ['FRA', 'DEU'],
  startedAt: 1_795_000_000_000,
};

const b64url = (text: string) =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Signs an arbitrary body with the real key, to test payload validation after the signature. */
async function signRaw(body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const encoded = b64url(body);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(encoded)));
  return `${encoded}.${b64url(String.fromCharCode(...sig))}`;
}

describe('game token', () => {
  it('round-trips a payload', async () => {
    const token = await signToken(PAYLOAD, KEY);
    expect(await verifyToken(token, KEY)).toEqual(PAYLOAD);
  });

  it('uses URL-safe characters only', async () => {
    expect(await signToken(PAYLOAD, KEY)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('rejects a token signed with another key', async () => {
    expect(await verifyToken(await signToken(PAYLOAD, 'other-key'), KEY)).toBeNull();
  });

  it('rejects a payload changed after signing (e.g. removing guesses)', async () => {
    const [, sig] = (await signToken(PAYLOAD, KEY)).split('.');
    const forged = b64url(JSON.stringify({ ...PAYLOAD, guesses: ['FRA'] }));
    expect(await verifyToken(`${forged}.${sig}`, KEY)).toBeNull();
  });

  it('rejects any single-character change (property)', async () => {
    const token = await signToken(PAYLOAD, KEY);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: token.length - 1 }),
        fc.constantFrom(...alphabet),
        async (pos, ch) => {
          fc.pre(token[pos] !== '.' && token[pos] !== ch);
          const changed = token.slice(0, pos) + ch + token.slice(pos + 1);
          const result = await verifyToken(changed, KEY);
          // Changing the last character of a base64url segment can leave the bytes unchanged.
          if (result !== null) expect(result).toEqual(PAYLOAD);
        },
      ),
      { numRuns: 200 },
    );
  });

  it.each([
    ['not a string', 42],
    ['empty', ''],
    ['no dot', 'abc'],
    ['three parts', 'a.b.c'],
    ['empty signature', 'abc.'],
    ['invalid characters', 'ab+c.de/f'],
    ['too long', `${'a'.repeat(4096)}.b`],
  ])('rejects a malformed token (%s)', async (_, token) => {
    expect(await verifyToken(token, KEY)).toBeNull();
  });

  it('rejects a correctly signed body that is not JSON', async () => {
    expect(await verifyToken(await signRaw('not json'), KEY)).toBeNull();
  });

  it.each([
    ['wrong version', { ...PAYLOAD, v: 2 }],
    ['guesses not an array', { ...PAYLOAD, guesses: 'FRA' }],
    ['non-string guess', { ...PAYLOAD, guesses: [1] }],
    ['missing date', { ...PAYLOAD, date: undefined }],
    ['missing session', { ...PAYLOAD, sid: undefined }],
    ['missing start time', { ...PAYLOAD, startedAt: '0' }],
    ['null', null],
  ])('rejects a correctly signed payload with %s', async (_, payload) => {
    expect(await verifyToken(await signRaw(JSON.stringify(payload)), KEY)).toBeNull();
  });
});
