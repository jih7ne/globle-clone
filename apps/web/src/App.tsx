import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { COUNTRIES, buildIndex, colorForDistance } from '@gw/shared';
import { AboutPanel } from './components/AboutPanel';
import { Countdown } from './components/Countdown';
import { StatsPanel } from './components/StatsPanel';
import { GuessInput } from './components/GuessInput';
import { GuessList } from './components/GuessList';
import { HowToPlay } from './components/HowToPlay';
import { Postcard } from './components/Postcard';
import { Thermometer } from './components/Thermometer';
import { useGame, type GameError } from './hooks/useGame';
import { useT } from './i18n/context';
import type { Strings } from './i18n/en';
import { bestGuess, isAdjacent, trendOf, type Trend } from './lib/game';
import { loadGeo, type GeoData } from './lib/geo';
import { shareText } from './lib/share';
import { computeStats } from './lib/stats';
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

const ERROR_KEY = {
  offline: 'offline',
  clock: 'clockWrong',
  before_launch: 'beforeLaunch',
  finished_elsewhere: 'finishedElsewhere',
} as const satisfies Record<GameError, keyof Strings>;

const TREND_COLOR: Partial<Record<Trend, string>> = {
  warmer: 'text-burning',
  colder: 'text-cool',
};

/** Big status line under the masthead: the intro, then how the last guess compares (FR-21). */
/** `adjacent`: name of the last guess when it borders the answer, which beats any trend. */
function Status({ trend, adjacent }: { trend: Trend | null; adjacent: string | null }) {
  const { t: en } = useT();
  // The intro shows straight away, before the API answers: it is the largest text on first
  // paint (Lighthouse LCP). Only trend messages animate in.
  const headline = adjacent ? en.adjacentHeadline : trend ? en.trendHeadline[trend] : en.intro;
  const sub = adjacent ? en.adjacentSub(adjacent) : trend ? en.trendSub[trend] : en.introSub;
  return (
    <div aria-live="polite">
      <p
        key={adjacent ? `adjacent-${adjacent}` : (trend ?? 'intro')}
        className={`headline text-[34px] md:text-5xl ${trend ? `slide-in ${adjacent ? 'text-burning' : (TREND_COLOR[trend] ?? '')}` : ''}`}
      >
        {headline}
      </p>
      {sub && (
        <p className="mt-1.5 text-sm leading-snug text-muted md:mt-2 md:text-[15px]">{sub}</p>
      )}
      {trend && <span className="sr-only">{en.trends[trend]}</span>}
    </div>
  );
}

export function App() {
  const { t: en, lang, setLang } = useT();
  const { date, game, history, busy, error, guess, giveUp, retry, refreshDate } = useGame();
  const stats = useMemo(() => computeStats(history, date), [history, date]);
  const [panel, setPanel] = useState<'stats' | 'about' | null>(null);
  const closePanel = useCallback(() => setPanel(null), []);
  const index = useMemo(() => buildIndex(COUNTRIES, lang), [lang]);
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [showHowTo, setShowHowTo] = useState(() => !readJson<boolean>(KEYS.seenHowTo));
  // Opened with the page on a first visit (no animation), or later from the menu.
  const [howToOnLoad, setHowToOnLoad] = useState(showHowTo);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // The globe (three.js, ~300 KB gzipped, seconds of work on a slow phone) starts loading
  // after the first paint (effects run after it), and on a first visit only once How to
  // play is closed: the sheet covers it, and the rules stay responsive (Lighthouse, NFR-06).
  const [globeWanted, setGlobeWanted] = useState(!showHowTo);
  useEffect(() => {
    if (globeWanted) loadGeo().then(setGeo, (err: unknown) => console.error(err));
  }, [globeWanted]);

  const closeHowTo = useCallback(() => {
    setShowHowTo(false);
    setGlobeWanted(true);
    writeJson(KEYS.seenHowTo, true);
  }, []);

  const guesses = useMemo(() => game?.guesses ?? [], [game]);
  const guessed = useMemo(() => new Set(guesses.map((g) => g.code)), [guesses]);
  const best = bestGuess(guesses);
  const last = guesses.at(-1);
  const over = game?.status === 'won' || game?.status === 'lost';
  const trend = last && !over ? trendOf(guesses, guesses.length - 1) : null;
  const answer = over ? (game?.answer ?? null) : null;
  const nameOf = useCallback(
    (code: string) => index.byCode.get(code)?.name[index.lang] ?? code,
    [index],
  );
  const bestName = best ? nameOf(best.code) : null;

  const colors = useMemo(() => {
    const m = new Map(
      guesses.map((g) => [g.code, g.band === 'found' ? FOUND : colorForDistance(g.distanceKm)]),
    );
    if (answer && !m.has(answer)) m.set(answer, FOUND);
    return m;
  }, [guesses, answer]);
  const labels = useMemo(() => {
    const m = new Map(
      guesses.map((g) => [
        g.code,
        `${nameOf(g.code)} · ${isAdjacent(g) ? en.bordersIt : en.km(g.distanceKm)}`,
      ]),
    );
    if (answer && !m.has(answer)) m.set(answer, nameOf(answer));
    return m;
  }, [guesses, answer, nameOf, en]);

  const dateLine = game ? `${en.dayLabel(game.dayNumber)} — ${en.formatDate(game.date)}` : '—';
  const won = game?.status === 'won';
  const share =
    game && over
      ? shareText({
          dayNumber: game.dayNumber,
          guesses,
          won,
          streak: stats.currentStreak,
          url: window.location.origin,
          t: en,
        })
      : '';

  const nav = (
    <nav className="caption flex shrink-0 border-2 border-ink bg-paper" aria-label={en.menu}>
      {(
        [
          ['stats', en.stats],
          ['about', en.about],
          ['howto', en.howToPlay],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (key !== 'howto') return setPanel(key);
            setHowToOnLoad(false);
            setShowHowTo(true);
          }}
          className="px-2 py-1 uppercase not-first:border-l-2 not-first:border-ink hover:bg-ink hover:text-paper"
        >
          {key === 'howto' ? (
            <>
              <span aria-hidden="true" className="md:hidden">
                ?
              </span>
              <span className="sr-only md:not-sr-only">{label}</span>
            </>
          ) : (
            label
          )}
        </button>
      ))}
      <button
        type="button"
        lang={en.otherLanguage.lang}
        onClick={() => setLang(en.otherLanguage.lang)}
        className="border-l-2 border-ink px-2 py-1 uppercase hover:bg-ink hover:text-paper"
      >
        <span aria-hidden="true">{en.otherLanguage.short}</span>
        <span className="sr-only">{en.otherLanguage.name}</span>
      </button>
    </nav>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-paper text-ink md:flex-row">
      {/* Mobile masthead: title, date and the heat gauge stay visible above the globe. */}
      <header className="z-10 flex flex-col gap-2 border-b-2 border-ink bg-paper px-4 pt-3 pb-3 md:hidden">
        <h1 className="headline text-[32px]">{en.title}.</h1>
        <div className="flex items-center justify-between gap-3">
          <p className="caption text-muted">{dateLine}</p>
          {nav}
        </div>
        <Thermometer best={best} bestName={bestName} compact />
      </header>

      <main className="globe-stage relative min-h-[26dvh] flex-1">
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
          <div className="pointer-events-auto">{nav}</div>
        </div>
        <p className="caption pointer-events-none absolute bottom-4 left-4 hidden text-muted md:block">
          {en.globeHint}
        </p>
      </main>

      {/* Left column on desktop. On mobile a panel under the globe, never over it: the globe
          keeps its own box and resizes when the panel grows. */}
      <aside
        className={`relative z-20 flex shrink-0 flex-col overflow-y-auto border-t-2 border-ink bg-paper transition-[max-height] duration-300 motion-reduce:transition-none md:static md:order-first md:max-h-none md:w-[460px] md:shrink-0 md:border-t-0 md:border-r-2 ${
          drawerOpen ? 'max-h-[70dvh]' : 'max-h-[50dvh]'
        }`}
      >
        <button
          type="button"
          className="flex h-6 w-full shrink-0 items-center justify-center md:hidden"
          aria-label={drawerOpen ? en.collapsePanel : en.expandPanel}
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
          {!over && (
            <Status trend={trend} adjacent={last && isAdjacent(last) ? nameOf(last.code) : null} />
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-3 border-2 border-burning p-3 text-sm"
            >
              <span className="flex-1 font-semibold">{en[ERROR_KEY[error]]}</span>
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
              streak={stats.currentStreak}
              share={share}
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

      {showHowTo && <HowToPlay onClose={closeHowTo} instant={howToOnLoad} />}
      {panel === 'stats' && (
        <StatsPanel
          stats={stats}
          todayWinGuesses={won ? guesses.length : null}
          onClose={closePanel}
        />
      )}
      {panel === 'about' && <AboutPanel onClose={closePanel} />}
    </div>
  );
}
