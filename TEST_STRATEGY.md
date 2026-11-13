# Test strategy

How Getting Warmer is tested, why, and what is not covered yet. The plan comes from section 10 of the [specification](docs/SPECIFICATION.md); this file tracks what actually exists.

## Risks the tests target

A daily guessing game fails in a few specific ways. Each one has tests aimed at it.

| Risk                                                       | Why it matters                                           | Main defence                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Wrong distances (islands, enclaves, antimeridian, straits) | The whole game is "how far am I": one bad pair ruins it  | Data tests on all 195 × 195 distances; property tests on the distance function     |
| The answer leaks before the game ends                      | Anyone could read it from the network tab or bundle      | Signed tokens that never hold the answer; Playwright scan of every response        |
| Dates and time zones (players from UTC−12 to UTC+14)       | Two players on the same local date must get one country  | Unit tests on the day number and the accepted date window, to the minute           |
| Faked global stats                                         | A script could post fake wins                            | `/finish` reads the result from the signed token; one finish per session and date  |
| Broken map geometry                                        | Wrong winding froze the page for 73 s once               | Winding unit tests and a data test on every shape                                  |
| Name matching (accents, aliases, typos, two languages)     | Players type "Côte d'Ivoire", "ivory coast", "Allemagne" | Unit and property tests on normalisation, aliases and "Did you mean?"              |
| Accessibility regressions                                  | Colour is the main signal of the game                    | axe on every screen, keyboard-only E2E, band names next to every colour            |
| A slow first load on phones                                | Players leave before the globe appears                   | Lighthouse CI blocks the deploy under 85; E2E checks the globe waits for the rules |

## Levels

| Level             | Tool                                         | Where                                                              |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Unit              | Vitest                                       | `packages/shared`, `apps/api/src`, `apps/web/src`, `tools/geo/src` |
| Property          | fast-check                                   | `distance.test.ts`, `match.test.ts`, `token.test.ts`               |
| Data              | Vitest over the generated files              | `tools/geo/src/data.test.ts`                                       |
| API / integration | Vitest on the Hono app, real local D1 schema | `apps/api/src/app.test.ts`                                         |
| End-to-end        | Playwright, production build + local Worker  | `e2e/game.spec.ts`                                                 |
| Time              | Playwright fake clock and time zones         | `e2e/clock.spec.ts`                                                |
| Security          | Playwright, network interception             | `e2e/anti-cheat.spec.ts`                                           |
| Accessibility     | axe-core through Playwright                  | `e2e/a11y.spec.ts`                                                 |
| Smoke             | Playwright tests tagged `@smoke`, deployed   | the Pages preview of a pull request, or production after a deploy  |
| Performance       | Lighthouse CI (mobile, median of 3 runs)     | `lighthouserc.json`, CI job `lighthouse`                           |
| Load              | k6                                           | `perf/api.k6.js`, workflow `load.yml` (weekly and on demand)       |

286 Vitest tests in total, coverage about 99.8% of lines on the covered game logic (CI fails under 85%). The 30 E2E tests run on Chromium, Firefox and WebKit on desktop, and the tests tagged `@mobile` also on a Pixel 7: 100 runs in all, one CI runner per engine. After each deploy, the 5 tests tagged `@smoke` run again on the deployed site, desktop and phone.

Every result, from both Vitest and Playwright, goes into one [Allure](https://allurereport.org) report (see below).

E2E tests use a unique `CF-Connecting-IP` per test so the rate limiter does not interfere, and compute the day's answer the same way the Worker does with a test secret, so a test can win on purpose.

## Requirements traceability

| Requirement                            | Tests                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| FR-01 Daily country, same for all      | `daily.test.ts` (shuffle without repeats per cycle, stable per day), `dates.test.ts`                 |
| FR-02 Autocomplete, case, accents      | `match.test.ts`, `names.test.ts`                                                                     |
| FR-03 Alternative names                | `match.test.ts` (property: every name and alias matches its country); E2E French browser             |
| FR-04 Unknown / repeated country       | `app.test.ts` (400, 409); `game.spec.ts`                                                             |
| FR-05 Border-to-border distance        | `distance.test.ts`, `data.test.ts`, `app.test.ts`                                                    |
| FR-06 Colour by distance               | `bands.test.ts` (bounds and continuous scale)                                                        |
| FR-07 Two list views                   | `game.test.ts` (ranking, ties, property); `game.spec.ts` (row order in both views)                   |
| FR-08 Rotate and zoom                  | `game.spec.ts` (the globe image changes after a drag, then after a wheel zoom)                       |
| FR-09 Win postcard                     | `game.spec.ts`                                                                                       |
| FR-10 Give up                          | `app.test.ts`; `game.spec.ts`; `anti-cheat.spec.ts`                                                  |
| FR-11 Resume after reload              | `game.spec.ts`                                                                                       |
| FR-12 Countdown                        | `date.test.ts` (23- and 25-hour days); `clock.spec.ts` (ticking, DST days, midnight, mid-game)       |
| FR-13 English / French                 | `i18n.test.ts` (same keys, everything translated), `share.test.ts`; `game.spec.ts` (2)               |
| FR-14 Dark mode                        | Not built                                                                                            |
| FR-15 How to play on first visit       | `game.spec.ts`                                                                                       |
| FR-16 Personal stats                   | `stats.test.ts` (streaks, distribution, missed days); `game.spec.ts`; `clock.spec.ts` (missed day)   |
| FR-17 Share                            | `share.test.ts` (exact format, no country names); `game.spec.ts`                                     |
| FR-18 Global stats                     | `stats.test.ts` (API), `app.test.ts`                                                                 |
| FR-19 Export / import stats            | Not built                                                                                            |
| FR-20 About page                       | Covered by the axe run on every screen                                                               |
| FR-21 Gauge and trend message          | `game.test.ts` (trend vs best guess, ties, property); `game.spec.ts` (messages, arrows, neighbour)   |
| FR-22 "Did you mean?"                  | `match.test.ts` (thresholds, ties, swapped letters); `game.spec.ts`                                  |
| NFR-01 No answer leak                  | `app.test.ts` (token content); `anti-cheat.spec.ts` (every response before give-up)                  |
| NFR-02 Secret daily pick               | `daily.test.ts` (order changes with the secret and the cycle)                                        |
| NFR-03 Date window UTC−12 … UTC+14     | `dates.test.ts`, `app.test.ts`                                                                       |
| NFR-04 Rate limit                      | `app.test.ts` (fake limiter: key is the IP, 429 with Retry-After)                                    |
| NFR-05 API p95 < 200 ms                | `api.k6.js`: production at a pace under the rate limit; 50 concurrent players on a local Worker      |
| NFR-06 Lighthouse ≥ 85, GeoJSON < 1 MB | GeoJSON size in `data.test.ts`; Lighthouse CI (blocks the deploy); `game.spec.ts` (globe deferred)   |
| NFR-07 API down                        | `app.test.ts` (D1 unavailable); `game.spec.ts` (offline message, game kept, Try again)               |
| NFR-09 Accessibility                   | `a11y.spec.ts` (axe, every screen, desktop and mobile); keyboard-only `game.spec.ts`                 |
| NFR-10 Browsers, 360 px                | Whole E2E suite on Chromium, Firefox and WebKit; Pixel 7 for `@mobile` tests; playable without WebGL |
| NFR-12 Coverage ≥ 85%, CI blocks       | Coverage threshold in `vitest.config.ts`; CI on every push and pull request                          |
| NFR-14 Stats integrity                 | `app.test.ts` (client claims ignored, one finish per session, suspect flag), `token.test.ts`         |

## Not covered yet

Honest gaps against section 10 of the specification:

- **Edge:** not run separately; it shares Chromium's engine.
- **50 concurrent players on Cloudflare:** production allows 60 requests a minute per IP, so a load test from one machine can only measure latency at a gentle pace. The 50-user run uses a local Worker: it checks the code under concurrency, not Cloudflare's network. A staging Worker without the limit would close this gap.
- **Lighthouse measures a first visit:** a fresh browser always sees How to play, and the globe waits for it to close. A returning player loads the globe straight after the first paint; that path is not scored.
- **Smoke tests on deployed sites** run on the production API, so they cannot win on purpose: no test secret exists there. The full suite runs only on the local build.

## Bugs found, and the tests that now guard them

Kept as raw material for the write-up.

- **Page frozen for 73 s:** some country rings had the wrong winding order for d3-geo, so the globe library triangulated the inverse shape. Found while profiling; now guarded by a unit test and a data test on every shape.
- **Morocco cut in two:** Western Sahara was a separate shape, leaving a hole (spotted in review). Data tests now check Morocco–Mauritania at 0 km and a point inside the merged shape.
- **French guess list not found by E2E:** the region was located by the English word "guess"; the French run caught it.
- **No land on the live site:** the map worker started listening only after loading its code, so on a real network the page's message arrived first and was silently dropped: the globe stayed an empty ocean. Every local test passed because the code loaded instantly. Now the worker listens immediately, the page falls back to building the map itself after 20 s, and an E2E test delays the worker's code and checks the land is drawn by the worker.
- **Globe hidden behind the panel on phones:** the mobile panel was laid over the globe, covering its centre. Reported by the owner. The panel now sits below the globe; an E2E test on the phone project checks the globe box ends where the panel starts (fails on the old layout).
- **Brittle row lookup in E2E:** the helper matched a country name in the row's raw text with no letter after it; "Borders it" made the text "ArgentinaBorders it". It now matches the name's own element exactly.
- **Language button failing axe:** visible "FR" but accessible name "Français" (`label-content-name-mismatch`).
- **Lighthouse mobile 38 on the live site** (12 November 2026, default 4× slowdown, no GPU). Four causes, found with Lighthouse and a CPU profile: the globe library bundled a WebGPU renderer and the h3 hexagon library it never used here (880 KB of a 2 MB chunk, now stubbed out); every render built new date and number formatters (~0.6 s); the How to play heading faded in, so the first visit's largest text waited for a busy main thread; and the globe loaded and drew under that sheet. Now the median of 3 runs is 95–98 on the same machine. Lighthouse CI blocks a deploy under 85, and an E2E test checks the globe waits for the sheet to close.
- **Blank page without WebGL:** Firefox on the CI runner has no GPU and turned WebGL off, so three.js threw while creating the globe. Nothing caught it, so React removed the whole page and every Firefox test timed out waiting for the guess box. Every local run passed. Any player with WebGL disabled or a blocklisted driver would have seen the same blank page. The globe now sits in an error boundary that shows a one-line message instead; an E2E test disables WebGL and wins a game (failed on the old code with CI's exact error). The CI Firefox now forces software WebGL so the globe tests still test the globe.

## Running the tests

```sh
npm test                 # all Vitest tests
npm run test:coverage    # with coverage
npx playwright install chromium
npm run test:e2e         # builds the site, starts a local Worker and D1, runs Playwright
npx playwright install firefox webkit
npm run test:e2e -- --project=firefox   # or webkit; desktop and mobile are Chromium

npm run report:clean     # forget the results of earlier runs
npm test && npm run test:e2e
npm run report           # builds the Allure report from both runners and opens it
```

In CI, each run uploads an `allure-report` artifact that combines the Vitest job and the three browser jobs.

```sh
npm run lighthouse       # with the E2E site running (npm run test:e2e starts it): 3 mobile runs, asserts
E2E_BASE_URL=https://getting-warmer.pages.dev npm run test:e2e   # smoke tests on a deployed site
k6 run perf/api.k6.js    # production latency; see the file for the local 50-user run
```
