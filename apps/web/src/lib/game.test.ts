import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { bandFor } from '@gw/shared';
import {
  bestGuess,
  isAdjacent,
  isSavedGame,
  rankedGuesses,
  trendOf,
  type Guess,
  type SavedGame,
} from './game';

const g = (code: string, distanceKm: number): Guess => ({
  code,
  distanceKm,
  band: bandFor(distanceKm, code === 'ANS'),
});

describe('isAdjacent', () => {
  it('is true for a wrong guess at 0 km (a shared border)', () => {
    expect(isAdjacent({ code: 'ESP', distanceKm: 0, band: 'burning' })).toBe(true);
  });

  it('is false for the answer itself and for any distance above zero', () => {
    expect(isAdjacent({ code: 'FRA', distanceKm: 0, band: 'found' })).toBe(false);
    expect(isAdjacent({ code: 'GBR', distanceKm: 33, band: 'burning' })).toBe(false);
  });
});

describe('trendOf (FR-21)', () => {
  it('calls the first guess "first"', () => {
    expect(trendOf([g('BRA', 9000)], 0)).toBe('first');
  });

  it('compares with the best earlier guess, not the previous one', () => {
    const guesses = [g('BRA', 9000), g('ESP', 1200), g('JPN', 8000), g('ITA', 900)];
    expect(trendOf(guesses, 1)).toBe('warmer');
    // 8,000 km is better than the previous 9,000 but worse than the best 1,200.
    expect(trendOf(guesses, 2)).toBe('colder');
    expect(trendOf(guesses, 3)).toBe('warmer');
  });

  it('says "same" for a tie with the best guess', () => {
    expect(trendOf([g('ESP', 0), g('BEL', 0)], 1)).toBe('same');
  });

  it('says "found" for the answer, even as the first guess', () => {
    expect(trendOf([g('ANS', 0)], 0)).toBe('found');
    expect(trendOf([g('BRA', 9000), g('ANS', 0)], 1)).toBe('found');
  });

  it('rejects an index with no guess', () => {
    expect(() => trendOf([], 0)).toThrow(RangeError);
    expect(() => trendOf([g('BRA', 1)], 1)).toThrow(RangeError);
  });

  it('is "warmer" exactly when the guess beats every earlier one (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 20000 }), { minLength: 2 }), (kms) => {
        const guesses = kms.map((km, i) => g(`C${i}`, km));
        const i = kms.length - 1;
        const beatsAll = kms.slice(0, i).every((km) => kms[i]! < km);
        expect(trendOf(guesses, i) === 'warmer').toBe(beatsAll);
      }),
    );
  });
});

describe('rankedGuesses (FR-07)', () => {
  it('sorts nearest first and keeps guess order on ties', () => {
    const guesses = [g('BRA', 9000), g('ESP', 0), g('ITA', 900), g('BEL', 0)];
    expect(rankedGuesses(guesses).map((x) => x.code)).toEqual(['ESP', 'BEL', 'ITA', 'BRA']);
  });

  it('does not change the original list', () => {
    const guesses = [g('BRA', 9000), g('ESP', 10)];
    rankedGuesses(guesses);
    expect(guesses.map((x) => x.code)).toEqual(['BRA', 'ESP']);
  });

  it('is a sorted permutation of the input (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 20000 })), (kms) => {
        const guesses = kms.map((km, i) => g(`C${i}`, km));
        const ranked = rankedGuesses(guesses);
        expect([...ranked].sort((a, b) => a.code.localeCompare(b.code))).toEqual(
          [...guesses].sort((a, b) => a.code.localeCompare(b.code)),
        );
        ranked
          .slice(1)
          .forEach((x, i) => expect(x.distanceKm).toBeGreaterThanOrEqual(ranked[i]!.distanceKm));
      }),
    );
  });
});

describe('bestGuess', () => {
  it('is undefined before the first guess', () => {
    expect(bestGuess([])).toBeUndefined();
  });

  it('keeps the earliest of equally close guesses', () => {
    expect(bestGuess([g('BRA', 9000), g('ESP', 5), g('PRT', 5)])?.code).toBe('ESP');
  });
});

describe('isSavedGame (FR-11)', () => {
  const saved: SavedGame = {
    v: 1,
    date: '2026-11-12',
    dayNumber: 2,
    token: 't',
    guesses: [],
    status: 'playing',
    finished: false,
  };

  it('accepts a game of the same date', () => {
    expect(isSavedGame(saved, '2026-11-12')).toBe(true);
  });

  it('rejects yesterday’s game, other versions and malformed values', () => {
    expect(isSavedGame(saved, '2026-11-13')).toBe(false);
    expect(isSavedGame({ ...saved, v: 2 }, '2026-11-12')).toBe(false);
    expect(isSavedGame({ ...saved, status: 'paused' }, '2026-11-12')).toBe(false);
    expect(isSavedGame({ ...saved, token: undefined }, '2026-11-12')).toBe(false);
    expect(isSavedGame(null, '2026-11-12')).toBe(false);
    expect(isSavedGame('game', '2026-11-12')).toBe(false);
  });
});
