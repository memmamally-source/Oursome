import { MAX_CONTEXT_CHARS, RequestSchema } from './schema';
import type { Env, Interpreter, Limiter, LogEvent, Usage } from './types';

export type Deps = {
  interpret: Interpreter;
  limiter: Limiter;
  log: (event: LogEvent) => void;
};

/** Published prices, USD per million tokens (input, output, cache read). Used only for cost logs. */
const PRICES: Record<string, [number, number, number]> = {
  'claude-opus-5-5': [4, 20, 0.2],
  'claude-sonnet-5-5': [2, 10, 0.2],
  'claude-haiku-5-5': [0.1, 0.5, 0.01],
};

export function estimateCostUsd(model: string, u: Usage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  return (u.input_tokens * p[0] + cacheWrite * p[0] * 1.25 + cacheRead * p[2] + u.output_tokens * p[1]) / 1_000_000;
}

const MAX_BODY_BYTES = 64 * 1024;
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Oursome-Device',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/**
 * POST /interpret: validate, rate-limit, ask the model, return the
 * interpretation. The service never reads or writes the user's data; the
 * app sends a minimal, ID-free context and applies nothing without approval.
 */
export async function handle(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin, env);
  const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

  // Browsers must come from an allowed origin. Native apps send no Origin header.
  if (origin && !cors['Access-Control-Allow-Origin']) return json(403, { error: 'origin_not_allowed' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (url.pathname === '/health' && request.method === 'GET') return json(200, { ok: true });
  if (url.pathname !== '/interpret') return json(404, { error: 'not_found' });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'invalid_request' });
  if (JSON.stringify(parsed.data.context).length > MAX_CONTEXT_CHARS) return json(413, { error: 'context_too_large' });

  const device = request.headers.get('X-Oursome-Device')?.slice(0, 64) || request.headers.get('CF-Connecting-IP') || 'anonymous';
  const ok =
    (await deps.limiter.hit(`m:${device}`, num(env.PER_DEVICE_PER_MINUTE, 10), 60)) &&
    (await deps.limiter.hit(`d:${device}`, num(env.PER_DEVICE_PER_DAY, 200), 86_400)) &&
    (await deps.limiter.hit('global', num(env.GLOBAL_PER_DAY, 2000), 86_400));
  if (!ok) {
    deps.log({ event: 'rate_limited' });
    return json(429, { error: 'rate_limited' }, { 'Retry-After': '60' });
  }

  const started = Date.now();
  const result = await deps.interpret(parsed.data);
  const usage = result.usage;
  deps.log({
    event: 'interpret',
    ok: result.ok,
    reason: result.ok ? undefined : result.reason,
    model: result.model,
    ms: Date.now() - started,
    input_tokens: usage?.input_tokens,
    output_tokens: usage?.output_tokens,
    cache_read_tokens: usage?.cache_read_input_tokens ?? 0,
    cost_usd: result.model && usage ? estimateCostUsd(result.model, usage) : null,
  });

  if (result.ok) return json(200, { interpretation: result.interpretation });
  if (result.reason === 'busy') return json(429, { error: 'busy' }, { 'Retry-After': '30' });
  if (result.reason === 'not_configured') return json(503, { error: 'not_configured' });
  // The app treats these as "use Basic mode", so one failure never breaks it.
  return json(502, { error: result.reason });
}
