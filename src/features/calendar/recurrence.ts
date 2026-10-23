import { addDays, addMonths, addYears, differenceInCalendarDays, getDaysInMonth } from 'date-fns';

import type { CalendarEvent, EventOccurrence, Recurrence } from '@/features/types';
import { combine, dateKeyOf, fromDateKey, fromLocalDateTime, timeKeyOf, toDateKey, toLocalDateTime, type DateKey } from '@/lib/dates';

/** Day-of-month for `anchorDay` in the month of `d`, clamped (31st → 30th/28th…). */
function clampedDay(d: Date, anchorDay: number): number {
  return Math.min(anchorDay, getDaysInMonth(d));
}

/** Whether a series anchored on `anchor` has an occurrence on `date`. */
export function occursOn(anchor: DateKey, rule: Recurrence | null | undefined, date: DateKey): boolean {
  if (date === anchor) return true;
  if (!rule || date < anchor) return false;
  if (rule.until && date > rule.until) return false;

  const a = fromDateKey(anchor);
  const d = fromDateKey(date);
  const interval = Math.max(1, rule.interval ?? 1);
  const days = differenceInCalendarDays(d, a);

  switch (rule.freq) {
    case 'daily':
      return days % interval === 0;
    case 'weekdays': {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6;
    }
    case 'weekly':
      return days % (7 * interval) === 0;
    case 'monthly': {
      const months = (d.getFullYear() - a.getFullYear()) * 12 + (d.getMonth() - a.getMonth());
      return months % interval === 0 && d.getDate() === clampedDay(d, a.getDate());
    }
    case 'yearly': {
      const years = d.getFullYear() - a.getFullYear();
      return years % interval === 0 && d.getMonth() === a.getMonth() && d.getDate() === clampedDay(d, a.getDate());
    }
  }
}

/** The next date in the series strictly after `from`. */
export function nextOccurrence(anchor: DateKey, rule: Recurrence, from: DateKey): DateKey | null {
  const interval = Math.max(1, rule.interval ?? 1);
  const a = fromDateKey(anchor);
  let candidate: Date;
  let step = 0;
  // Iterate in rule-sized steps from the anchor so clamped months stay anchored.
  const at = (n: number): Date => {
    switch (rule.freq) {
      case 'daily':
        return addDays(a, n * interval);
      case 'weekdays':
        return addDays(a, n);
      case 'weekly':
        return addDays(a, n * 7 * interval);
      case 'monthly': {
        const m = addMonths(new Date(a.getFullYear(), a.getMonth(), 1), n * interval);
        return new Date(m.getFullYear(), m.getMonth(), clampedDay(m, a.getDate()));
      }
      case 'yearly': {
        const y = addYears(new Date(a.getFullYear(), a.getMonth(), 1), n * interval);
        return new Date(y.getFullYear(), y.getMonth(), clampedDay(y, a.getDate()));
      }
    }
  };
  do {
    step += 1;
    candidate = at(step);
    if (step > 5000) return null;
  } while (toDateKey(candidate) <= from || (rule.freq === 'weekdays' && !occursOn(anchor, rule, toDateKey(candidate))));
  const key = toDateKey(candidate);
  if (rule.until && key > rule.until) return null;
  return key;
}

/** Expand events into concrete occurrences overlapping [from, to] (inclusive DateKeys). */
export function expandOccurrences(events: CalendarEvent[], from: DateKey, to: DateKey): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const startDate = fromDateKey(from);
  const span = differenceInCalendarDays(fromDateKey(to), startDate);

  for (const event of events) {
    const anchor = dateKeyOf(event.start);
    const durationMs = fromLocalDateTime(event.end).getTime() - fromLocalDateTime(event.start).getTime();
    const durationDays = Math.max(0, differenceInCalendarDays(fromLocalDateTime(event.end), fromLocalDateTime(event.start)));

    if (!event.recurrence) {
      const endKey = dateKeyOf(event.end);
      if (endKey < from || anchor > to) continue;
      out.push({ key: `${event.id}@${anchor}`, event, date: anchor, start: event.start, end: event.end });
      continue;
    }

    // Look back far enough to catch multi-day occurrences that started before `from`.
    for (let i = -durationDays; i <= span; i++) {
      const date = toDateKey(addDays(startDate, i));
      if (!occursOn(anchor, event.recurrence, date)) continue;
      const start = combine(date, timeKeyOf(event.start));
      const end = toLocalDateTime(new Date(fromLocalDateTime(start).getTime() + durationMs));
      out.push({ key: `${event.id}@${date}`, event, date, start, end });
    }
  }

  return out.sort((x, y) => {
    if (x.event.allDay !== y.event.allDay) return x.event.allDay ? -1 : 1;
    return x.start.localeCompare(y.start);
  });
}

/** Occurrences touching a single day (multi-day events included). */
export function occurrencesOnDay(events: CalendarEvent[], date: DateKey): EventOccurrence[] {
  return expandOccurrences(events, date, date).filter((o) => dateKeyOf(o.start) <= date && dateKeyOf(o.end) >= date);
}

export function describeRecurrence(rule: Recurrence | null | undefined): string | null {
  if (!rule) return null;
  const n = rule.interval ?? 1;
  const base = {
    daily: n === 1 ? 'Every day' : `Every ${n} days`,
    weekdays: 'Every weekday',
    weekly: n === 1 ? 'Every week' : `Every ${n} weeks`,
    monthly: n === 1 ? 'Every month' : `Every ${n} months`,
    yearly: n === 1 ? 'Every year' : `Every ${n} years`,
  }[rule.freq];
  return rule.until ? `${base} until ${rule.until}` : base;
}
