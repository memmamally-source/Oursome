import { addMonths } from 'date-fns/addMonths';

import type { CalendarSource, EventOccurrence } from '@/features/types';
import { addDays, fromDateKey, monthGrid, toDateKey, weekDays, type DateKey } from '@/lib/dates';

import { eventOwner } from '../people/logic';

/** "days" is three days on phones and a full week on wide screens. */
export type CalendarView = 'day' | 'days' | 'month' | 'list';

export function columnsFor(view: CalendarView, selected: DateKey, wide: boolean): DateKey[] {
  if (view === 'day') return [selected];
  if (view !== 'days') return [];
  if (wide) return weekDays(fromDateKey(selected)).map(toDateKey);
  return [0, 1, 2].map((n) => toDateKey(addDays(fromDateKey(selected), n)));
}

/** First and last day whose events a view needs. */
export function rangeFor(view: CalendarView, selected: DateKey, wide: boolean): [DateKey, DateKey] {
  if (view === 'month') {
    const grid = monthGrid(fromDateKey(selected));
    return [toDateKey(grid[0]), toDateKey(grid[grid.length - 1])];
  }
  if (view === 'list') return [selected, toDateKey(addDays(fromDateKey(selected), 30))];
  const cols = columnsFor(view, selected, wide);
  return [cols[0], cols[cols.length - 1]];
}

/** The date the previous/next arrow moves to. */
export function stepFor(view: CalendarView, selected: DateKey, dir: 1 | -1, wide: boolean): DateKey {
  const d = fromDateKey(selected);
  if (view === 'month') return toDateKey(addMonths(d, dir));
  if (view === 'day') return toDateKey(addDays(d, dir));
  if (view === 'days') return toDateKey(addDays(d, dir * (wide ? 7 : 3)));
  return toDateKey(addDays(d, dir * 30));
}

/** Keep only one person's events (their own, or on their member calendar). */
export function onlyPerson(occurrences: EventOccurrence[], personId: string | null, calendars: CalendarSource[]): EventOccurrence[] {
  if (!personId) return occurrences;
  return occurrences.filter((o) => eventOwner(o.event, calendars) === personId);
}
