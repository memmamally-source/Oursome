# Oursome AI service

A small Cloudflare Worker that lets the organiser understand everyday sentences with Claude. **It is not deployed.** Until it is, the app runs in its built-in Basic mode, and each reply says so.

## What it does

```
App ──POST /interpret──▶ Worker ──▶ Claude (structured output)
 │   message + small context          returns an Interpretation:
 │   (names, dates, refs; no IDs)      who, what, when; or a question
 ◀──────────── interpretation ─────────┘
 │
 └─ The app resolves people itself, shows review cards, and saves nothing until the user taps Add.
```

- **The API key stays on the server** as a Worker secret. It is never in the app, the website or this repository.
- **Structured outputs:** Claude must return JSON matching `src/schema.ts`, and the app checks it again (`sanitizeInterpretation`). The model can't invent people or IDs: names are resolved on the device, and edits can only target refs the app supplied.
- **Prompt-injection protection:** user text and data are fenced inside `<context>`, `<history>` and `<message>` tags, and the system prompt treats them as data. The worst a malicious message can do is propose something the user then sees and can dismiss.
- **Limits and cost cap:**
  - 10 requests a minute and 200 a day per device.
  - 2,000 model calls a day in total (`GLOBAL_PER_DAY`), so a day's bill has a ceiling.
  - Requests over 64 KB, messages over 1,000 characters and oversized context are refused before the model is called.
- **Reliability:** 10 s timeout and one retry. Any failure (busy, refused, bad output) returns an error, and the app quietly uses Basic mode for that message.
- **Safety fallbacks:** on Opus/Sonnet 5.5 the request opts into `fallbacks: "default"`, so a rare safety decline is re-run on Anthropic's recommended fallback model instead of failing.
- **Cost monitoring:** each request logs model, token counts and estimated cost (never the message text) to Cloudflare Workers Logs.
- **Browsers:** only origins listed in `ALLOWED_ORIGINS` can call it.

## Costs (what the owner would pay)

| Item | Cost |
|---|---|
| Cloudflare Workers, free plan | $0 (100,000 requests a day; no card needed) |
| Cloudflare KV (optional, shared rate limits) | $0 on the free plan at this scale |
| Claude API (paid to Anthropic) | Per message, depends on the model: |
| · `claude-opus-5-5` ($4 / $20 per million tokens) | about $0.02–0.05 per message |
| · `claude-haiku-5-5` ($0.10 / $0.50 per million tokens) | about $0.001 per message |

At 100 messages a day that is roughly $60–150 a month on Opus 5.5, or about $3 on Haiku 5.5. At most 2,000 calls are made a day (`GLOBAL_PER_DAY`), which caps a day's spend: about $40–100 on Opus 5.5 or about $2 on Haiku 5.5. These are estimates; real per-message figures appear in the logs once it runs. The system prompt is marked for prompt caching, but it is shorter than the minimum Opus caches, so expect little saving from caching at first.

The model is one setting (`AI_MODEL` in `wrangler.toml`). `AI_EFFORT` defaults to `low` for speed. Both are the owner's choice.

## Turning it on (only with the owner's approval)

1. Create a free Cloudflare account and an Anthropic API key (console.anthropic.com, which needs billing set up).
2. `cd server/ai && npm install`
3. `npx wrangler login`
4. `npx wrangler secret put ANTHROPIC_API_KEY` (paste the key; it's stored encrypted by Cloudflare).
5. `npx wrangler deploy`. This prints the service URL.
6. Set the GitHub repository variable `EXPO_PUBLIC_AI_ENDPOINT` to that URL and rebuild the website, so the app picks it up at build time.
7. Measure before relying on it: `AI_EVAL_ENDPOINT=<url> npm run eval:ai` (from the repo root) runs every organiser scenario against the live service. It fails if any message falls back to Basic mode. Each run costs a few cents.

## Development

```
npm test            # handler, limits, CORS, schema; a fake model, no network, no cost
npm run typecheck
```
