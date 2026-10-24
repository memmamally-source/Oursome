import type { CalendarEvent, CalendarSource, EventOccurrence, Member, Task } from '@/features/types';
import type { DateKey } from '@/lib/dates';

/** Whose event this is: an explicit person, else the owner of a member calendar. */
export function eventOwner(event: CalendarEvent, calendars: CalendarSource[]): string | undefined {
  return event.personId ?? calendars.find((c) => c.id === event.calendarId)?.memberId;
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
    const events = todayOccurrences.filter((o) => eventOwner(o.event, calendars) === p.id).length;
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
