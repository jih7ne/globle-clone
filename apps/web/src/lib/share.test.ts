import { describe, expect, it } from 'vitest';
import type { Guess } from './game';
import { shareText } from './share';

const g = (code: string, distanceKm: number, band: Guess['band']): Guess => ({
  code,
  distanceKm,
  band,
});
const guesses: Guess[] = [
  g('BRA', 9000, 'freezing'),
  g('USA', 4000, 'cool'),
  g('EGY', 2000, 'warm'),
  g('ITA', 600, 'hot'),
  g('ESP', 100, 'burning'),
  g('FRA', 0, 'found'),
];

describe('shareText', () => {
  it('matches the format of the specification after a win', () => {
    expect(
      shareText({ dayNumber: 42, guesses, won: true, streak: 12, url: 'https://gw.pages.dev' }),
    ).toBe(
      [
        'Getting Warmer #42 · 6 guesses',
        '⬜🟦🟨🟧🟥🎯',
        'Streak: 12 days',
        'https://gw.pages.dev',
      ].join('\n'),
    );
  });

  it('says "gave up" and has no target emoji after a give-up', () => {
    const text = shareText({
      dayNumber: 7,
      guesses: guesses.slice(0, 1),
      won: false,
      streak: 0,
      url: 'https://gw.pages.dev',
    });
    expect(text.split('\n')).toEqual([
      'Getting Warmer #7 · gave up after 1 guess',
      '⬜',
      'Streak: 0 days',
      'https://gw.pages.dev',
    ]);
  });

  it('never contains a country name or code', () => {
    const text = shareText({ dayNumber: 1, guesses, won: true, streak: 1, url: '' });
    for (const x of guesses) expect(text).not.toContain(x.code);
    expect(text).toContain('Streak: 1 day');
  });
});
