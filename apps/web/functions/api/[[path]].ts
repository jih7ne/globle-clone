/**
 * Cloudflare Pages Function: every /api/* request goes to the Worker through a service
 * binding (wrangler.jsonc). The site and the API share one origin, so no CORS, and the
 * request is passed whole: the Worker still sees CF-Connecting-IP for rate limiting.
 */
interface Env {
  API: { fetch: (request: Request) => Promise<Response> };
}

export const onRequest = ({ request, env }: { request: Request; env: Env }) =>
  env.API.fetch(request);
