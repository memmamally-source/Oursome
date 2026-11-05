/**
 * Active study-time accounting (pure).
 *
 * Rules (LEARNING_ANALYTICS.md):
 *  - Time counts only while a study context is open (a game, lesson, review or explanation),
 *    the page is visible, and the learner interacted within `idleMs`.
 *  - Each tick credits at most `maxTickMs`, so a suspended laptop or a throttled background tab
 *    can never add a large block of time in one go.
 *  - Only the tab holding the timer lock counts (no double counting across tabs).
 */
import type { StudyContext } from './events';

export const IDLE_MS = 90_000; // reading a detailed explanation can take a while without input
export const TICK_MS = 5_000;
export const MAX_TICK_MS = 10_000;
export const LOCK_STALE_MS = 15_000;

export interface TimerInputs {
  now: number;
  lastTick: number | null;
  lastInteraction: number;
  visible: boolean;
  hasContext: boolean;
  holdsLock: boolean;
}

/** Milliseconds to credit for the period since the last tick. */
export function creditableMs(i: TimerInputs, idleMs = IDLE_MS, maxTickMs = MAX_TICK_MS): number {
  if (i.lastTick === null) return 0;
  if (!i.visible || !i.hasContext || !i.holdsLock) return 0;
  if (i.now - i.lastInteraction > idleMs) return 0;
  const delta = i.now - i.lastTick;
  if (delta <= 0) return 0;
  return Math.min(delta, maxTickMs);
}

export interface Lock {
  tabId: string;
  at: number;
}

/** Whether `tabId` may hold the lock given the current stored lock. */
export function canHoldLock(lock: Lock | null, tabId: string, now: number, staleMs = LOCK_STALE_MS): boolean {
  return !lock || lock.tabId === tabId || now - lock.at > staleMs;
}

export interface DayTime {
  total: number;
  byGame: Record<string, number>;
  byDiscipline: Record<string, number>;
  bySystem: Record<string, number>;
  byActivity: Record<string, number>;
}

export const emptyDay = (): DayTime => ({ total: 0, byGame: {}, byDiscipline: {}, bySystem: {}, byActivity: {} });

const add = (rec: Record<string, number>, key: string | undefined, ms: number) => {
  if (key) rec[key] = (rec[key] ?? 0) + ms;
};

/**
 * Credit `ms` to a day. Time with several concepts is split evenly between their disciplines and
 * systems so totals still add up.
 */
export function creditDay(
  day: DayTime,
  ms: number,
  ctx: StudyContext,
  classify: (conceptId: string) => { discipline: string; system: string } | undefined,
): DayTime {
  const next: DayTime = {
    total: day.total + ms,
    byGame: { ...day.byGame },
    byDiscipline: { ...day.byDiscipline },
    bySystem: { ...day.bySystem },
    byActivity: { ...day.byActivity },
  };
  add(next.byGame, ctx.gameId, ms);
  add(next.byActivity, ctx.activity, ms);
  const tags = (ctx.conceptIds ?? []).map(classify).filter((x): x is NonNullable<typeof x> => !!x);
  if (tags.length) {
    const share = ms / tags.length;
    for (const t of tags) {
      add(next.byDiscipline, t.discipline, share);
      add(next.bySystem, t.system, share);
    }
  }
  return next;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return ms > 0 ? '<1 min' : '0 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}
