import type { AssistantContext } from './context';
import { toModelContext } from './context';
import { sanitizeInterpretation, type Interpretation } from './interpretation';

/**
 * Client for the Oursome AI service (server/ai). The browser never holds an
 * AI key: it sends the message plus a minimal, ID-free context to our own
 * endpoint, which calls Claude and returns a schema-validated
 * `Interpretation`. Configure with EXPO_PUBLIC_AI_ENDPOINT at build time.
 */
export const AI_ENDPOINT = process.env.EXPO_PUBLIC_AI_ENDPOINT ?? '';

export type RemoteFailure = 'not_configured' | 'offline' | 'rate_limited' | 'unavailable' | 'invalid_response';

export class RemoteError extends Error {
  constructor(public reason: RemoteFailure) {
    super(reason);
  }
}

export type HistoryTurn = { role: 'user' | 'assistant'; text: string };

const TIMEOUT_MS = 15_000;

async function post(body: unknown, signal: AbortSignal): Promise<Response> {
  return fetch(`${AI_ENDPOINT.replace(/\/$/, '')}/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Oursome-Device': deviceId() },
    body: JSON.stringify(body),
    signal,
  });
}

export async function interpretRemote(text: string, ctx: AssistantContext, history: HistoryTurn[]): Promise<Interpretation> {
  if (!AI_ENDPOINT) throw new RemoteError('not_configured');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new RemoteError('offline');
  const body = { message: text.slice(0, 1000), context: toModelContext(ctx), history: history.slice(-6) };

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await post(body, controller.signal);
      if (res.status === 429) throw new RemoteError('rate_limited');
      if (res.status >= 500) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        throw new RemoteError('unavailable');
      }
      if (!res.ok) throw new RemoteError('unavailable');
      const json = await res.json();
      const interp = sanitizeInterpretation(json?.interpretation);
      if (!interp) throw new RemoteError('invalid_response');
      return interp;
    } catch (e) {
      if (e instanceof RemoteError) throw e;
      if (attempt === 0 && (e as Error).name !== 'AbortError') continue;
      throw new RemoteError((e as Error).name === 'AbortError' ? 'unavailable' : 'offline');
    } finally {
      clearTimeout(timer);
    }
  }
  throw new RemoteError('unavailable');
}

/** A random per-install ID so the service can rate-limit fairly. Not linked to the user. */
function deviceId(): string {
  try {
    const key = 'oursome.device';
    const store = (globalThis as { localStorage?: Storage }).localStorage;
    let id = store?.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      store?.setItem(key, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}
