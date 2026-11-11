import type { Band, GlobalStats } from '@gw/shared';

export interface Guess {
  code: string;
  distanceKm: number;
  band: Band;
}

export type GameStatus = 'playing' | 'won' | 'lost';

/** What is saved in localStorage for the current day (FR-11). */
export interface SavedGame {
  v: 1;
  date: string;
  dayNumber: number;
  token: string;
  guesses: Guess[];
  status: GameStatus;
  /** Known only after a win or give-up. */
  answer?: string;
  /** True once /api/finish has recorded the game. */
  finished: boolean;
  globalStats?: GlobalStats | null;
}

export type Trend = 'first' | 'warmer' | 'colder' | 'same' | 'found';

/** FR-21: compares guess `i` with the best guess before it. */
export function trendOf(guesses: readonly Guess[], i: number): Trend {
  const guess = guesses[i];
  if (!guess) throw new RangeError(`No guess at ${i}`);
  if (guess.band === 'found') return 'found';
  if (i === 0) return 'first';
  const best = Math.min(...guesses.slice(0, i).map((g) => g.distanceKm));
  return guess.distanceKm < best ? 'warmer' : guess.distanceKm > best ? 'colder' : 'same';
}

/** The closest guess so far, or undefined before the first guess. */
export function bestGuess(guesses: readonly Guess[]): Guess | undefined {
  return guesses.reduce<Guess | undefined>(
    (best, g) => (!best || g.distanceKm < best.distanceKm ? g : best),
    undefined,
  );
}

/** FR-07: ranked view, nearest first; ties keep the order they were guessed in. */
export function rankedGuesses(guesses: readonly Guess[]): Guess[] {
  return [...guesses].sort((a, b) => a.distanceKm - b.distanceKm);
}

export function isSavedGame(value: unknown, date: string): value is SavedGame {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Partial<SavedGame>;
  return (
    g.v === 1 &&
    g.date === date &&
    typeof g.token === 'string' &&
    typeof g.dayNumber === 'number' &&
    Array.isArray(g.guesses) &&
    (g.status === 'playing' || g.status === 'won' || g.status === 'lost')
  );
}
