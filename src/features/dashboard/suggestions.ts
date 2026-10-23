import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';

import { findConflicts, findTightGaps } from '@/features/calendar/layout';
import type { EventOccurrence, IconName, Task } from '@/features/types';
import { formatTime, fromDateKey, timeKeyOf, type DateKey } from '@/lib/dates';
import type { AccentKey } from '@/theme/tokens';

export type SuggestionAction =
  | { type: 'open-calendar'; date: DateKey }
  | { type: 'open-tasks' }
  | { type: 'plan-tomorrow' }
  | { type: 'move-overdue-to-today'; taskIds: string[] }
  | { type: 'create-task'; title: string; due: DateKey };

export type Suggestion = {
  /** Stable per day so a dismissal sticks until the situation changes. */
  id: string;
  icon: IconName;
  accent: AccentKey;
  text: string;
  actionLabel: string;
  action: SuggestionAction;
};

export type SuggestionInput = {
  now: Date;
  today: DateKey;
  todayOccurrences: EventOccurrence[];
  tomorrowOccurrences: EventOccurrence[];
  upcomingImportant: EventOccurrence[];
  tasks: Task[];
};

const numberWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = (n: number) => numberWords[n] ?? String(n);

/**
 * Rule-based suggestions from real calendar and task data. Ordered by
 * usefulness; the dashboard shows the first one not dismissed. Nothing here
 * changes data — every action needs the user to tap it.
 */
export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const { now, today, todayOccurrences, tomorrowOccurrences, tasks, upcomingImportant } = input;
  const out: Suggestion[] = [];
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const ahead = todayOccurrences.filter((o) => o.event.allDay || timeKeyOf(o.end) > nowTime);

  const [conflict] = findConflicts(ahead);
  if (conflict) {
    const [a, b] = conflict;
    out.push({
      id: `conflict:${a.key}:${b.key}`,
      icon: 'git-compare-outline',
      accent: 'coral',
      text: `${a.event.title} and ${b.event.title} overlap at ${formatTime(timeKeyOf(b.start))}. Want to take a look?`,
      actionLabel: 'View day',
      action: { type: 'open-calendar', date: today },
    });
  }

  const [gap] = findTightGaps(ahead);
  if (gap) {
    const [a, b] = gap;
    out.push({
      id: `gap:${a.key}:${b.key}`,
      icon: 'car-outline',
      accent: 'sky',
      text: `${a.event.title} ends at ${formatTime(timeKeyOf(a.end))} and ${b.event.title} starts at ${formatTime(timeKeyOf(b.start))} somewhere else. These might conflict if you need travel time.`,
      actionLabel: 'View day',
      action: { type: 'open-calendar', date: today },
    });
  }

  const tomorrowTimed = tomorrowOccurrences.filter((o) => !o.event.allDay);
  if (tomorrowTimed.length >= 3) {
    out.push({
      id: `prep:${today}`,
      icon: 'moon-outline',
      accent: 'lavender',
      text: `You have ${say(tomorrowTimed.length)} appointments tomorrow. Would you like to prepare your to-do list ${now.getHours() >= 12 ? 'tonight' : 'today'}?`,
      actionLabel: 'Plan tomorrow',
      action: { type: 'plan-tomorrow' },
    });
  }

  const overdue = tasks.filter((t) => !t.completedAt && t.due && t.due < today);
  if (overdue.length) {
    out.push({
      id: `overdue:${today}:${overdue.length}`,
      icon: 'time-outline',
      accent: 'sunshine',
      text:
        overdue.length === 1
          ? `“${overdue[0].title}” slipped past its date. Move it to today?`
          : `${say(overdue.length)[0].toUpperCase() + say(overdue.length).slice(1)} tasks slipped past their dates. Move them to today?`,
      actionLabel: 'Move to today',
      action: { type: 'move-overdue-to-today', taskIds: overdue.map((t) => t.id) },
    });
  }

  const [important] = upcomingImportant;
  if (important) {
    const days = differenceInCalendarDays(fromDateKey(important.date), fromDateKey(today));
    const title = `Card or gift for ${important.event.title.replace(/[’']s birthday$/i, '')}`;
    if (days > 1 && !tasks.some((t) => !t.completedAt && t.title === title)) {
      out.push({
        id: `important:${important.key}`,
        icon: 'gift-outline',
        accent: 'sunshine',
        text: `${important.event.title} is in ${say(days)} days. Add a reminder to sort a card or gift?`,
        actionLabel: 'Add task',
        action: { type: 'create-task', title, due: important.date },
      });
    }
  }

  const openToday = tasks.filter((t) => !t.completedAt && t.due === today && !t.isReminder).length;
  if (openToday + todayOccurrences.length >= 10) {
    out.push({
      id: `busy:${today}`,
      icon: 'speedometer-outline',
      accent: 'coral',
      text: `Today looks full: ${todayOccurrences.length} events and ${openToday} tasks. Could some tasks move to tomorrow?`,
      actionLabel: 'Review tasks',
      action: { type: 'open-tasks' },
    });
  }

  return out;
}
