import { Hono } from 'hono';

export const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.notFound((c) => c.json({ error: 'not_found' }, 404));
