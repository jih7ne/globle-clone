import { emojiFor } from '@gw/shared';
import type { Guess } from './game';

export interface ShareInput {
  dayNumber: number;
  guesses: readonly Guess[];
  won: boolean;
  streak: number;
  url: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The share text (specification, section 5): one emoji per guess in the order they were
 * made, no country names, so it never spoils the answer.
 */
export function shareText({ dayNumber, guesses, won, streak, url }: ShareInput): string {
  const title = won
    ? `Getting Warmer #${dayNumber} · ${plural(guesses.length, 'guess', 'guesses')}`
    : `Getting Warmer #${dayNumber} · gave up after ${plural(guesses.length, 'guess', 'guesses')}`;
  const emoji = guesses.map((g) => emojiFor(g.band)).join('');
  return [title, emoji, `Streak: ${plural(streak, 'day', 'days')}`, url].filter(Boolean).join('\n');
}
