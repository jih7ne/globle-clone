import type { GlobalStats } from '@gw/shared';

export interface ResultRow {
  guesses: number;
  won: number;
  n: number;
}

/** A finished game is suspect (left out of global stats) if it is implausibly long or fast. */
export const SUSPECT_MAX_GUESSES = 150;
export const SUSPECT_MIN_DURATION_MS = 3000;

export function isSuspect(guesses: number, durationMs: number): boolean {
  return guesses > SUSPECT_MAX_GUESSES || durationMs < SUSPECT_MIN_DURATION_MS;
}

/** Builds the global stats from rows grouped by (guesses, won) with a count `n`. */
export function aggregate(
  date: string,
  rows: ResultRow[],
  topFirstGuess: string | null,
): GlobalStats {
  const players = rows.reduce((sum, r) => sum + r.n, 0);
  const wins = rows.filter((r) => r.won === 1).sort((a, b) => a.guesses - b.guesses);
  const winCount = wins.reduce((sum, r) => sum + r.n, 0);
  const within5 = wins.filter((r) => r.guesses <= 5).reduce((sum, r) => sum + r.n, 0);

  return {
    date,
    players,
    wins: winCount,
    medianGuesses: median(wins, winCount),
    meanGuesses:
      winCount === 0
        ? null
        : Math.round((wins.reduce((sum, r) => sum + r.guesses * r.n, 0) / winCount) * 10) / 10,
    pctWithin5: players === 0 ? 0 : Math.round((within5 / players) * 100),
    topFirstGuess,
  };
}

/** Median of a sorted histogram. */
function median(sorted: ResultRow[], total: number): number | null {
  if (total === 0) return null;
  const valueAt = (k: number) => {
    let seen = 0;
    for (const r of sorted) {
      seen += r.n;
      if (k < seen) return r.guesses;
    }
    /* c8 ignore next */
    throw new Error('unreachable');
  };
  return total % 2 === 1
    ? valueAt((total - 1) / 2)
    : (valueAt(total / 2 - 1) + valueAt(total / 2)) / 2;
}
