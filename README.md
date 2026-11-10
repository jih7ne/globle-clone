# Getting Warmer

A daily geography game: find the mystery country, guided only by how far each guess is from it. Inspired by [Globle](https://globle-game.com), with its own design.

> Status: in development (week 2 of 6). See the [specification](docs/SPECIFICATION.md).

## Stack

- **Front end:** React 18, Vite, TypeScript, Tailwind CSS, react-globe.gl (`apps/web`)
- **API:** Cloudflare Workers and Hono (`apps/api`)
- **Shared logic:** distance bands, name matching (`packages/shared`)
- **Data:** Cloudflare D1, Natural Earth map data
- **Hosting:** Cloudflare Pages, free tier

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

## API

| Route                  | Purpose                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `POST /api/start`      | Starts the day's game; returns the day number and a signed game token           |
| `POST /api/guess`      | Returns the distance and band of a guess, and a new token                       |
| `POST /api/finish`     | Ends the game (win or give up), records it, returns the answer and global stats |
| `GET /api/stats?date=` | Global stats for a date, cached 5 minutes                                       |

The answer is never sent before a win or give-up, and results are read from the signed token rather than trusted from the client. See section 9 of the [specification](docs/SPECIFICATION.md) for the threat model.

## Scripts

| Command                 | What it does                        |
| ----------------------- | ----------------------------------- |
| `npm test`              | Runs every test with Vitest         |
| `npm run test:coverage` | Tests with coverage (85% threshold) |
| `npm run lint`          | ESLint                              |
| `npm run typecheck`     | TypeScript in every workspace       |
| `npm run format`        | Prettier                            |
| `npm run build`         | Builds the front end                |
| `npm run build:geo`     | Rebuilds the country data (below)   |

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
