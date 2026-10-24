import type { KVLike, Limiter } from './types';

/** Fixed-window counter. Window keys roll over on their own (no cleanup jobs). */
function windowKey(key: string, windowSeconds: number, nowMs: number): string {
  return `${key}:${Math.floor(nowMs / 1000 / windowSeconds)}`;
}

/** Per-instance memory. Fine for development; a Worker may run several instances, so use KV in production. */
export function memoryLimiter(now: () => number = Date.now): Limiter {
  const counts = new Map<string, number>();
  return {
    async hit(key, limit, windowSeconds) {
      const k = windowKey(key, windowSeconds, now());
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      if (counts.size > 10_000) counts.clear();
      return n <= limit;
    },
  };
}

/** KV-backed counters shared by all instances (eventually consistent, so limits are approximate). */
export function kvLimiter(kv: KVLike, now: () => number = Date.now): Limiter {
  return {
    async hit(key, limit, windowSeconds) {
      const k = windowKey(key, windowSeconds, now());
      const n = Number((await kv.get(k)) ?? 0) + 1;
      await kv.put(k, String(n), { expirationTtl: Math.max(60, windowSeconds * 2) });
      return n <= limit;
    },
  };
}
