import { expandOccurrences } from '@/features/calendar/recurrence';
import type { CalendarEvent, Task } from '@/features/types';
import { addDays, toDateKey, type DateKey } from '@/lib/dates';

/**
 * The optional weekly look back, shown on Home on Sundays and Mondays: what
 * got done, what you did together, and a glance at the week ahead. Counts
 * only; no scores, streaks or comparisons.
 */
export type WeekSummary = {
  id: string;
  from: DateKey;
  to: DateKey;
  done: number;
  plans: number;
  memories: number;
  ahead: { plans: number; tasks: number };
};

export function showsWeekly(now: Date): boolean {
  return now.getDay() === 0 || now.getDay() === 1;
}

export function weekSummary(tasks: Task[], events: CalendarEvent[], memoryDates: string[], now: Date): WeekSummary {
  // Sunday looks at the seven days up to today; Monday at the seven days before it.
  const end = now.getDay() === 1 ? addDays(now, -1) : now;
  const from = toDateKey(addDays(end, -6));
  const to = toDateKey(end);
  const inWeek = (d?: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const visible = events.filter((e) => !e.taskId);
  const aheadFrom = toDateKey(addDays(end, 1));
  const aheadTo = toDateKey(addDays(end, 7));
  return {
    id: `weekly:${from}`,
    from,
    to,
    done: tasks.filter((t) => t.completedAt && inWeek(toDateKey(new Date(t.completedAt)))).length,
    plans: expandOccurrences(visible, from, to).length,
    memories: memoryDates.filter(inWeek).length,
    ahead: {
      plans: expandOccurrences(visible, aheadFrom, aheadTo).length,
      tasks: tasks.filter((t) => !t.completedAt && t.due && t.due >= aheadFrom && t.due <= aheadTo).length,
    },
  };
}

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** One or two warm sentences. */
export function weekLines(s: WeekSummary): { back: string; ahead: string } {
  const parts = [
    s.done ? `finished ${n(s.done, 'thing', 'things')}` : '',
    s.plans ? `had ${n(s.plans, 'plan', 'plans')}` : '',
    s.memories ? `kept ${n(s.memories, 'memory', 'memories')}` : '',
  ]
    .filter(Boolean)
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');
  const back = parts ? `This week you ${parts}.` : 'A quiet week. Those count too.';
  const aheadParts = [
    s.ahead.plans ? n(s.ahead.plans, 'plan', 'plans') : '',
    s.ahead.tasks ? `${n(s.ahead.tasks, 'task', 'tasks')} due` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  return { back, ahead: aheadParts ? `Coming up: ${aheadParts}.` : 'Nothing planned for the week ahead yet.' };
}
