import type { Band } from '@gw/shared';
import { useT } from '../i18n/context';
import { isAdjacent, type Guess } from '../lib/game';

/** Coldest to hottest: the scale fills one segment per band. */
const LEVELS: { band: Exclude<Band, 'found'>; color: string }[] = [
  { band: 'freezing', color: 'var(--color-freezing)' },
  { band: 'cool', color: 'var(--color-cool)' },
  { band: 'warm', color: 'var(--color-warm)' },
  { band: 'hot', color: 'var(--color-hot)' },
  { band: 'burning', color: 'var(--color-burning)' },
];

interface Props {
  best: Guess | undefined;
  /** Display name of the best guess. */
  bestName: string | null;
  /** Mobile header: no per-band labels under the scale. */
  compact?: boolean;
}

/** The heat gauge (FR-21): filled up to the best band reached so far. */
export function Thermometer({ best, bestName, compact = false }: Props) {
  const { t: en } = useT();
  const found = best?.band === 'found';
  const level = best
    ? found
      ? LEVELS.length
      : LEVELS.findIndex((l) => l.band === best.band) + 1
    : 0;
  const label = best
    ? en.thermometerLabel(en.bands[best.band], found ? 0 : best.distanceKm)
    : en.noGuessesYet;

  return (
    <div
      className="flex flex-col gap-1.5"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={LEVELS.length}
      aria-valuenow={level}
      aria-valuetext={label}
    >
      <div className="caption flex justify-between gap-3" aria-hidden="true">
        <span className="text-muted">{en.bestSoFar}</span>
        <span className="truncate">
          {best && bestName
            ? `${bestName} — ${isAdjacent(best) ? en.bordersIt : en.km(best.distanceKm)}`
            : '—'}
        </span>
      </div>
      <div className="grid h-4 grid-cols-5 border-2 border-ink" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <div
            key={l.band}
            className="border-ink transition-colors duration-500 not-first:border-l-2 motion-reduce:transition-none"
            style={{ background: i < level ? l.color : 'transparent' }}
          />
        ))}
      </div>
      {!compact && (
        <div className="caption grid grid-cols-5 text-[10px]" aria-hidden="true">
          {LEVELS.map((l, i) => (
            <span
              key={l.band}
              className={i === level - 1 ? 'font-semibold text-ink' : 'text-muted'}
            >
              {en.bands[l.band]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
