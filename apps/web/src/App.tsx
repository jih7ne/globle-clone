import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { COUNTRIES, buildIndex, colorForDistance } from '@gw/shared';
import { Countdown } from './components/Countdown';
import { GuessInput } from './components/GuessInput';
import { GuessList } from './components/GuessList';
import { HowToPlay } from './components/HowToPlay';
import { Postcard } from './components/Postcard';
import { Thermometer } from './components/Thermometer';
import { useGame, type GameError } from './hooks/useGame';
import { en } from './i18n/en';
import { bestGuess, trendOf, type Trend } from './lib/game';
import { loadGeo, type GeoData } from './lib/geo';
import { KEYS, readJson, writeJson } from './lib/storage';

// three.js is large: load the globe after the rest of the page (NFR-06).
const Globe = lazy(() => import('./components/Globe'));

/** Globe colour of the mystery country once found or revealed. */
const FOUND = '#e3170a';

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

const ERROR_TEXT: Record<GameError, string> = {
  offline: en.offline,
  clock: en.clockWrong,
  before_launch: en.beforeLaunch,
  finished_elsewhere: en.finishedElsewhere,
};

const TREND_COLOR: Partial<Record<Trend, string>> = {
  warmer: 'text-burning',
  colder: 'text-cool',
};

/** Big status line under the masthead: the intro, then how the last guess compares (FR-21). */
function Status({ trend, ready }: { trend: Trend | null; ready: boolean }) {
  const headline = trend ? en.trendHeadline[trend] : ready ? en.intro : en.loading;
  const sub = trend ? en.trendSub[trend] : ready ? en.introSub : '';
  return (
    <div aria-live="polite">
      <p
        key={trend ?? 'intro'}
        className={`headline slide-in text-5xl ${trend ? (TREND_COLOR[trend] ?? '') : ''}`}
      >
        {headline}
      </p>
      {sub && <p className="mt-2 text-[15px] leading-snug text-muted">{sub}</p>}
      {trend && <span className="sr-only">{en.trends[trend]}</span>}
    </div>
  );
}

export function App() {
  const { game, busy, error, guess, giveUp, retry, refreshDate } = useGame();
  const index = useMemo(() => buildIndex(COUNTRIES, 'en'), []);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [showHowTo, setShowHowTo] = useState(() => !readJson<boolean>(KEYS.seenHowTo));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    loadGeo().then(setGeo, (err: unknown) => console.error(err));
  }, []);

  const closeHowTo = useCallback(() => {
    setShowHowTo(false);
    writeJson(KEYS.seenHowTo, true);
  }, []);

  const guesses = useMemo(() => game?.guesses ?? [], [game]);
  const guessed = useMemo(() => new Set(guesses.map((g) => g.code)), [guesses]);
  const best = bestGuess(guesses);
  const last = guesses.at(-1);
  const over = game?.status === 'won' || game?.status === 'lost';
  const trend = last && !over ? trendOf(guesses, guesses.length - 1) : null;
  const answer = over ? (game?.answer ?? null) : null;
  const nameOf = useCallback((code: string) => index.byCode.get(code)?.name.en ?? code, [index]);
  const bestName = best ? nameOf(best.code) : null;

  const colors = useMemo(() => {
    const m = new Map(
      guesses.map((g) => [g.code, g.band === 'found' ? FOUND : colorForDistance(g.distanceKm)]),
    );
    if (answer && !m.has(answer)) m.set(answer, FOUND);
    return m;
  }, [guesses, answer]);
  const labels = useMemo(() => {
    const m = new Map(guesses.map((g) => [g.code, `${nameOf(g.code)} · ${en.km(g.distanceKm)}`]));
    if (answer && !m.has(answer)) m.set(answer, nameOf(answer));
    return m;
  }, [guesses, answer, nameOf]);

  const dateLine = game ? `${en.dayLabel(game.dayNumber)} — ${en.formatDate(game.date)}` : '—';
  const howToButton = (
    <button
      type="button"
      onClick={() => setShowHowTo(true)}
      className="caption shrink-0 border-2 border-ink bg-paper px-2 py-1 hover:bg-ink hover:text-paper"
    >
      <span aria-hidden="true" className="md:hidden">
        ?
      </span>
      <span className="sr-only md:not-sr-only">{en.howToPlay}</span>
    </button>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-paper text-ink md:flex-row">
      {/* Mobile masthead: title, date and the heat gauge stay visible above the globe. */}
      <header className="z-10 flex flex-col gap-2 border-b-2 border-ink bg-paper px-4 pt-3 pb-3 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="headline text-4xl">{en.title}.</h1>
            <p className="caption mt-1 text-muted">{dateLine}</p>
          </div>
          {howToButton}
        </div>
        <Thermometer best={best} bestName={bestName} compact />
      </header>

      <main className="globe-stage relative min-h-0 flex-1">
        {geo && (
          <Suspense fallback={null}>
            <Globe
              geo={geo}
              colors={colors}
              labels={labels}
              focus={answer ?? last?.code ?? null}
              answer={answer}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden items-start justify-end p-4 md:flex">
          <div className="pointer-events-auto">{howToButton}</div>
        </div>
        <p className="caption pointer-events-none absolute bottom-4 left-4 hidden text-muted md:block">
          {en.globeHint}
        </p>
      </main>

      {/* Left column on desktop, bottom drawer on mobile (section 3). */}
      <aside
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-y-auto border-t-2 border-ink bg-paper transition-[max-height] duration-300 motion-reduce:transition-none md:static md:order-first md:max-h-none md:w-[460px] md:shrink-0 md:border-t-0 md:border-r-2 ${
          drawerOpen ? 'max-h-[80dvh]' : 'max-h-[46dvh]'
        }`}
      >
        <button
          type="button"
          className="flex h-6 w-full shrink-0 items-center justify-center md:hidden"
          aria-label={drawerOpen ? 'Collapse panel' : 'Expand panel'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <span className="h-1 w-10 bg-ink" />
        </button>

        <div className="hidden border-b-2 border-ink px-6 pt-5 pb-6 md:block">
          <p className="caption flex justify-between border-b-2 border-ink pb-2">
            <span>{game ? en.dayLabel(game.dayNumber) : '—'}</span>
            <span>{game ? en.formatDate(game.date) : ''}</span>
          </p>
          <h1 className="headline mt-4 text-[96px]">
            Getting
            <br />
            Warmer.
          </h1>
        </div>

        <div className="hidden border-b-2 border-ink px-6 py-4 md:block">
          <Thermometer best={best} bestName={bestName} />
        </div>

        <div className="flex flex-col gap-4 px-4 pt-1 pb-4 md:px-6 md:pt-5 md:pb-6">
          {!over && <Status trend={trend} ready={!!game} />}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-3 border-2 border-burning p-3 text-sm"
            >
              <span className="flex-1 font-semibold">{ERROR_TEXT[error]}</span>
              {error === 'offline' && (
                <button
                  type="button"
                  className="caption border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
                  onClick={retry}
                >
                  {en.retry}
                </button>
              )}
            </div>
          )}

          {over && answer && geo ? (
            <Postcard
              won={game?.status === 'won'}
              answer={answer}
              guesses={guesses}
              index={index}
              centers={geo.centers}
              globalStats={game?.globalStats}
              footer={<Countdown onMidnight={refreshDate} />}
            />
          ) : (
            <GuessInput
              index={index}
              guessed={guessed}
              disabled={!game || busy}
              onGuess={(c) => void guess(c)}
            />
          )}

          <GuessList guesses={guesses} index={index} />

          {game?.status === 'playing' && guesses.length > 0 && (
            <button
              type="button"
              disabled={busy}
              className="caption self-start text-muted underline underline-offset-4 hover:text-burning"
              onClick={() => {
                if (window.confirm(en.confirmGiveUp)) void giveUp();
              }}
            >
              {en.giveUp}
            </button>
          )}
        </div>
      </aside>

      {showHowTo && <HowToPlay onClose={closeHowTo} />}
    </div>
  );
}
