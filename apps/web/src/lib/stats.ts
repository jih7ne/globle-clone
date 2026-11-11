/** Personal stats, kept on the device (specification, section 5). */

/** One finished game. */
export interface GameRecord {
  /** Local date, YYYY-MM-DD. */
  date: string;
  won: boolean;
  guesses: number;
}

export interface PersonalStats {
  played: number;
  /** Wins / played, 0 to 100, rounded; 0 before the first game. */
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  /** Mean guesses over won games, one decimal, or null before the first win. */
  averageGuesses: number | null;
  /** Wins per guess range, in DISTRIBUTION_BUCKETS order. */
  distribution: number[];
}

/** Histogram ranges: [label, lowest, highest] guess counts. */
export const DISTRIBUTION_BUCKETS: readonly [label: string, min: number, max: number][] = [
  ['1', 1, 1],
  ['2–3', 2, 3],
  ['4–6', 4, 6],
  ['7–10', 7, 10],
  ['11–15', 11, 15],
  ['16+', 16, Infinity],
];

export function bucketOf(guesses: number): number {
  return DISTRIBUTION_BUCKETS.findIndex(([, min, max]) => guesses >= min && guesses <= max);
}

/** The calendar day before a YYYY-MM-DD date. */
export function previousDay(date: string): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** Adds or replaces the game of `record.date`; the result is sorted by date. */
export function recordGame(history: readonly GameRecord[], record: GameRecord): GameRecord[] {
  return [...history.filter((r) => r.date !== record.date), record].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function isGameRecord(value: unknown): value is GameRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<GameRecord>;
  return (
    typeof r.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.won === 'boolean' &&
    typeof r.guesses === 'number' &&
    Number.isInteger(r.guesses) &&
    r.guesses >= 0
  );
}

/**
 * Computes the stats on `today` (YYYY-MM-DD). A streak counts consecutive days won; it is
 * reset by a give-up or a missed day. Today's game not being played yet does not break it.
 */
export function computeStats(history: readonly GameRecord[], today: string): PersonalStats {
  const byDate = new Map(history.map((r) => [r.date, r]));
  const wins = history.filter((r) => r.won);

  let currentStreak = 0;
  let day = byDate.has(today) ? today : previousDay(today);
  while (byDate.get(day)?.won) {
    currentStreak++;
    day = previousDay(day);
  }

  let bestStreak = 0;
  let run = 0;
  let last: string | null = null;
  for (const r of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    run = r.won ? (last !== null && previousDay(r.date) === last ? run + 1 : 1) : 0;
    last = r.won ? r.date : null;
    bestStreak = Math.max(bestStreak, run);
  }

  const distribution = DISTRIBUTION_BUCKETS.map(() => 0);
  for (const r of wins) {
    const i = bucketOf(r.guesses);
    if (i >= 0) distribution[i] = (distribution[i] ?? 0) + 1;
  }

  return {
    played: history.length,
    winRate: history.length ? Math.round((100 * wins.length) / history.length) : 0,
    currentStreak,
    bestStreak,
    averageGuesses: wins.length
      ? Math.round((10 * wins.reduce((s, r) => s + r.guesses, 0)) / wins.length) / 10
      : null,
    distribution,
  };
}
