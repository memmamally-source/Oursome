import { ME_ID } from '@/features/space/store';
import type { CalendarEvent, CalendarSource, EventOccurrence, Member, Task } from '@/features/types';
import type { DateKey } from '@/lib/dates';
import type { AccentKey } from '@/theme/tokens';

/**
 * Whose event this is: an explicit person, else the owner of a member
 * calendar, else the person who made it. On this device that's you, so your
 * own appointments show under "Me" even when someone else is going too.
 */
export function eventOwner(event: CalendarEvent, calendars: CalendarSource[]): string | undefined {
  return event.personId ?? calendars.find((c) => c.id === event.calendarId)?.memberId ?? (event.taskId ? undefined : ME_ID);
}

/**
 * Colours for an entry: one per person it's for (its owner first, then who's
 * going), in their own colour. Entries with nobody named keep their
 * calendar's colour.
 */
export function eventAccents(event: CalendarEvent, calendars: CalendarSource[], people: Member[]): AccentKey[] {
  const calendar = calendars.find((c) => c.id === event.calendarId);
  const going = event.participantIds ?? [];
  // With people going but no owner named, it's the maker's (yours), so lead with your colour.
  const owner = event.personId ?? calendar?.memberId ?? (going.length && !event.taskId ? ME_ID : undefined);
  const ids = [owner, ...going].filter((id): id is string => !!id);
  const colours = [...new Set(ids.map((id) => people.find((p) => p.id === id)?.color).filter((c): c is AccentKey => !!c))];
  return colours.length ? colours : [event.taskId ? 'mint' : (calendar?.color ?? 'sky')];
}

/** Whether an event involves a person: theirs, or they're going. */
export function eventInvolves(event: CalendarEvent, personId: string, calendars: CalendarSource[]): boolean {
  return eventOwner(event, calendars) === personId || !!event.participantIds?.includes(personId);
}

/** Tasks belong to their assignee; unassigned tasks are the signed-in user's own. */
export function isTaskFor(task: Task, person: Member): boolean {
  if (task.assigneeId) return task.assigneeId === person.id;
  return !!person.isMe && !task.assigneeName;
}

export function openTasksFor(person: Member, tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.completedAt && isTaskFor(t, person));
}

/** How many things are on each person's plate today: open tasks due by today plus today's events. */
export function plateCounts(
  people: Member[],
  tasks: Task[],
  todayOccurrences: EventOccurrence[],
  calendars: CalendarSource[],
  today: DateKey,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of people) {
    const due = openTasksFor(p, tasks).filter((t) => t.due && t.due <= today).length;
    const events = todayOccurrences.filter((o) => eventInvolves(o.event, p.id, calendars)).length;
    counts[p.id] = due + events;
  }
  return counts;
}

/** Today's to-do list: open tasks and reminders due by today, overdue and high priority first. */
export function todayTasks(tasks: Task[], today: DateKey): Task[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return tasks
    .filter((t) => !t.completedAt && t.due && t.due <= today)
    .sort(
      (a, b) =>
        Number(b.due! < today) - Number(a.due! < today) ||
        rank[a.priority] - rank[b.priority] ||
        (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99') ||
        a.order - b.order,
    );
}
