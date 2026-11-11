import { describe, expect, it } from 'vitest';
import {
  bucketOf,
  computeStats,
  isGameRecord,
  previousDay,
  recordGame,
  type GameRecord,
} from './stats';

const won = (date: string, guesses = 4): GameRecord => ({ date, won: true, guesses });
const lost = (date: string, guesses = 9): GameRecord => ({ date, won: false, guesses });

describe('previousDay', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(previousDay('2026-11-11')).toBe('2026-11-10');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});

describe('bucketOf', () => {
  it.each([
    [1, 0],
    [2, 1],
    [3, 1],
    [6, 2],
    [7, 3],
    [15, 4],
    [16, 5],
    [400, 5],
  ])('%i guesses go in bucket %i', (guesses, bucket) => {
    expect(bucketOf(guesses)).toBe(bucket);
  });
});

describe('recordGame', () => {
  it('replaces the game of the same day and keeps dates sorted', () => {
    const h = recordGame([won('2026-11-12'), lost('2026-11-10')], won('2026-11-10', 3));
    expect(h).toEqual([won('2026-11-10', 3), won('2026-11-12')]);
  });
});

describe('computeStats', () => {
  it('is all zeros before the first game', () => {
    expect(computeStats([], '2026-11-11')).toEqual({
      played: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      averageGuesses: null,
      distribution: [0, 0, 0, 0, 0, 0],
    });
  });

  it('counts played games, win rate, average guesses over wins and the distribution', () => {
    const s = computeStats(
      [won('2026-11-08', 1), won('2026-11-09', 5), lost('2026-11-10', 30), won('2026-11-11', 6)],
      '2026-11-11',
    );
    expect(s.played).toBe(4);
    expect(s.winRate).toBe(75);
    expect(s.averageGuesses).toBe(4);
    expect(s.distribution).toEqual([1, 0, 2, 0, 0, 0]);
  });

  it('keeps the streak while today is not played yet', () => {
    const h = [won('2026-11-09'), won('2026-11-10')];
    expect(computeStats(h, '2026-11-11').currentStreak).toBe(2);
    expect(computeStats([...h, won('2026-11-11')], '2026-11-11').currentStreak).toBe(3);
  });

  it('resets the streak after a give-up', () => {
    expect(computeStats([won('2026-11-10'), lost('2026-11-11')], '2026-11-11').currentStreak).toBe(
      0,
    );
  });

  it('resets the streak after a missed day', () => {
    expect(computeStats([won('2026-11-08'), won('2026-11-09')], '2026-11-11').currentStreak).toBe(
      0,
    );
  });

  it('keeps the best streak ever, broken by losses and gaps', () => {
    const h = [
      won('2026-10-01'),
      won('2026-10-02'),
      won('2026-10-03'),
      lost('2026-10-04'),
      won('2026-10-05'),
      won('2026-10-07'),
      won('2026-10-08'),
    ];
    const s = computeStats(h, '2026-11-11');
    expect(s.bestStreak).toBe(3);
    expect(s.currentStreak).toBe(0);
  });
});

describe('isGameRecord', () => {
  it('accepts a valid record and rejects malformed ones', () => {
    expect(isGameRecord(won('2026-11-11'))).toBe(true);
    expect(isGameRecord(null)).toBe(false);
    expect(isGameRecord({ date: '11/11/2026', won: true, guesses: 3 })).toBe(false);
    expect(isGameRecord({ date: '2026-11-11', won: 'yes', guesses: 3 })).toBe(false);
    expect(isGameRecord({ date: '2026-11-11', won: true, guesses: 2.5 })).toBe(false);
  });
});
