import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import { ScanRefusedError, analyzeScan, mockScan } from './analyze.js';
import { ScanRequest } from './schema.js';

/**
 * Scan analysis proxy. Keeps the Anthropic API key off the phone.
 * Privacy: photos live only in memory for the duration of one request — never logged or written to disk.
 *
 * Env:
 *   ANTHROPIC_API_KEY   (or an `ant auth login` profile)  — required unless SCAN_MOCK=1
 *   SCAN_MOCK=1         return a sample result without calling the API
 *   APP_TOKEN           optional shared secret; clients send it as `x-app-token`
 *   PORT                default 8787
 */
const MOCK = process.env.SCAN_MOCK === '1';
const APP_TOKEN = process.env.APP_TOKEN;
const client = MOCK ? null : new Anthropic();

const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, mock: MOCK }));

app.post('/scan', bodyLimit({ maxSize: 20 * 1024 * 1024 }), async (c) => {
  if (APP_TOKEN && c.req.header('x-app-token') !== APP_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const parsed = ScanRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  if (MOCK || !client) return c.json(mockScan());

  try {
    return c.json(await analyzeScan(client, parsed.data));
  } catch (err) {
    if (err instanceof ScanRefusedError) return c.json({ error: err.message }, 422);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: 'Busy right now — try again in a minute.' }, 429);
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Scan: Anthropic authentication failed — check ANTHROPIC_API_KEY');
      return c.json({ error: 'Scanner is not configured.' }, 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Scan: Anthropic API error ${err.status}`);
      return c.json({ error: 'The scan service had a problem. Try again.' }, 502);
    }
    console.error('Scan failed:', err instanceof Error ? err.message : err);
    return c.json({ error: 'Something went wrong analyzing your photos.' }, 500);
  }
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Scan server on http://localhost:${port}${MOCK ? ' (mock mode)' : ''}`);
