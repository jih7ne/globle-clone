import type { Band } from '@gw/shared';
import type { Trend } from '../lib/game';

/**
 * Formatters are costly to create (toLocaleString builds a new one on every call, ~0.6 s
 * per page load on a slow phone): one per locale, created on first use.
 */
const formatters = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();
function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(key: string, make: () => T): T {
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = make()));
  return f as T;
}

/** A YYYY-MM-DD date as a short day, e.g. "Thu, 12 Nov 2026". */
export function formatDay(locale: string, iso: string): string {
  const f = cached(
    `date:${locale}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  );
  // Noon local time: the calendar day of a YYYY-MM-DD string, whatever the time zone.
  return f.format(new Date(`${iso}T12:00:00`));
}

/** A whole number with the locale's thousands separator. */
export function formatNumber(locale: string, n: number): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(locale)).format(n);
}

/** English UI text. Every language (fr.ts) has exactly this shape: see Strings. */
export const en = {
  lang: 'en' as 'en' | 'fr',
  /** Shown on the button that switches to the other language. */
  otherLanguage: { short: 'FR', name: 'Français', lang: 'fr' as 'en' | 'fr' },
  title: 'Getting Warmer',
  menu: 'Menu',
  expandPanel: 'Expand panel',
  collapsePanel: 'Collapse panel',
  dayLabel: (n: number) => `No. ${String(n).padStart(3, '0')}`,
  formatDate: (iso: string) => formatDay('en-GB', iso),

  intro: 'Find the country.',
  introSub: 'One mystery country a day. The closer you get, the hotter it gets.',

  inputLabel: 'Guess a country',
  inputPlaceholder: 'Type a country',
  submit: 'Guess',
  didYouMean: 'Did you mean',
  yes: 'Yes',
  no: 'No',
  unknownCountry: (input: string) => `“${input}” isn’t a country on our list.`,
  alreadyGuessed: (name: string) => `You already guessed ${name}.`,

  bands: {
    found: 'Found',
    burning: 'Burning',
    hot: 'Hot',
    warm: 'Warm',
    cool: 'Cool',
    freezing: 'Freezing',
  } satisfies Record<Band, string>,
  bandRanges: {
    burning: 'under 250 km',
    hot: '250–1,000 km',
    warm: '1,000–2,500 km',
    cool: '2,500–5,000 km',
    freezing: 'over 5,000 km',
  } satisfies Record<Exclude<Band, 'found'>, string>,
  /** Screen-reader text for each trend; also the list's arrow labels. */
  trends: {
    first: 'First guess.',
    warmer: 'Getting warmer.',
    colder: 'Getting colder.',
    same: 'Just as close as your best guess.',
    found: 'You found it.',
  } satisfies Record<Trend, string>,
  trendHeadline: {
    first: 'First guess.',
    warmer: 'Warmer.',
    colder: 'Colder.',
    same: 'Same.',
    found: 'Found it.',
  } satisfies Record<Trend, string>,
  trendSub: {
    first: 'Now use the colour to close in.',
    warmer: 'Closer than any guess so far.',
    colder: 'Further away than your best guess.',
    same: 'Exactly as close as your best guess.',
    found: '',
  } satisfies Record<Trend, string>,
  trendArrow: { first: '', warmer: '▲', colder: '▼', same: '=', found: '●' } satisfies Record<
    Trend,
    string
  >,
  /** A guess at 0 km that is not the answer: it shares a border with it. */
  bordersIt: 'Borders it',
  adjacentHeadline: 'Next door.',
  adjacentSub: (name: string) => `${name} shares a border with the mystery country.`,
  bestSoFar: 'Best so far',
  thermometerLabel: (band: string, km: number | null) =>
    km === null ? 'No guesses yet' : `Best so far: ${band}, ${formatKm(km)}`,
  noGuessesYet: 'No guesses yet',

  guessesHeading: (n: number) => `${n} ${n === 1 ? 'guess' : 'guesses'}`,
  viewRanked: 'Closest',
  viewChronological: 'In order',
  km: formatKm,

  giveUp: 'Give up',
  confirmGiveUp: 'Give up and see the answer? Today will count as a loss.',
  foundIn: (n: number) => `Found in ${n} ${n === 1 ? 'guess' : 'guesses'}`,
  gaveUpAfter: (n: number) => `You gave up after ${n} ${n === 1 ? 'guess' : 'guesses'}`,
  answerWas: 'The answer was',
  yourPath: 'Your path',
  todayStats: 'Today around the world',
  statsPlayers: 'Players',
  statsMedian: 'Median guesses',
  statsWithin5: 'Found in 5 or fewer',
  statsUnavailable: 'Global stats are unavailable right now.',
  statsMean: 'Average',
  statsTopFirst: 'Most common first guess',
  streakLabel: 'Streak',
  share: 'Share result',
  shareCopied: 'Copied',
  shareFailed: 'Couldn’t copy automatically. Select and copy this text:',
  /** First line of the share text (section 5); the game name stays in English. */
  shareTitle: (day: number, n: number, won: boolean) =>
    won
      ? `Getting Warmer #${day} · ${n} ${n === 1 ? 'guess' : 'guesses'}`
      : `Getting Warmer #${day} · gave up after ${n} ${n === 1 ? 'guess' : 'guesses'}`,
  shareStreak: (n: number) => `Streak: ${n} ${n === 1 ? 'day' : 'days'}`,

  stats: 'Stats',
  statPlayed: 'Played',
  statWinRate: 'Win rate',
  statStreak: 'Current streak',
  statBestStreak: 'Best streak',
  statDistribution: 'Wins by number of guesses',
  statAverage: 'Average',
  statEmpty: 'Finish a game to start your stats.',
  statDeviceOnly: 'Stored on this device only. No account, no tracking.',

  about: 'About',
  repoUrl: 'https://github.com/jih7ne/globle-clone',
  aboutRepo: 'Source code on GitHub',
  aboutSections: [
    {
      title: 'The game',
      body: 'One mystery country a day, the same for everyone with the same local date. Each guess tells you how far it is, border to border, and the heat scale goes from Freezing to Burning. Inspired by Globle.',
    },
    {
      title: 'Map data',
      body: 'Borders and names come from Natural Earth (public domain). The 195 playable countries are the UN member states plus the two observer states. Western Sahara is drawn as part of Morocco. Borders are a simplification and do not take sides in any dispute.',
    },
    {
      title: 'Fair play',
      body: 'The answer stays on the server until you win or give up. Each guess is checked with a signed token, so global stats only count real games.',
    },
    {
      title: 'Privacy',
      body: 'No account, no cookies, no tracking. Your stats live in this browser. The server keeps one anonymous row per finished game for the daily stats, never your IP address.',
    },
    {
      title: 'How it is tested',
      body: 'Unit and property tests for the game logic, data tests for every border distance, API integration tests against a real local database, all run in CI on every push.',
    },
  ],
  nextCountry: 'Next country in',
  aboutFeedback: 'Send feedback',

  /** The beta feedback page (/feedback). */
  feedback: {
    pageTitle: 'Feedback',
    intro: 'Six quick questions, two minutes at most. Anonymous: no email, no tracking.',
    required: 'Required',
    optional: 'Optional',
    device: 'Where did you play?',
    devices: { mobile: 'Phone', desktop: 'Computer', both: 'Both' },
    rating: 'How much did you enjoy it?',
    ratingHint: 'From Freezing (not at all) to Burning (loved it).',
    again: 'Would you come back tomorrow?',
    agains: { yes: 'Yes', maybe: 'Maybe', no: 'No' },
    problems: 'Anything confusing, slow or broken?',
    problemsHint: 'What happened, and on which screen.',
    ideas: 'Ideas for the future: what should we add or change?',
    ideasHint: 'Features, modes, design, anything.',
    setup: 'Which phone or browser?',
    setupHint: 'Helps us reproduce bugs. For example: iPhone 13, Safari.',
    submit: 'Send feedback',
    sending: 'Sending…',
    missing: 'Please answer the two required questions.',
    failed: 'Couldn’t send it. Check your connection and try again.',
    tooMany: 'Too many attempts. Wait a minute and try again.',
    thanks: 'Thank you.',
    thanksSub: 'Your feedback was sent. It really helps.',
    backToGame: 'Back to the game',
  },

  howToPlay: 'How to play',
  close: 'Close',
  howToSteps: [
    {
      title: 'Guess a country',
      body: 'Type any country. It lights up on the globe, coloured by how far it is from the mystery country.',
    },
    {
      title: 'Read the heat',
      body: 'Distance is measured border to border, so neighbours are 0 km apart. Red is close, blue is far.',
    },
    {
      title: 'Close in',
      body: 'Unlimited guesses. A new country every day at midnight, your time.',
    },
  ],
  bandsHeading: 'The scale',
  start: 'Start playing',
  globeHint: 'Drag to turn · Scroll to zoom',
  globeUnavailable: 'The globe can’t be shown in this browser. The distances still guide you.',

  offline: 'Can’t reach the server. Your game is saved; try again in a moment.',
  retry: 'Try again',
  clockWrong: 'Your device’s date looks wrong. Check your clock and reload.',
  beforeLaunch: 'The game hasn’t launched yet. Come back soon!',
  finishedElsewhere: 'Today’s game was already finished on this device.',
};

export type Strings = typeof en;

function formatKm(km: number): string {
  return `${formatNumber('en', km)} km`;
}
