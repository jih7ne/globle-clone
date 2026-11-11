# Test strategy

How Getting Warmer is tested, why, and what is not covered yet. The plan comes from section 10 of the [specification](docs/SPECIFICATION.md); this file tracks what actually exists.

## Risks the tests target

A daily guessing game fails in a few specific ways. Each one has tests aimed at it.

| Risk                                                       | Why it matters                                           | Main defence                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Wrong distances (islands, enclaves, antimeridian, straits) | The whole game is "how far am I": one bad pair ruins it  | Data tests on all 195 × 195 distances; property tests on the distance function    |
| The answer leaks before the game ends                      | Anyone could read it from the network tab or bundle      | Signed tokens that never hold the answer; Playwright scan of every response       |
| Dates and time zones (players from UTC−12 to UTC+14)       | Two players on the same local date must get one country  | Unit tests on the day number and the accepted date window, to the minute          |
| Faked global stats                                         | A script could post fake wins                            | `/finish` reads the result from the signed token; one finish per session and date |
| Broken map geometry                                        | Wrong winding froze the page for 73 s once               | Winding unit tests and a data test on every shape                                 |
| Name matching (accents, aliases, typos, two languages)     | Players type "Côte d'Ivoire", "ivory coast", "Allemagne" | Unit and property tests on normalisation, aliases and "Did you mean?"             |
| Accessibility regressions                                  | Colour is the main signal of the game                    | axe on every screen, keyboard-only E2E, band names next to every colour           |

## Levels

| Level             | Tool                                         | Where                                                              |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Unit              | Vitest                                       | `packages/shared`, `apps/api/src`, `apps/web/src`, `tools/geo/src` |
| Property          | fast-check                                   | `distance.test.ts`, `match.test.ts`, `token.test.ts`               |
| Data              | Vitest over the generated files              | `tools/geo/src/data.test.ts`                                       |
| API / integration | Vitest on the Hono app, real local D1 schema | `apps/api/src/app.test.ts`                                         |
| End-to-end        | Playwright, production build + local Worker  | `e2e/game.spec.ts`                                                 |
| Security          | Playwright, network interception             | `e2e/anti-cheat.spec.ts`                                           |
| Accessibility     | axe-core through Playwright                  | `e2e/a11y.spec.ts`                                                 |

254 Vitest tests in total, coverage about 98.6% of lines on the covered game logic (CI fails under 85%). The E2E tests run on a desktop and a mobile (Pixel 7) project: tests tagged `@mobile` run on both, 15 runs in all.

E2E tests use a unique `CF-Connecting-IP` per test so the rate limiter does not interfere, and compute the day's answer the same way the Worker does with a test secret, so a test can win on purpose.

## Requirements traceability

| Requirement                            | Tests                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| FR-01 Daily country, same for all      | `daily.test.ts` (shuffle without repeats per cycle, stable per day), `dates.test.ts`         |
| FR-02 Autocomplete, case, accents      | `match.test.ts`, `names.test.ts`                                                             |
| FR-03 Alternative names                | `match.test.ts` (property: every name and alias matches its country); E2E French browser     |
| FR-04 Unknown / repeated country       | `app.test.ts` (400, 409); `game.spec.ts`                                                     |
| FR-05 Border-to-border distance        | `distance.test.ts`, `data.test.ts`, `app.test.ts`                                            |
| FR-06 Colour by distance               | `bands.test.ts` (bounds and continuous scale)                                                |
| FR-07 Two list views                   | Partly: used in E2E, no dedicated assertion yet                                              |
| FR-08 Rotate and zoom                  | Manual check only                                                                            |
| FR-09 Win postcard                     | `game.spec.ts`                                                                               |
| FR-10 Give up                          | `app.test.ts`; `game.spec.ts`; `anti-cheat.spec.ts`                                          |
| FR-11 Resume after reload              | `game.spec.ts`                                                                               |
| FR-12 Countdown                        | Manual check only                                                                            |
| FR-13 English / French                 | `i18n.test.ts` (same keys, everything translated), `share.test.ts`; `game.spec.ts` (2)       |
| FR-14 Dark mode                        | Not built                                                                                    |
| FR-15 How to play on first visit       | `game.spec.ts`                                                                               |
| FR-16 Personal stats                   | `stats.test.ts` (streaks, distribution, missed days); `game.spec.ts`                         |
| FR-17 Share                            | `share.test.ts` (exact format, no country names); `game.spec.ts`                             |
| FR-18 Global stats                     | `stats.test.ts` (API), `app.test.ts`                                                         |
| FR-19 Export / import stats            | Not built                                                                                    |
| FR-20 About page                       | Covered by the axe run on every screen                                                       |
| FR-21 Gauge and trend message          | Partly: E2E sees the messages; the trend logic in `lib/game.ts` has no unit test yet         |
| FR-22 "Did you mean?"                  | `match.test.ts` (thresholds, ties, swapped letters); `game.spec.ts`                          |
| NFR-01 No answer leak                  | `app.test.ts` (token content); `anti-cheat.spec.ts` (every response before give-up)          |
| NFR-02 Secret daily pick               | `daily.test.ts` (order changes with the secret and the cycle)                                |
| NFR-03 Date window UTC−12 … UTC+14     | `dates.test.ts`, `app.test.ts`                                                               |
| NFR-04 Rate limit                      | `app.test.ts` (fake limiter: key is the IP, 429 with Retry-After)                            |
| NFR-05 API p95 < 200 ms                | Not measured yet (k6 planned on the deployed API)                                            |
| NFR-06 Lighthouse ≥ 85, GeoJSON < 1 MB | GeoJSON size in `data.test.ts`; Lighthouse run by hand, see below                            |
| NFR-07 API down                        | `app.test.ts` (D1 unavailable); offline banner checked by hand                               |
| NFR-09 Accessibility                   | `a11y.spec.ts` (axe, every screen, desktop and mobile); keyboard-only `game.spec.ts`         |
| NFR-10 Browsers, 360 px                | Chromium desktop and Pixel 7 only                                                            |
| NFR-12 Coverage ≥ 85%, CI blocks       | Coverage threshold in `vitest.config.ts`; CI on every push and pull request                  |
| NFR-14 Stats integrity                 | `app.test.ts` (client claims ignored, one finish per session, suspect flag), `token.test.ts` |

## Not covered yet

Honest gaps against section 10 of the specification:

- **Mocked clock E2E:** midnight rollover, DST days of 23 and 25 hours, and a broken streak after a missed day are tested at unit level (`dates.test.ts`, `stats.test.ts`) but not in the browser.
- **Firefox and WebKit:** E2E runs on Chromium only.
- **Lighthouse CI:** measured by hand. Last local result (production build, brotli, mobile simulation with this laptop's CPU calibrated): performance about 65–71, accessibility, best practices and SEO 100. The 85 target is not met yet; the 3D globe library is the main cost. To be re-measured on the deployed site.
- **k6 load test** for NFR-05: needs the deployed API.
- **E2E on the Pages preview:** E2E runs against a local build and Worker in CI; previews are deployed but not tested.

## Bugs found, and the tests that now guard them

Kept as raw material for the write-up.

- **Page frozen for 73 s:** some country rings had the wrong winding order for d3-geo, so the globe library triangulated the inverse shape. Found while profiling; now guarded by a unit test and a data test on every shape.
- **Morocco cut in two:** Western Sahara was a separate shape, leaving a hole (spotted in review). Data tests now check Morocco–Mauritania at 0 km and a point inside the merged shape.
- **French guess list not found by E2E:** the region was located by the English word "guess"; the French run caught it.
- **Language button failing axe:** visible "FR" but accessible name "Français" (`label-content-name-mismatch`).

## Running the tests

```sh
npm test                 # all Vitest tests
npm run test:coverage    # with coverage
npx playwright install chromium
npm run test:e2e         # builds the site, starts a local Worker and D1, runs Playwright
```
