import type { ReactNode } from 'react';
import type { GlobalStats, NameIndex } from '@gw/shared';
import { colorForDistance } from '@gw/shared';
import { en } from '../i18n/en';
import type { Guess } from '../lib/game';
import { ShareButton } from './ShareButton';

interface Props {
  won: boolean;
  answer: string;
  guesses: readonly Guess[];
  index: NameIndex;
  centers: ReadonlyMap<string, { lat: number; lng: number }>;
  globalStats: GlobalStats | null | undefined;
  /** Current streak, after today's game. */
  streak: number;
  /** Text copied or shared by the Share button (FR-17). */
  share: string;
  /** Rendered at the bottom (the countdown to the next country). */
  footer?: ReactNode;
}

/** Equirectangular projection into a 360 x 180 box. */
const project = ({ lat, lng }: { lat: number; lng: number }) => ({ x: lng + 180, y: 90 - lat });

/** The trail of guesses, in order, ending at the mystery country. */
function MiniMap({ guesses, answer, centers }: Pick<Props, 'guesses' | 'answer' | 'centers'>) {
  const stops = guesses
    .map((g) => ({ g, c: centers.get(g.code) }))
    .filter((s): s is { g: Guess; c: { lat: number; lng: number } } => !!s.c);
  const target = centers.get(answer);
  const t = target ? project(target) : null;
  const path = [
    ...stops.map((s) => project(s.c)),
    ...(t && stops.at(-1)?.g.code !== answer ? [t] : []),
  ];

  return (
    <svg viewBox="0 0 360 180" className="block w-full bg-ink" role="img" aria-label={en.yourPath}>
      {[-60, -30, 0, 30, 60].map((lat) => (
        <line
          key={lat}
          x1={0}
          x2={360}
          y1={90 - lat}
          y2={90 - lat}
          stroke="#2b2b2b"
          strokeWidth={0.6}
        />
      ))}
      {[-120, -60, 0, 60, 120].map((lng) => (
        <line
          key={lng}
          y1={0}
          y2={180}
          x1={lng + 180}
          x2={lng + 180}
          stroke="#2b2b2b"
          strokeWidth={0.6}
        />
      ))}
      <polyline
        points={path.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#ece8df"
        strokeOpacity={0.7}
        strokeWidth={0.8}
        strokeDasharray="2.5 2"
      />
      {stops.map(({ g, c }) => {
        const p = project(c);
        return (
          <rect
            key={g.code}
            x={p.x - 2.6}
            y={p.y - 2.6}
            width={5.2}
            height={5.2}
            fill={g.band === 'found' ? '#e3170a' : colorForDistance(g.distanceKm)}
          />
        );
      })}
      {t && (
        <rect
          x={t.x - 5}
          y={t.y - 5}
          width={10}
          height={10}
          fill="none"
          stroke="#ece8df"
          strokeWidth={1.4}
        />
      )}
    </svg>
  );
}

/** End screen (FR-09): the answer, the trail of guesses and today's global stats. */
export function Postcard({
  won,
  answer,
  guesses,
  index,
  centers,
  globalStats,
  streak,
  share,
  footer,
}: Props) {
  const name = index.byCode.get(answer)?.name[index.lang] ?? answer;
  const stats = globalStats
    ? [
        { value: String(globalStats.players), label: en.statsPlayers },
        { value: String(globalStats.medianGuesses ?? '—'), label: en.statsMedian },
        { value: String(globalStats.meanGuesses ?? '—'), label: en.statsMean },
        { value: `${globalStats.pctWithin5}%`, label: en.statsWithin5 },
      ]
    : null;
  const topFirst = globalStats?.topFirstGuess
    ? (index.byCode.get(globalStats.topFirstGuess)?.name[index.lang] ?? globalStats.topFirstGuess)
    : null;

  return (
    <article className="slide-in border-2 border-ink">
      <header className={`p-4 ${won ? 'bg-burning' : 'bg-ink'} text-paper`}>
        <p className="caption flex justify-between gap-3 opacity-80">
          <span>{won ? en.foundIn(guesses.length) : en.gaveUpAfter(guesses.length)}</span>
          <span>
            {en.streakLabel} {streak}
          </span>
        </p>
        <p className="caption mt-3 opacity-80">{en.answerWas}</p>
        <h2 className="headline mt-1 text-6xl break-words">{name}</h2>
      </header>
      <div className="border-t-2 border-ink">
        <ShareButton text={share} />
      </div>
      <MiniMap guesses={guesses} answer={answer} centers={centers} />
      <section aria-label={en.todayStats} className="border-t-2 border-ink">
        <h3 className="caption border-b-2 border-ink px-4 py-2 text-muted">{en.todayStats}</h3>
        {stats ? (
          <>
            <dl className="grid grid-cols-2">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse p-3 ${i % 2 ? 'border-l-2 border-ink' : ''} ${
                    i > 1 ? 'border-t-2 border-ink' : ''
                  }`}
                >
                  <dt className="caption mt-1 text-[10px] text-muted">{s.label}</dt>
                  <dd className="headline text-4xl tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            {topFirst && (
              <p className="caption flex justify-between gap-3 border-t-2 border-ink px-4 py-3">
                <span className="text-muted">{en.statsTopFirst}</span>
                <span>{topFirst}</span>
              </p>
            )}
          </>
        ) : (
          <p className="p-4 text-sm text-muted">{en.statsUnavailable}</p>
        )}
      </section>
      {footer && <div className="border-t-2 border-ink">{footer}</div>}
    </article>
  );
}
