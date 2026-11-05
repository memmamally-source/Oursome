/** Study-time and activity summaries (pure). In-app and external time are kept separate. */
import type { ExternalLog, ProgressState } from './progress';
import { addDays, dateKey } from './random';
import type { DayTime } from './studyTime';

/** A day counts as active with at least one minute of tracked study or any logged external study. */
export const ACTIVE_DAY_MS = 60_000;

export function isActiveDay(day: DayTime | undefined, ext: number): boolean {
  return (day?.total ?? 0) >= ACTIVE_DAY_MS || ext > 0;
}

function externalByDay(ext: ExternalLog[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of ext) out[e.date] = (out[e.date] ?? 0) + e.minutes * 60_000;
  return out;
}

export function sumDays(days: Record<string, DayTime>, from: string, to: string): number {
  let t = 0;
  for (const [k, v] of Object.entries(days)) if (k >= from && k <= to) t += v.total;
  return t;
}

/** Monday-start week containing `key`. */
export function weekStart(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(key, -dow);
}

export interface TimeSummary {
  today: number;
  week: number;
  month: number;
  lifetime: number;
  averageDaily: number; // over active days
  externalToday: number;
  externalWeek: number;
  externalLifetime: number;
  streak: number;
  activeDaysThisMonth: number;
  activeDaysTotal: number;
}

export function timeSummary(s: Pick<ProgressState, 'days' | 'external'>, now = Date.now()): TimeSummary {
  const today = dateKey(now);
  const ws = weekStart(today);
  const ms = today.slice(0, 8) + '01';
  const ext = externalByDay(s.external);
  const extSum = (from: string, to: string) => Object.entries(ext).reduce((t, [k, v]) => (k >= from && k <= to ? t + v : t), 0);
  const allKeys = new Set([...Object.keys(s.days), ...Object.keys(ext)]);
  const active = [...allKeys].filter((k) => isActiveDay(s.days[k], ext[k] ?? 0));
  const lifetime = Object.values(s.days).reduce((t, d) => t + d.total, 0);
  const inAppActive = Object.values(s.days).filter((d) => d.total >= ACTIVE_DAY_MS).length;

  // Streak: consecutive active days ending today, or ending yesterday if today has no study yet
  // (so the streak isn't shown as broken before the learner has had a chance to study today).
  let streak = 0;
  let cursor = isActiveDay(s.days[today], ext[today] ?? 0) ? today : addDays(today, -1);
  while (isActiveDay(s.days[cursor], ext[cursor] ?? 0)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return {
    today: s.days[today]?.total ?? 0,
    week: sumDays(s.days, ws, today),
    month: sumDays(s.days, ms, today),
    lifetime,
    averageDaily: inAppActive ? lifetime / inAppActive : 0,
    externalToday: ext[today] ?? 0,
    externalWeek: extSum(ws, today),
    externalLifetime: Object.values(ext).reduce((a, b) => a + b, 0),
    streak,
    activeDaysThisMonth: active.filter((k) => k >= ms && k <= today).length,
    activeDaysTotal: active.length,
  };
}

/** Total in-app ms by key (game, discipline, system, activity) across all days. */
export function totalsBy(days: Record<string, DayTime>, key: 'byGame' | 'byDiscipline' | 'bySystem' | 'byActivity'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of Object.values(days)) for (const [k, v] of Object.entries(d[key])) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** Last `n` days, oldest first, for charts. */
export function lastDays(days: Record<string, DayTime>, n: number, now = Date.now()): { key: string; ms: number }[] {
  const today = dateKey(now);
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - n + 1);
    return { key, ms: days[key]?.total ?? 0 };
  });
}

export function answeredTotals(counts: ProgressState['counts']): { answered: number; correct: number } {
  return Object.values(counts).reduce((t, c) => ({ answered: t.answered + c.answered, correct: t.correct + c.correct }), { answered: 0, correct: 0 });
}
