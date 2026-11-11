# Getting Warmer

A daily geography game: find the mystery country, guided only by how far each guess is from it. Inspired by [Globle](https://globle-game.com), with its own design.

[![CI](https://github.com/jih7ne/globle-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/jih7ne/globle-clone/actions/workflows/ci.yml)

**Play it: https://getting-warmer.pages.dev** (No. 001 was 11 November 2026).

> Status: launched, in beta. See the [specification](docs/SPECIFICATION.md) and the [test strategy](TEST_STRATEGY.md).

English and French. No account, no cookies, no tracking.

## Stack

- **Front end:** React 18, Vite, TypeScript, Tailwind CSS, react-globe.gl (`apps/web`)
- **API:** Cloudflare Workers and Hono (`apps/api`)
- **Shared logic:** distance bands, name matching (`packages/shared`)
- **Data:** Cloudflare D1, Natural Earth map data
- **Hosting:** Cloudflare Pages and Workers, free tier. Pages forwards `/api/*` to the Worker through a service binding (`apps/web/functions`), so the site and the API share one origin.

## Getting started

Requires Node 24.

```sh
npm install

# First time only: local secrets and the local D1 database
cp apps/api/.dev.vars.example apps/api/.dev.vars
cd apps/api && npx wrangler d1 migrations apply getting-warmer --local && cd ../..

npm run dev:api   # Worker on http://localhost:8787
npm run dev:web   # Front end on http://localhost:5173, /api proxied to the Worker
```

## Beta feedback

Testers fill in a six-question form at [/feedback](https://getting-warmer.pages.dev/feedback) (also linked from About). Answers go to the `feedback` table in D1 through `POST /api/feedback`, anonymously: no IP, no session, no contact details. A hidden field catches bots. Read them with `npm run feedback`.

## API

| Route                  | Purpose                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `POST /api/start`      | Starts the day's game; returns the day number and a signed game token           |
| `POST /api/guess`      | Returns the distance and band of a guess, and a new token                       |
| `POST /api/feedback`   | Stores one anonymous answer to the beta feedback form                           |
| `POST /api/finish`     | Ends the game (win or give up), records it, returns the answer and global stats |
| `GET /api/stats?date=` | Global stats for a date, cached 5 minutes                                       |

The answer is never sent before a win or give-up, and results are read from the signed token rather than trusted from the client. See section 9 of the [specification](docs/SPECIFICATION.md) for the threat model.

## Scripts

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm test`              | Runs every test with Vitest                                     |
| `npm run test:e2e`      | Playwright: builds the site, starts a local Worker and database |
| `npm run test:coverage` | Tests with coverage (85% threshold)                             |
| `npm run lint`          | ESLint                                                          |
| `npm run typecheck`     | TypeScript in every workspace                                   |
| `npm run format`        | Prettier                                                        |
| `npm run build`         | Builds the front end                                            |
| `npm run build:geo`     | Rebuilds the country data (below)                               |
| `npm run feedback`      | Prints the beta feedback answers from the live database         |

## Deployment

CI (`.github/workflows/ci.yml`) deploys after the checks and E2E tests pass: database migrations and the Worker on `master`, the site on `master` (production) and on every pull request (a preview URL). The deploy job is skipped until the Cloudflare secrets below exist.

One-time setup, with a free Cloudflare account:

```sh
npx wrangler login

# 1. The database: copy the printed database_id into apps/api/wrangler.jsonc
npx wrangler d1 create getting-warmer

# 2. Secrets for the Worker (long random strings, kept private)
cd apps/api
npx wrangler secret put SECRET      # decides the daily order: changing it changes every future answer
npx wrangler secret put TOKEN_KEY   # signs game tokens
npx wrangler d1 migrations apply getting-warmer --remote
npx wrangler deploy
cd ../..

# 3. The Pages project
npx wrangler pages project create getting-warmer --production-branch master
```

Then add two secrets in the GitHub repository settings: `CLOUDFLARE_API_TOKEN` (a token with edit rights on Workers, D1 and Pages) and `CLOUDFLARE_ACCOUNT_ID`. Day #1 is `LAUNCH_DATE` in `apps/api/wrangler.jsonc`.

## Country data

`npm run build:geo` (in `tools/geo`) downloads [Natural Earth](https://www.naturalearthdata.com) 1:10m country borders, checks their SHA-256, and writes three committed files:

| File                                      | Contents                                                     | Used by                                |
| ----------------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| `packages/shared/src/data/countries.json` | 195 countries: English and French names, aliases, population | Front end and API                      |
| `apps/api/src/data/distances.json`        | 195 × 195 border-to-border distances in km                   | API only, never shipped to the browser |
| `apps/web/public/geo/countries.geojson`   | Simplified shapes for the globe (under 1 MB)                 | Front end                              |

Playable countries are the 193 UN member states plus the Holy See and Palestine. Distances are the great-circle distance between the nearest border points, computed on unsimplified borders (so small islands count) with a 3D k-d tree. Data tests in `tools/geo/src/data.test.ts` check known neighbours, enclaves, straits, the antimeridian and island countries.

Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.

## Licence

[MIT](LICENSE)
