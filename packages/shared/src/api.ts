/** Request and response shapes of the API (specification, section 9). */
import type { Band } from './bands';

export interface StartRequest {
  /** The player's local date, YYYY-MM-DD. */
  date: string;
  /** Anonymous random UUID generated once per device. */
  sessionId: string;
}
export interface StartResponse {
  dayNumber: number;
  token: string;
}

export interface GuessRequest {
  token: string;
  /** ISO 3166-1 alpha-3 code of the guessed country. */
  iso3: string;
}
export interface GuessResponse {
  distanceKm: number;
  band: Band;
  correct: boolean;
  /** Present only when `correct` is true. */
  answer?: string;
  token: string;
}

export interface FinishRequest {
  token: string;
}
export interface FinishResponse {
  answer: string;
  won: boolean;
  guesses: number;
  /** Null when the stats store is unavailable (e.g. free-tier quota reached). */
  globalStats: GlobalStats | null;
}

export interface GlobalStats {
  date: string;
  /** Finished games, excluding suspect ones. */
  players: number;
  wins: number;
  /** Median guesses over won games, or null when nobody has won yet. */
  medianGuesses: number | null;
  /** Mean guesses over won games, rounded to one decimal, or null. */
  meanGuesses: number | null;
  /** Share of players who won in 5 guesses or fewer, 0 to 100, rounded. */
  pctWithin5: number;
  /** ISO code of the most common first guess, or null. */
  topFirstGuess: string | null;
}

export type ApiErrorCode =
  | 'invalid_body'
  | 'invalid_date'
  | 'date_out_of_range'
  | 'before_launch'
  | 'invalid_session'
  | 'unknown_country'
  | 'invalid_token'
  | 'token_expired'
  | 'already_guessed'
  | 'game_over'
  | 'already_finished'
  | 'rate_limited'
  | 'not_found';

export interface ApiError {
  error: ApiErrorCode;
}
