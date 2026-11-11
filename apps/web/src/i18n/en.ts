import type { Band } from '@gw/shared';
import type { Trend } from '../lib/game';

/** English UI text. French arrives with i18n in week 5 (FR-13). */
export const en = {
  title: 'Getting Warmer',
  dayLabel: (n: number) => `No. ${String(n).padStart(3, '0')}`,
  formatDate: (iso: string) => {
    // Noon local time: the calendar day of a YYYY-MM-DD string, whatever the time zone.
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },
  loading: 'Loading today’s country…',

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
  nextCountry: 'Next country in',

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

  offline: 'Can’t reach the server. Your game is saved; try again in a moment.',
  retry: 'Try again',
  clockWrong: 'Your device’s date looks wrong. Check your clock and reload.',
  beforeLaunch: 'The game hasn’t launched yet. Come back soon!',
  finishedElsewhere: 'Today’s game was already finished on this device.',
} as const;

export type Strings = typeof en;

function formatKm(km: number): string {
  return `${km.toLocaleString('en')} km`;
}
