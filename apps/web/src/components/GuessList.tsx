import { useState } from 'react';
import { colorForDistance, type NameIndex } from '@gw/shared';
import { useT } from '../i18n/context';
import { rankedGuesses, trendOf, type Guess } from '../lib/game';

type View = 'ranked' | 'chronological';

/** Bar length: full at 0 km, shrinking with distance (square root, so near guesses spread out). */
const closeness = (km: number) => Math.max(3, 100 * (1 - Math.sqrt(Math.min(km, 20000) / 20000)));

/** FR-07: the guesses, ranked by distance (default) or in the order they were made. */
export function GuessList({ guesses, index }: { guesses: readonly Guess[]; index: NameIndex }) {
  const { t: en } = useT();
  const [view, setView] = useState<View>('ranked');
  if (guesses.length === 0) return null;

  const rows =
    view === 'ranked'
      ? rankedGuesses(guesses).map((g) => ({ g, i: guesses.indexOf(g) }))
      : guesses.map((g, i) => ({ g, i })).reverse();

  return (
    <section aria-label={en.guessesHeading(guesses.length)} className="flex flex-col">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h2 className="caption">{en.guessesHeading(guesses.length)}</h2>
        <div className="caption flex border-2 border-ink" role="group">
          {(['ranked', 'chronological'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-2 py-1 uppercase not-first:border-l-2 not-first:border-ink ${
                view === v ? 'bg-ink text-paper' : 'hover:bg-ink/10'
              }`}
            >
              {v === 'ranked' ? en.viewRanked : en.viewChronological}
            </button>
          ))}
        </div>
      </div>
      <ol>
        {rows.map(({ g, i }) => {
          const trend = trendOf(guesses, i);
          const color =
            g.band === 'found' ? 'var(--color-burning)' : colorForDistance(g.distanceKm);
          return (
            <li
              key={g.code}
              className="grid grid-cols-[2rem_minmax(0,9rem)_1fr_5.5rem] items-center gap-3 border-b border-ink/25 py-2"
            >
              <span className="caption text-muted tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="truncate font-bold uppercase">
                {index.byCode.get(g.code)?.name[index.lang] ?? g.code}
              </span>
              <span className="flex items-center gap-2" aria-hidden="true">
                <span
                  className="h-2.5 transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${closeness(g.distanceKm)}%`, background: color }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums">
                {view === 'chronological' && en.trendArrow[trend] && (
                  <span
                    aria-label={en.trends[trend]}
                    className={`mr-1.5 text-[10px] ${
                      trend === 'warmer' ? 'text-burning' : trend === 'colder' ? 'text-cool' : ''
                    }`}
                  >
                    {en.trendArrow[trend]}
                  </span>
                )}
                {en.km(g.distanceKm)}
                <span className="sr-only">, {en.bands[g.band]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
