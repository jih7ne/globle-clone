import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError, api } from '../lib/api';
import { localDate } from '../lib/date';
import { isSavedGame, type SavedGame } from '../lib/game';
import { KEYS, readJson, sessionId, writeJson } from '../lib/storage';

export type GameError = 'offline' | 'clock' | 'before_launch' | 'finished_elsewhere';

export interface UseGame {
  date: string;
  game: SavedGame | null;
  /** A guess or give-up is in flight. */
  busy: boolean;
  error: GameError | null;
  guess: (code: string) => Promise<void>;
  giveUp: () => Promise<void>;
  retry: () => void;
  /** Switches to a new local date (after midnight). */
  refreshDate: () => void;
}

function errorOf(err: unknown): GameError {
  if (err instanceof ApiError) {
    if (err.code === 'date_out_of_range' || err.code === 'invalid_date') return 'clock';
    if (err.code === 'before_launch') return 'before_launch';
  }
  if (err instanceof NetworkError || err instanceof ApiError) return 'offline';
  throw err;
}

/** The game saved in localStorage, if it belongs to `date` (FR-11). */
function savedGameFor(date: string): SavedGame | null {
  const saved = readJson<unknown>(KEYS.game);
  return isSavedGame(saved, date) ? saved : null;
}

export function useGame(now: () => Date = () => new Date()): UseGame {
  const [date, setDate] = useState(() => localDate(now()));
  const [game, setGameState] = useState<SavedGame | null>(() => savedGameFor(date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GameError | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The latest game, for async callbacks that outlive a render.
  const gameRef = useRef<SavedGame | null>(game);

  const setGame = useCallback((next: SavedGame | null) => {
    gameRef.current = next;
    setGameState(next);
    if (next) writeJson(KEYS.game, next);
  }, []);

  /** Records the end of a game; safe to call again if it failed before (NFR-07). */
  const finish = useCallback(
    async (g: SavedGame) => {
      try {
        const res = await api.finish(g.token);
        setGame({
          ...g,
          status: res.won ? 'won' : 'lost',
          answer: res.answer,
          finished: true,
          globalStats: res.globalStats,
        });
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'already_finished') {
          setGame({ ...g, finished: true, globalStats: null });
          return;
        }
        setError(errorOf(err));
      }
    },
    [setGame],
  );

  // No game for today yet: start one.
  const needsStart = game === null;
  useEffect(() => {
    if (!needsStart) return;
    let cancelled = false;
    api
      .start({ date, sessionId: sessionId() })
      .then(({ dayNumber, token }) => {
        if (cancelled) return;
        setGame({ v: 1, date, dayNumber, token, guesses: [], status: 'playing', finished: false });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [needsStart, date, attempt, setGame]);

  // A game that ended while the API was unreachable is recorded on the next visit.
  useEffect(() => {
    const g = gameRef.current;
    if (g && g.status !== 'playing' && !g.finished) void finish(g);
  }, [finish]);

  const refreshDate = useCallback(() => {
    const next = localDate(now());
    setDate(next);
    setGame(savedGameFor(next));
  }, [now, setGame]);

  const guess = useCallback(
    async (code: string) => {
      const g = gameRef.current;
      if (!g || g.status !== 'playing' || busy) return;
      if (g.guesses.some((x) => x.code === code)) return;
      setBusy(true);
      try {
        const res = await api.guess(g.token, code);
        const next: SavedGame = {
          ...g,
          token: res.token,
          guesses: [...g.guesses, { code, distanceKm: res.distanceKm, band: res.band }],
          ...(res.correct ? { status: 'won' as const, answer: res.answer ?? code } : {}),
        };
        setGame(next);
        setError(null);
        if (res.correct) await finish(next);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'token_expired') {
          // The local day is over: move on to the new country.
          refreshDate();
        } else {
          setError(errorOf(err));
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, finish, refreshDate, setGame],
  );

  const giveUp = useCallback(async () => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing' || busy) return;
    setBusy(true);
    try {
      const res = await api.finish(g.token);
      setGame({
        ...g,
        status: 'lost',
        answer: res.answer,
        finished: true,
        globalStats: res.globalStats,
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'already_finished')
        setError('finished_elsewhere');
      else setError(errorOf(err));
    } finally {
      setBusy(false);
    }
  }, [busy, setGame]);

  const retry = useCallback(() => {
    setError(null);
    const g = gameRef.current;
    if (g && g.status !== 'playing' && !g.finished) void finish(g);
    else if (!g) setAttempt((n) => n + 1);
  }, [finish]);

  return { date, game, busy, error, guess, giveUp, retry, refreshDate };
}
