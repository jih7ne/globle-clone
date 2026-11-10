import { describe, expect, it } from 'vitest';
import { bandFor, emojiFor } from './bands';

describe('bandFor', () => {
  it.each([
    [0, 'burning'],
    [250, 'burning'],
    [250.4, 'burning'],
    [250.5, 'hot'],
    [251, 'hot'],
    [1000, 'hot'],
    [1001, 'warm'],
    [2500, 'warm'],
    [2501, 'cool'],
    [5000, 'cool'],
    [5001, 'freezing'],
    [20000, 'freezing'],
  ] as const)('%d km is %s', (km, band) => {
    expect(bandFor(km)).toBe(band);
  });

  it('returns found for the mystery country', () => {
    expect(bandFor(0, true)).toBe('found');
  });

  it.each([-1, NaN, Infinity])('rejects %d', (km) => {
    expect(() => bandFor(km)).toThrow(RangeError);
  });
});

describe('emojiFor', () => {
  it('maps every band to its share emoji', () => {
    expect(
      ['found', 'burning', 'hot', 'warm', 'cool', 'freezing'].map((b) => emojiFor(b as never)),
    ).toEqual(['🎯', '🟥', '🟧', '🟨', '🟦', '⬜']);
  });
});
