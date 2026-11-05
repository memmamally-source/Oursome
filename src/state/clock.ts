import { useEffect, useState } from 'react';

/** Current time for rendering, refreshed every `intervalMs` (keeps render pure). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** A random seed fixed for the lifetime of a component. */
export function useSeed(): string {
  const [seed] = useState(() => Math.random().toString(36).slice(2));
  return seed;
}
