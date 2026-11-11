import { emojiFor } from '@gw/shared';
import { en, type Strings } from '../i18n/en';
import type { Guess } from './game';

export interface ShareInput {
  dayNumber: number;
  guesses: readonly Guess[];
  won: boolean;
  streak: number;
  url: string;
  /** UI language for the title and streak lines (English by default). */
  t?: Pick<Strings, 'shareTitle' | 'shareStreak'>;
}

/**
 * The share text (specification, section 5): one emoji per guess in the order they were
 * made, no country names, so it never spoils the answer.
 */
export function shareText({ dayNumber, guesses, won, streak, url, t = en }: ShareInput): string {
  const title = t.shareTitle(dayNumber, guesses.length, won);
  const emoji = guesses.map((g) => emojiFor(g.band)).join('');
  return [title, emoji, t.shareStreak(streak), url].filter(Boolean).join('\n');
}
