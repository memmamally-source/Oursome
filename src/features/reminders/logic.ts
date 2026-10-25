import { expandOccurrences } from '@/features/calendar/recurrence';
import type { NotificationPrefs } from '@/features/settings/store';
import type { CalendarEvent, Task } from '@/features/types';
import { addDays, combine, formatTime, fromLocalDateTime, minutesOfDay, timeKeyOf, toDateKey, type DateKey } from '@/lib/dates';

/**
 * When reminders are due. Pure: the engine (engine.ts) asks for everything
 * due in a window since it last looked, delivers what's new and remembers
 * what it delivered, so nothing arrives twice.
 */

export type Reminder = {
  /** Stable per occurrence and setting: editing the time re-arms it. */
  id: string;
  kind: 'event' | 'task' | 'briefing';
  title: string;
  body: string;
  at: Date;
  /** Where tapping the reminder goes. */
  href: string;
};

type Input = {
  tasks: Task[];
  events: CalendarEvent[];
  prefs: NotificationPrefs;
  /** Window: after `from`, up to and including `to`. */
  from: Date;
  to: Date;
};

const ALL_DAY_AT = '09:00';
const MORNING_AT = '08:00';
const EVENING_AT = '19:30';

function beforeLabel(minutes: number): string {
  if (minutes <= 0) return 'Now';
  if (minutes < 60) return `In ${minutes} minutes`;
  if (minutes < 1440) return minutes === 60 ? 'In an hour' : `In ${minutes / 60} hours`;
  return minutes === 1440 ? 'Tomorrow' : `In ${Math.round(minutes / 1440)} days`;
}

function daysBetween(from: Date, to: Date): DateKey[] {
  const out: DateKey[] = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to; d = addDays(d, 1)) out.push(toDateKey(d));
  return out;
}

export function eventReminders({ events, from, to }: Pick<Input, 'events' | 'from' | 'to'>): Reminder[] {
  const out: Reminder[] = [];
  // A reminder can come up to a week before its event.
  const occurrences = expandOccurrences(
    events.filter((e) => e.reminderMinutes != null && !e.taskId),
    toDateKey(addDays(from, -1)),
    toDateKey(addDays(to, 8)),
  );
  for (const o of occurrences) {
    const minutes = o.event.reminderMinutes ?? 0;
    const start = o.event.allDay ? fromLocalDateTime(combine(o.date, ALL_DAY_AT)) : fromLocalDateTime(o.start);
    const at = new Date(start.getTime() - minutes * 60_000);
    if (at <= from || at > to) continue;
    const when = o.event.allDay ? (minutes >= 1440 ? 'Tomorrow' : 'Today') : `${beforeLabel(minutes)} · ${formatTime(timeKeyOf(o.start))}`;
    out.push({
      id: `e:${o.key}:${minutes}`,
      kind: 'event',
      title: o.event.title,
      body: o.event.location ? `${when} · ${o.event.location}` : when,
      at,
      href: `/event/${o.event.id}`,
    });
  }
  return out;
}

export function taskReminders({ tasks, from, to }: Pick<Input, 'tasks' | 'from' | 'to'>): Reminder[] {
  const out: Reminder[] = [];
  for (const t of tasks) {
    if (t.completedAt || !t.due || t.reminderMinutes == null) continue;
    const time = t.dueTime ?? ALL_DAY_AT;
    const at = new Date(fromLocalDateTime(combine(t.due, time)).getTime() - t.reminderMinutes * 60_000);
    if (at <= from || at > to) continue;
    const body = t.isReminder ? 'Reminder' : t.dueTime ? `Due ${formatTime(t.dueTime)}` : 'Due today';
    out.push({ id: `t:${t.id}:${t.due}:${time}:${t.reminderMinutes}`, kind: 'task', title: t.title, body, at, href: `/task/${t.id}` });
  }
  return out;
}

/** A short line about one day: "2 events and 3 tasks. First up: Dentist at 9:00 AM." */
export function daySummary(tasks: Task[], events: CalendarEvent[], day: DateKey): string {
  const occ = expandOccurrences(
    events.filter((e) => !e.taskId),
    day,
    day,
  ).sort((a, b) => a.start.localeCompare(b.start));
  const open = tasks.filter((t) => !t.completedAt && t.due === day);
  if (!occ.length && !open.length) return 'Nothing planned. Enjoy the space.';
  const parts = [
    occ.length ? `${occ.length} ${occ.length === 1 ? 'event' : 'events'}` : '',
    open.length ? `${open.length} ${open.length === 1 ? 'task' : 'tasks'}` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  const first = occ.find((o) => !o.event.allDay);
  return first ? `${parts}. First up: ${first.event.title} at ${formatTime(timeKeyOf(first.start))}.` : `${parts}.`;
}

export function briefings({ tasks, events, prefs, from, to }: Input): Reminder[] {
  const out: Reminder[] = [];
  for (const day of daysBetween(from, to)) {
    if (prefs.morningBriefing) {
      const at = fromLocalDateTime(combine(day, MORNING_AT));
      if (at > from && at <= to)
        out.push({ id: `b:m:${day}`, kind: 'briefing', title: 'Good morning', body: daySummary(tasks, events, day), at, href: '/' });
    }
    if (prefs.eveningBriefing) {
      const at = fromLocalDateTime(combine(day, EVENING_AT));
      const tomorrow = toDateKey(addDays(at, 1));
      if (at > from && at <= to)
        out.push({
          id: `b:e:${day}`,
          kind: 'briefing',
          title: 'Tomorrow',
          body: daySummary(tasks, events, tomorrow),
          at,
          href: '/calendar',
        });
    }
  }
  return out;
}

/** Everything due in the window that the person has switched on, earliest first. */
export function remindersDue(input: Input): Reminder[] {
  const { prefs } = input;
  return [...(prefs.appointments ? eventReminders(input) : []), ...(prefs.deadlines ? taskReminders(input) : []), ...briefings(input)].sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
}

/** Whether a moment falls in quiet hours (which may run past midnight). */
export function inQuietHours(at: Date, quiet: NotificationPrefs['quietHours']): boolean {
  if (!quiet.enabled) return false;
  const m = at.getHours() * 60 + at.getMinutes();
  const from = minutesOfDay(quiet.from);
  const to = minutesOfDay(quiet.to);
  return from <= to ? m >= from && m < to : m >= from || m < to;
}

/** Several reminders at once (say, after quiet hours) become one gentle summary. */
export function coalesce(due: Reminder[], max = 3): { single: Reminder[]; summary?: { title: string; body: string } } {
  if (due.length <= max) return { single: due };
  return {
    single: [],
    summary: {
      title: `${due.length} reminders`,
      body:
        due
          .map((r) => r.title)
          .slice(0, 4)
          .join(', ') + (due.length > 4 ? '…' : ''),
    },
  };
}
