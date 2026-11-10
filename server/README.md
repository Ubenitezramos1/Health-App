# Scan server

A small proxy that sends the two physique photos to Claude (`claude-opus-5-5`, vision + structured output) and returns the analysis. It exists so the Anthropic API key never ships inside the phone app.

- **Privacy:** photos live only in memory for one request. They are never logged or written to disk. Anthropic processes API data under its own retention policy.
- **Refusal fallback:** requests opt into server-side fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). If a safety classifier declines, the API retries on Anthropic's recommended fallback model instead of failing. Remove it in `src/analyze.ts` if you'd rather not.
- **Cost:** roughly two ~1080 px images plus a short JSON answer per scan, at Claude Opus 5.5 rates ($4 / $20 per million input/output tokens).

## Run

```bash
npm install
SCAN_MOCK=1 npm start                  # sample result, no API key needed
ANTHROPIC_API_KEY=sk-ant-... npm start # real analysis
```

Optional env:

| Variable | Purpose |
|---|---|
| `PORT` | Default `8787` |
| `APP_TOKEN` | Shared secret; the app sends it as `x-app-token` (set `EXPO_PUBLIC_SCAN_APP_TOKEN` in the app) |

## Pointing the app at it

The app calls `EXPO_PUBLIC_SCAN_API_URL` (default `http://localhost:8787`). On a physical phone, `localhost` is the phone itself, so use your computer's LAN address (for example `http://192.168.1.20:8787`) or a deployed URL:

```bash
EXPO_PUBLIC_SCAN_API_URL=http://192.168.1.20:8787 npx expo start
```

Before a public release, deploy this behind HTTPS with `APP_TOKEN` (or real user auth) and rate limiting.
