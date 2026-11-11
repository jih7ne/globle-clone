import type { FeedbackRequest } from '@gw/shared';

/** Longest free-text answer kept; anything beyond is cut, not rejected. */
export const MAX_TEXT = 2000;
const MAX_SETUP = 200;

/** One stored answer: free text is null when left empty. */
export interface FeedbackRow {
  device: FeedbackRequest['device'];
  rating: number;
  again: NonNullable<FeedbackRequest['again']> | null;
  problems: string | null;
  ideas: string | null;
  setup: string | null;
  lang: NonNullable<FeedbackRequest['lang']> | null;
}

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | undefined =>
  options.find((o) => o === value);

/** Trimmed text, cut to `max`; null when empty or not a string. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().slice(0, max);
  return t || null;
}

/**
 * Validates a feedback body. Returns the row to store, 'spam' when the honeypot field is
 * filled in (answered as a success, but not stored), or null when invalid.
 */
export function parseFeedback(body: Record<string, unknown>): FeedbackRow | 'spam' | null {
  if (typeof body.website === 'string' && body.website.trim()) return 'spam';
  const device = oneOf(body.device, ['mobile', 'desktop', 'both'] as const);
  const rating = body.rating;
  if (!device || typeof rating !== 'number' || !Number.isInteger(rating)) return null;
  if (rating < 1 || rating > 5) return null;
  return {
    device,
    rating,
    again: oneOf(body.again, ['yes', 'maybe', 'no'] as const) ?? null,
    problems: text(body.problems, MAX_TEXT),
    ideas: text(body.ideas, MAX_TEXT),
    setup: text(body.setup, MAX_SETUP),
    lang: oneOf(body.lang, ['en', 'fr'] as const) ?? null,
  };
}
