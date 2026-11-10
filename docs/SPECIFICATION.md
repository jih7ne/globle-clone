# Requirements Specification - Getting Warmer

Nov 9, 2026 · @Jay · revised Nov 10, 2026

## 1. Context and goals

The project delivers a daily geography game inspired by Globle (same concept, its own interface and identity). It is publicly playable, hosted at zero cost, has shareable stats, and shows a visible QA layer in the repo.

Goals:

1. A working daily game: one mystery country per day, the same for every player.
2. An answer that cannot be predicted or read on the client.
3. Personal and global stats that can be shared (emoji text and a link).
4. 100% free hosting on a public URL.
5. A portfolio piece: public repo, polished README, green CI, documented test strategy, LinkedIn post.

### Scope

| In scope (v1)                                                      | Out of scope (v1)                     |
| ------------------------------------------------------------------ | ------------------------------------- |
| Daily mode, 3D globe, input with autocomplete and typo suggestions | User accounts, login                  |
| Nearest-border distance, hot/cold bands                            | Real-time multiplayer                 |
| Personal stats (localStorage) and global daily stats               | Native mobile app                     |
| Sharing the result                                                 | Monetisation, ads                     |
| English interface, French as a second language                     | Archive of past days (planned for v2) |

## 2. Game rules

The player must find the day's mystery country in as few guesses as possible, guided only by distance.

1. The player types a country name (autocomplete on the official list). If the name has a typo, the game suggests the closest country ("Did you mean France?").
2. The guessed country appears on the globe, coloured by its distance band: ice blue = far, ember red = very close (bands below).
3. The distance shown is between the nearest borders (0 km for two neighbouring countries).
4. Unlimited guesses; the game ends when the mystery country is found or the player gives up.
5. The mystery country changes every day at midnight, in the player's local time (consequences in section 9).
6. One ranked game per day per device.

### Distance bands

The bands are used everywhere: globe colour, label in the list, thermometer gauge and share emoji. The distance is rounded to the nearest km; a guess belongs to the first band whose upper bound is greater than or equal to its distance.

| Band     | Distance          | Reference colour      | Share emoji |
| -------- | ----------------- | --------------------- | ----------- |
| Found!   | mystery country   | animated gold outline | 🎯          |
| Burning  | 0 to 250 km       | `#C62828`             | 🟥          |
| Hot      | 251 to 1,000 km   | `#EF6C00`             | 🟧          |
| Warm     | 1,001 to 2,500 km | `#F9A825`             | 🟨          |
| Cool     | 2,501 to 5,000 km | `#4FA3D9`             | 🟦          |
| Freezing | over 5,000 km     | `#DCEEF8`             | ⬜          |

- On the globe, the colour is interpolated continuously between these reference colours (FR-06); the list, the gauge and the share text use the discrete band.
- Every guess always shows its distance in km and its band label as text, so the information never depends on colour alone (NFR-09).

### Typo suggestions ("Did you mean?")

- Names are normalised before matching: lower case, accents removed, punctuation and extra spaces dropped.
- If the input matches no name or alias exactly, the game compares it with every name and alias in the current language using the Damerau-Levenshtein distance.
- The closest country is suggested if its distance is at most 1 for inputs of up to 5 characters, 2 for 6 to 10 characters, and 3 beyond that. If two countries tie, the more populous one is suggested.
- The player sees "Did you mean **France**?" with **Yes** and **No** buttons. **Yes** submits France as the guess; **No** closes the suggestion and keeps the text so it can be edited. Enter confirms and Escape dismisses.
- If no country is close enough, the game shows "Unknown country" (FR-04).
- A country that was already guessed is never suggested; the game says it was already guessed instead.
- Matching runs entirely in the browser: the country list is public and says nothing about the answer.

## 3. Identity and user experience

The game keeps Globle's principle but not its interface: name, metaphor, palette, layout and animations are the project's own.

**Working name:** "Getting Warmer", after the children's hot/cold game. To be confirmed (section 11).

### What stays the same (the concept)

- One mystery country per day, the same for everyone.
- Guesses guided only by the border-to-border distance.
- A 3D globe on which guesses are coloured.
- Unlimited guesses and the option to give up.

### What changes (the interface)

| Element                | Project choice                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metaphor               | Hot/cold thermometer with named bands (Freezing to Burning) rather than a plain gradient                                                             |
| Palette                | Ice blue to ember red; light sky and pale ocean in a paper-map style, dark theme optional (FR-14)                                                    |
| Layout                 | Full-screen globe; side panel on the left on desktop, sliding bottom drawer on mobile                                                                |
| Gauge                  | Vertical thermometer, always visible, filled up to the best band reached                                                                             |
| Feedback after a guess | The camera flies to the guessed country, then a "Getting warmer" or "Getting colder" message compares the guess with the best previous guess (FR-21) |
| Guess list             | Two views: ranked by distance (default) and chronological, which shows the trend                                                                     |
| End screen             | A "postcard" instead of a modal: path of the guesses on a mini map, guess count, streak, share button                                                |
| Sharing                | Its own title, emoji and bands (section 5)                                                                                                           |

### Screens

1. **How to play** (first visit, FR-15): three illustrated cards (guess a country, read the band, find the country), keyboard-navigable.
2. **Game**: globe, thermometer gauge, input with autocomplete and typo suggestions, guess list, countdown (FR-12).
3. **End**: the postcard, then the global stats of the day (FR-18).
4. **Stats** and **About** (FR-16, FR-20): panels that slide in from the right.

### Animations and accessibility

- Camera flight of about 800 ms to each guessed country; replaced by an instant recentre when `prefers-reduced-motion` is set.
- The trend message, the band and the "Did you mean?" suggestion are announced to screen readers through an `aria-live` region.
- Every action (input, suggestion, switching views, giving up, sharing) is reachable from the keyboard, without using the globe.

## 4. Functional requirements

Twenty-two requirements, prioritised with MoSCoW: the "Must" items make up the MVP.

| ID    | Requirement                                                                                                                              | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | The system picks one mystery country per day, the same for every player with the same local date                                         | Must     |
| FR-02 | The player enters a country through a field with autocomplete, ignoring case and accents                                                 | Must     |
| FR-03 | The system accepts alternative names (e.g. "USA", "United States", "États-Unis")                                                         | Should   |
| FR-04 | The system rejects an unknown or already guessed country with a clear message                                                            | Must     |
| FR-05 | The system returns the distance in km between the border of the guessed country and that of the mystery country                          | Must     |
| FR-06 | The globe colours each guessed country by its distance (continuous scale between the band colours, section 2)                            | Must     |
| FR-07 | The guess list offers two views, ranked (nearest to farthest, default) and chronological; each guess shows its distance and band         | Must     |
| FR-08 | The globe can be rotated and zoomed with mouse and touch                                                                                 | Must     |
| FR-09 | Winning shows the end postcard with the guess count and the mystery country                                                              | Must     |
| FR-10 | The player can give up; the answer is then revealed and the game counts as lost                                                          | Should   |
| FR-11 | The game in progress is saved and restored after a page reload                                                                           | Must     |
| FR-12 | A countdown shows the time left until the next country                                                                                   | Should   |
| FR-13 | The player switches the interface between English and French                                                                             | Should   |
| FR-14 | A dark mode follows the system preference                                                                                                | Could    |
| FR-15 | A "How to play" page appears on the first visit                                                                                          | Should   |
| FR-16 | The player views their personal stats (section 5)                                                                                        | Must     |
| FR-17 | The player shares their result (section 5)                                                                                               | Must     |
| FR-18 | The player views the global stats of the day (section 5)                                                                                 | Should   |
| FR-19 | The player exports and re-imports their stats through a code (device change)                                                             | Could    |
| FR-20 | An "About" page presents the project, the GitHub repo and the test strategy                                                              | Should   |
| FR-21 | After each guess, the thermometer gauge updates and a message says whether the player is getting closer or farther than their best guess | Should   |
| FR-22 | When the input has a typo, the game shows "Did you mean X?"; clicking Yes submits X as the guess (rules in section 2)                    | Must     |

## 5. Stats and sharing

Personal stats stay on the device (no account needed); global stats are aggregated anonymously on the server.

### Personal stats (localStorage)

| Metric          | Calculation                                                      |
| --------------- | ---------------------------------------------------------------- |
| Games played    | Number of days with a finished game                              |
| Win rate        | Wins / games played, in %                                        |
| Current streak  | Consecutive days won, reset to 0 after a missed day or a give-up |
| Best streak     | Highest streak ever                                              |
| Average guesses | Average over won games                                           |
| Distribution    | Histogram of wins by guess range (1, 2-3, 4-6, 7-10, 11-15, 16+) |

### Global daily stats (server)

- Number of players who finished the day's game.
- Median guesses (main metric, hardly affected by cheaters) and average.
- Percentage of players who found it in 5 guesses or fewer.
- Most common first guess.
- Computed per local date: each date has its own mystery country and its own stats (section 9).
- Only games validated by a server token and not flagged as suspect are counted (section 9).
- Shown only after the player's own game is over (no hint about the answer).
- No personal data: a random anonymous session ID, no IP stored.

### Sharing the result

The "Share" button copies to the clipboard (or opens the native share sheet on mobile) a text in this format:

```
Getting Warmer #42 · 6 guesses
⬜🟦🟨🟧🟥🎯
Streak: 12 days
https://<name>.pages.dev
```

- One emoji per guess, in chronological order, using the bands in section 2 (no country names: no spoilers).
- After a give-up, the title line says "gave up" and the emoji sequence ends without 🎯.
- Day number, guess count, current streak, game link.
- Could: a generated result image (Open Graph) for a rich preview on LinkedIn.

## 6. Non-functional requirements

There are two hard constraints: the answer must never reach the browser before the game ends, and the cost must stay at €0.

| ID     | Category        | Measurable requirement                                                                                                                                                                                            |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Anti-cheat      | The client code and network responses never contain the mystery country before a win or give-up (accepted limits in section 9)                                                                                    |
| NFR-02 | Anti-cheat      | The daily pick depends on a secret key stored on the server (encrypted environment variable)                                                                                                                      |
| NFR-03 | Anti-cheat      | The server accepts a local date only if it is current somewhere between UTC−12 and UTC+14, i.e. between the date of (now − 12 h) and that of (now + 14 h); otherwise HTTP 400                                     |
| NFR-04 | Anti-abuse      | Limit of 60 requests per minute per IP on the API, through the Workers Rate Limiting binding; the IP is used as the counting key and never stored by the application; over the limit: HTTP 429 with `Retry-After` |
| NFR-05 | Performance     | API response time under 200 ms at the 95th percentile                                                                                                                                                             |
| NFR-06 | Performance     | Lighthouse Performance score of at least 85 on mobile; simplified GeoJSON under 1 MB                                                                                                                              |
| NFR-07 | Availability    | If the API is down, a clear message is shown and the game is saved locally                                                                                                                                        |
| NFR-08 | Cost            | €0 per month; usage kept under the free quotas (section 8)                                                                                                                                                        |
| NFR-09 | Accessibility   | WCAG 2.1 AA: keyboard navigation, contrast, distances and bands readable without relying on colour alone, animations can be turned off                                                                            |
| NFR-10 | Compatibility   | Latest versions of Chrome, Firefox, Safari, Edge; mobile from 360 px wide                                                                                                                                         |
| NFR-11 | Privacy         | No tracking cookies, no personal data stored; no GDPR banner needed                                                                                                                                               |
| NFR-12 | Quality         | At least 85% test coverage on the game logic; CI blocks every pull request                                                                                                                                        |
| NFR-13 | Maintainability | Strict TypeScript, ESLint and Prettier, README and test strategy file kept up to date                                                                                                                             |
| NFR-14 | Stats integrity | `/api/finish` accepts only a game token signed by the server; the guess count and the win are read from the token, never declared by the client                                                                   |

## 7. Architecture

A static front end on Cloudflare Pages talks to a Worker that alone knows the answer; D1 stores anonymous results for the global stats.

```
Browser (React, Cloudflare Pages)
   │  guesses + signed game token          ▲ distances, bands, new token
   ▼                                        │ (answer only after win or give-up)
Cloudflare Worker (Hono) ── Rate Limiting binding
   │  one row per finished game
   ▼
Cloudflare D1 (SQLite) ── global stats

GitHub ── GitHub Actions (CI) ── deploys Pages + Worker
```

The browser sends only guesses and receives only distances and a signed game token; the answer is returned only after a win or give-up. Every push goes through CI before any deployment.

## 8. Tech stack and free hosting

Everything fits in Cloudflare's free tier (front end, API, database) plus GitHub, with no credit card.

| Layer                        | Choice                                                               | Reason                                                                     |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Front end                    | React 18 + Vite + TypeScript                                         | Fast builds, industry standard                                             |
| 3D globe                     | react-globe.gl (three.js)                                            | Coloured GeoJSON polygons, built-in rotation, zoom and camera moves        |
| Styling                      | Tailwind CSS                                                         | Easy dark mode and responsive layout                                       |
| Geo data                     | Natural Earth 1:10m (v5.1.2); globe shapes simplified with mapshaper | Public domain; includes the smallest countries (Vatican City, Nauru)       |
| Distance computation (build) | Node script with a 3D k-d tree, on unsimplified borders              | Precomputed border-to-border matrix; exact to about 5 km, built in seconds |
| API                          | Cloudflare Workers + Hono                                            | Serverless, secret key on the server                                       |
| Rate limiting                | Workers Rate Limiting binding                                        | Counter managed by Cloudflare, nothing to store                            |
| Database                     | Cloudflare D1 (SQLite)                                               | Global stats                                                               |
| Front-end hosting            | Cloudflare Pages                                                     | Public `*.pages.dev` URL, automatic deploys from GitHub                    |
| CI/CD                        | GitHub Actions                                                       | Free for a public repo                                                     |
| Tests                        | Vitest, fast-check, Playwright, k6                                   | See section 10                                                             |
| Quality                      | ESLint, Prettier, Codecov                                            | README badges                                                              |

### Free quotas to respect

| Service    | Free limit                               | Estimated usage at 500 players/day                                            |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Workers    | 100,000 requests/day, reset at 00:00 UTC | about 6,000 (start, 10 guesses and finish per player)                         |
| D1 reads   | 5 million rows/day                       | negligible (aggregated stats)                                                 |
| D1 writes  | 100,000 rows/day                         | about 500 (one row per finished game; no write per guess thanks to the token) |
| D1 storage | 5 GB total, 500 MB per database          | a few MB per year                                                             |
| Pages      | 500 builds/month                         | 1 to 5 per day of development                                                 |

Since September 1, 2026, free-tier D1 queries fail once the daily limit is exceeded: the front end must handle this error (NFR-07) and hide the global stats without breaking the game.

Whether the Rate Limiting binding is available on the free tier, and its exact limits, must be checked at the start of week 2. It counts per data centre and approximately, which is enough for anti-abuse.

Sources: [Workers free limits](https://eastondev.com/blog/en/posts/dev/20260526-cloudflare-free-limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/index.md), [D1 free tier enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).

## 9. API and data model

Four endpoints are enough; none returns the mystery country while the game is in progress.

| Method and route                 | Input                 | Output                                          | Rule                                                                                              |
| -------------------------------- | --------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST /api/start`                | `{ date, sessionId }` | `{ dayNumber, token }`                          | Date validated (NFR-03); signed token with no guesses                                             |
| `POST /api/guess`                | `{ token, iso3 }`     | `{ distanceKm, band, correct, answer?, token }` | Invalid token: 401; country already guessed or game over: 409; `answer` present only if `correct` |
| `POST /api/finish`               | `{ token }`           | `{ answer, globalStats }`                       | Win and guess count read from the token; one finish per `sessionId` and date (409 otherwise)      |
| `GET /api/stats?date=YYYY-MM-DD` | date                  | aggregated global stats                         | Cached for 5 min                                                                                  |

Every route goes through rate limiting (NFR-04).

### Game token

The token prevents faked stats without writing to the database on every guess.

- Format: `base64url(payload).base64url(HMAC-SHA256(TOKEN_KEY, payload))`, with `payload = { v, date, sid, guesses: [iso3...], won, startedAt }`.
- `TOKEN_KEY` is a secret separate from `SECRET`, stored with `wrangler secret`.
- On each `/guess`, the Worker checks the signature, rejects duplicates, appends the guess and returns a new token. The client can read the token, but it holds only the player's own guesses, never the answer.
- `/finish` works out `won` (is the answer in `guesses`?), the guess count, the first guess and the duration from the token. The client declares nothing.
- A game is flagged `suspect` (left out of the global stats, but finished normally for the player) if it has more than 150 guesses or lasts under 3 seconds.

### What the anti-cheat covers, and what it does not

| Attack                                                                                                                        | Protection                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading the answer in the bundle or network traffic                                                                           | Covered (NFR-01, Playwright security test)                                                                                                                                                                            |
| Predicting future days' countries                                                                                             | Covered (shuffle seeded with `SECRET`)                                                                                                                                                                                |
| Calling `/finish` directly and claiming 1 guess                                                                               | Covered (NFR-14, signed token)                                                                                                                                                                                        |
| Flooding the API with a script                                                                                                | Limited (NFR-04, 429)                                                                                                                                                                                                 |
| Trying all 195 countries or giving up in a throwaway session, then replaying the answer in a new session or from an old token | Not covered: without accounts, this is indistinguishable from a real player. The effect is limited to global stats and softened by the median and the `suspect` flag. Accepted risk, documented in `TEST_STRATEGY.md` |

### Picking the country of the day (in the Worker)

- The list of playable countries (about 195 ISO 3166-1 alpha-3 codes) is shuffled once per cycle with a deterministic shuffle seeded with `HMAC-SHA256(SECRET, "cycle-" + n)`.
- Country of the day = `list[dayNumber % 195]` in cycle `n = floor(dayNumber / 195)`: no country repeats before the end of the cycle.
- `dayNumber` = number of days between the local date received and the launch date (day #1).
- `SECRET` is stored with `wrangler secret`, never in the repo.

### Local dates

Local midnight (rule 5) is kept; it has three consequences, all accepted.

- Time zones run from UTC−12 to UTC+14, a 26-hour spread: at any moment two local dates coexist, and three for about 2 hours a day. Several mystery countries are therefore live at the same time.
- Global stats are computed per local date (`date` column), never per UTC date.
- A player can send tomorrow's date as long as it is current in UTC+14, and play the next country up to 14 hours early. That is the price of local midnight; the answer stays protected by the same rules.

### Static data (bundled in the Worker)

- `countries.json`: ISO code, English and French names, aliases, population (for tie-breaking typo suggestions).
- `distances.json`: 195 x 195 matrix of border-to-border distances in km (about 38,000 values).

The front end bundles `countries.json` without any distance data.

### D1 schema

```sql
CREATE TABLE results (
  date        TEXT    NOT NULL,   -- YYYY-MM-DD, player's local date
  session_id  TEXT    NOT NULL,   -- anonymous UUID generated on the client
  guesses     INTEGER NOT NULL,   -- read from the signed token
  won         INTEGER NOT NULL,   -- 0 or 1, computed by the server
  first_guess TEXT,               -- ISO code of the first guess
  duration_ms INTEGER NOT NULL,   -- between /start and /finish
  suspect     INTEGER NOT NULL DEFAULT 0,  -- 1 = left out of global stats
  created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, session_id)
);
```

The composite primary key stops one device from counting twice in the day's stats.

## 10. QA test strategy

The test pyramid targets the real risks of this kind of game: dates, time zones, geometry and answer leaks.

| Level             | Tool                              | Cases covered                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit              | Vitest                            | Day number, shuffle with no repeats within a cycle, name normalisation (case, accents, aliases), streaks, bands at their bounds (0, 250, 251, 1,000, 1,001, 2,500, 2,501, 5,000, 5,001 km), trend message, typo suggestions (one wrong letter, swapped letters, missing letter, thresholds by length, ties, already guessed country, no suggestion) |
| Property          | fast-check                        | Symmetry d(A,B) = d(B,A); d(A,A) = 0; distance always ≥ 0; streak never greater than games played; band monotonic with distance; any tampered token is rejected; every exact name or alias matches its own country                                                                                                                                  |
| Data              | Validation script in CI           | Known neighbours at 0 km (France-Spain, Angola-Namibia), multi-polygon countries (France with French Guiana, United States with Alaska), islands, antimeridian crossing (Fiji, Russia)                                                                                                                                                              |
| API / integration | Vitest + Miniflare                | HTTP codes, input validation, UTC−12 / UTC+14 date window to the minute (400), rate limit (429), tampered or expired token (401), duplicate (409), one finish per session (409), `/finish` without a token rejected, `suspect` flag                                                                                                                 |
| Security          | Playwright (network interception) | The answer appears in no network response, no token and not in the JS bundle before a win or give-up                                                                                                                                                                                                                                                |
| End-to-end        | Playwright with a mocked clock    | Full game, resume after reload, midnight rollover, DST change (23-hour and 25-hour days), streak broken after a missed day, switching between the two list views, "Did you mean?" accepted with Yes and with Enter, dismissed with No and with Escape                                                                                               |
| Snapshot          | Vitest                            | Share text identical for the same history, win and give-up                                                                                                                                                                                                                                                                                          |
| Accessibility     | axe-core through Playwright       | Zero critical WCAG AA violations; `aria-live` announcements; animations off with `prefers-reduced-motion`                                                                                                                                                                                                                                           |
| Performance       | Lighthouse CI, k6                 | Mobile score of at least 85; API p95 under 200 ms at 50 virtual users (on staging)                                                                                                                                                                                                                                                                  |
| Cross-browser     | Playwright                        | Chromium, Firefox, WebKit, 360 px mobile viewport                                                                                                                                                                                                                                                                                                   |

### CI pipeline (GitHub Actions)

1. Lint and type check.
2. Unit, property and data tests, with an 85% coverage threshold.
3. API tests on Miniflare.
4. A Cloudflare Pages preview deployment per pull request.
5. E2E, security and accessibility tests on that preview.
6. Merge allowed only if everything is green; production deploy on `master`.

### QA deliverables visible in the repo

- `TEST_STRATEGY.md`: risks, threat model (section 9), requirements-to-tests traceability matrix (FR-xx and NFR-xx).
- README badges: build, coverage, Lighthouse.
- Playwright HTML report published as a CI artifact.
- Log of bugs found by the tests (raw material for the LinkedIn post).

## 11. Schedule, risks and acceptance criteria

The public MVP is reachable in 6 part-time weeks, with the LinkedIn post after one week of real play.

### Milestones

1. Week 1: geo data (simplification, country list, aliases) and the distance matrix script, with its data tests.
2. Week 2: Worker (daily pick, `/start`, `/guess`, signed token, date validation, rate limiting) and API tests.
3. Week 3: front end (globe, thermometer gauge, input with typo suggestions, two-view list, end postcard, local save).
4. Week 4: personal stats, sharing, D1 and global stats.
5. Week 5: Playwright E2E, accessibility, performance, full CI, i18n.
6. Week 6: launch, README, `TEST_STRATEGY.md`, beta with 10 testers.
7. Week 7: LinkedIn post with a GIF, test figures and bugs found.

### Risks

| Risk                                                        | Impact                                    | Mitigation                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Wrong distances for multi-polygon or antimeridian countries | Inconsistent answers, credibility         | Dedicated data tests, comparison with reference values                                            |
| Workers or D1 quota exceeded during a spike (viral post)    | Game or stats unavailable until 00:00 UTC | Cached stats, no D1 write per guess, graceful degradation, paid plan at $5/month as a last resort |
| 3D globe slow on low-end phones                             | Players leave                             | Simplified GeoJSON, 2D fallback                                                                   |
| Disputed country names and territories                      | Controversy                               | UN member states list, territories excluded, note on the "About" page                             |
| Cheating through enumeration or multiple sessions           | Skewed global stats                       | Signed token, rate limiting, median, `suspect` flag; residual risk documented (section 9)         |
| Typo suggestions picking the wrong country                  | Frustration, wasted guess                 | Suggestion needs a click on Yes, never auto-submitted; thresholds covered by unit tests           |
| Too close a resemblance to Globle                           | Intellectual property issue               | Own name, metaphor, palette, layout and animations (section 3); "inspired by Globle" credit       |

### v1 acceptance criteria

- [ ] All "Must" requirements are implemented and traceable to at least one test.
- [ ] The game is publicly available on a `*.pages.dev` URL.
- [ ] The monthly cost is €0.
- [ ] No test reveals the answer before a win (NFR-01).
- [ ] No call to `/api/finish` without a valid token is counted in the stats (NFR-14).
- [ ] CI is green on `master`, coverage at least 85%.
- [ ] Lighthouse mobile at least 85, zero critical axe-core violations.
- [ ] 10 beta testers have played 3 days in a row with no blocking bug.

### Decisions made

- Local midnight confirmed (rule 5), with the consequences described in section 9.
- Distance bands and share emoji fixed (section 2).
- Typo suggestions require confirmation and are never auto-submitted (section 2).

### Open questions

- Final game name (proposal: "Getting Warmer") and domain name (the `pages.dev` subdomain is free).
- Launch date, which sets day #1.
