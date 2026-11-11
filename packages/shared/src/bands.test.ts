import { describe, expect, it } from 'vitest';
import { bandFor, colorForDistance, emojiFor } from './bands';

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

describe('colorForDistance', () => {
  it('uses the band colours at the stops', () => {
    expect(colorForDistance(0)).toBe('#e3170a');
    expect(colorForDistance(1000)).toBe('#ff5f00');
    expect(colorForDistance(5000)).toBe('#3b6fe0');
    expect(colorForDistance(8000)).toBe('#9cc8f0');
    expect(colorForDistance(19000)).toBe('#9cc8f0');
  });

  it('interpolates between stops', () => {
    // Halfway between #E3170A and #FF5F00.
    expect(colorForDistance(500)).toBe('#f13b05');
  });

  it('treats negative distances as 0', () => {
    expect(colorForDistance(-5)).toBe('#e3170a');
  });
});
