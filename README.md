# Getting Warmer

A daily geography game: find the mystery country, guided only by how far each guess is from it. Inspired by [Globle](https://globle-game.com), with its own design.

> Status: in development (week 1 of 6). See the [specification](docs/SPECIFICATION.md).

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
npm run dev:api   # Worker on http://localhost:8787
npm run dev:web   # Front end on http://localhost:5173, /api proxied to the Worker
```

## Scripts

| Command                 | What it does                        |
| ----------------------- | ----------------------------------- |
| `npm test`              | Runs every test with Vitest         |
| `npm run test:coverage` | Tests with coverage (85% threshold) |
| `npm run lint`          | ESLint                              |
| `npm run typecheck`     | TypeScript in every workspace       |
| `npm run format`        | Prettier                            |
| `npm run build`         | Builds the front end                |

## Licence

[MIT](LICENSE)
