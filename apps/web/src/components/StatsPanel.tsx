import { en } from '../i18n/en';
import { DISTRIBUTION_BUCKETS, bucketOf, type PersonalStats } from '../lib/stats';
import { SidePanel } from './SidePanel';

interface Props {
  stats: PersonalStats;
  /** Guess count of today's win, highlighted in the distribution. */
  todayWinGuesses: number | null;
  onClose: () => void;
}

/** FR-16: personal stats, computed from this device's history. */
export function StatsPanel({ stats, todayWinGuesses, onClose }: Props) {
  const tiles = [
    { value: String(stats.played), label: en.statPlayed },
    { value: `${stats.winRate}%`, label: en.statWinRate },
    { value: String(stats.currentStreak), label: en.statStreak },
    { value: String(stats.bestStreak), label: en.statBestStreak },
  ];
  const max = Math.max(1, ...stats.distribution);
  const todayBucket = todayWinGuesses === null ? -1 : bucketOf(todayWinGuesses);

  return (
    <SidePanel title={en.stats} onClose={onClose}>
      <dl className="grid grid-cols-2 border-b-2 border-ink">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={`flex flex-col-reverse p-5 ${i % 2 ? 'border-l-2 border-ink' : ''} ${
              i > 1 ? 'border-t-2 border-ink' : ''
            }`}
          >
            <dt className="caption mt-1 text-muted">{t.label}</dt>
            <dd className="headline text-7xl tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>

      <section className="p-5" aria-labelledby="dist-title">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 id="dist-title" className="caption text-muted">
            {en.statDistribution}
          </h3>
          <p className="caption">
            {en.statAverage}: {stats.averageGuesses ?? '—'}
          </p>
        </div>
        {stats.played === 0 ? (
          <p className="text-muted">{en.statEmpty}</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {DISTRIBUTION_BUCKETS.map(([label], i) => {
              const n = stats.distribution[i] ?? 0;
              return (
                <li key={label} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                  <span className="caption tabular-nums">{label}</span>
                  <span className="flex items-center">
                    <span
                      className={`caption flex h-7 min-w-8 items-center justify-end px-2 tabular-nums ${
                        n === 0
                          ? 'border-2 border-ink/25 text-muted'
                          : i === todayBucket
                            ? 'bg-burning text-paper'
                            : 'bg-ink text-paper'
                      }`}
                      style={{ width: `${(100 * n) / max}%` }}
                    >
                      {n}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="caption mt-6 text-[10px] text-muted">{en.statDeviceOnly}</p>
      </section>
    </SidePanel>
  );
}
