import { describe, expect, it } from 'vitest';
import { aggregate, isSuspect } from './stats';

describe('aggregate', () => {
  it('handles a day with no games', () => {
    expect(aggregate('2026-11-20', [], null)).toEqual({
      date: '2026-11-20',
      players: 0,
      wins: 0,
      medianGuesses: null,
      meanGuesses: null,
      pctWithin5: 0,
      topFirstGuess: null,
    });
  });

  it('computes counts, median, mean and the 5-guess share', () => {
    // Wins: 3, 3, 4, 8, 10 ; losses: 2 players.
    const stats = aggregate(
      '2026-11-20',
      [
        { guesses: 8, won: 1, n: 1 },
        { guesses: 3, won: 1, n: 2 },
        { guesses: 10, won: 1, n: 1 },
        { guesses: 4, won: 1, n: 1 },
        { guesses: 12, won: 0, n: 2 },
      ],
      'FRA',
    );
    expect(stats).toMatchObject({
      players: 7,
      wins: 5,
      medianGuesses: 4,
      meanGuesses: 5.6,
      pctWithin5: 43, // 3 of 7
      topFirstGuess: 'FRA',
    });
  });

  it('averages the two middle values for an even number of wins', () => {
    const stats = aggregate(
      'd',
      [
        { guesses: 2, won: 1, n: 1 },
        { guesses: 5, won: 1, n: 1 },
        { guesses: 7, won: 1, n: 1 },
        { guesses: 20, won: 1, n: 1 },
      ],
      null,
    );
    expect(stats.medianGuesses).toBe(6);
  });

  it('gives no median when everyone gave up', () => {
    const stats = aggregate('d', [{ guesses: 9, won: 0, n: 3 }], null);
    expect(stats).toMatchObject({ players: 3, wins: 0, medianGuesses: null, pctWithin5: 0 });
  });
});

describe('isSuspect', () => {
  it.each([
    [150, 3000, false],
    [151, 60_000, true],
    [5, 2999, true],
    [1, 3000, false],
  ])('%i guesses in %i ms -> %s', (guesses, ms, expected) => {
    expect(isSuspect(guesses, ms)).toBe(expected);
  });
});
