import { expandOccurrences } from '@/features/calendar/recurrence';
import { useCalendar, visibleEvents } from '@/features/calendar/store';
import { useSession } from '@/features/session/store';
import { useShopping } from '@/features/shopping/store';
import { ME_ID, useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { CalendarEvent, CalendarSource, Member, ShoppingList, Task } from '@/features/types';
import { addDays, deviceTimeZone, format, toDateKey, type DateKey } from '@/lib/dates';

import type { Proposal } from './proposals';

/**
 * Everything the assistant is allowed to know for one request: the user's
 * own household directory, tasks, calendar and lists from this device.
 * Items are exposed to the AI under short refs (t1, e1, p1) — never raw
 * IDs — and the resolver only accepts refs that exist in this snapshot.
 */
export type AssistantContext = {
  now: Date;
  today: DateKey;
  timeZone: string;
  people: Member[];
  tasks: Task[];
  events: CalendarEvent[];
  calendars: CalendarSource[];
  lists: ShoppingList[];
  /** Proposals from this conversation, newest last. */
  proposals: Proposal[];
  /** The person most recently talked about, for "her"/"him"/"them". */
  lastPersonId?: string;
  lastPersonName?: string;
  refs: {
    tasks: Record<string, string>;
    events: Record<string, string>;
    proposals: Record<string, string>;
  };
};

export function buildContext(
  now: Date,
  conversation: { proposals: Proposal[]; lastPersonId?: string; lastPersonName?: string },
): AssistantContext {
  const profile = useSession.getState().profile;
  const space = useSpace.getState().space;
  const me: Member = { id: ME_ID, name: profile?.name ?? 'You', color: profile?.color ?? 'coral', role: 'admin', isMe: true };
  const people = space ? space.members.map((m) => (m.isMe ? { ...m, name: profile?.name ?? m.name } : m)) : [me];
  const { events, calendars } = useCalendar.getState();
  return {
    now,
    today: toDateKey(now),
    timeZone: deviceTimeZone(),
    people,
    tasks: useTasks.getState().tasks,
    events: visibleEvents(events, calendars),
    calendars,
    lists: useShopping.getState().lists,
    proposals: conversation.proposals,
    lastPersonId: conversation.lastPersonId,
    lastPersonName: conversation.lastPersonName,
    refs: makeRefs(useTasks.getState().tasks, visibleEvents(events, calendars), conversation.proposals, toDateKey(now)),
  };
}

/** Pure ref assignment so tests can build contexts without stores. */
export function makeRefs(tasks: Task[], events: CalendarEvent[], proposals: Proposal[], today: DateKey): AssistantContext['refs'] {
  const refs: AssistantContext['refs'] = { tasks: {}, events: {}, proposals: {} };
  relevantTasks(tasks).forEach((t, i) => (refs.tasks[`t${i + 1}`] = t.id));
  relevantEvents(events, today).forEach((e, i) => (refs.events[`e${i + 1}`] = e.id));
  proposals.forEach((p, i) => (refs.proposals[`p${i + 1}`] = p.id));
  return refs;
}

/** Open tasks, most urgent first, capped to keep requests small. */
function relevantTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 60);
}

/** Events from today through the next three weeks. */
function relevantEvents(events: CalendarEvent[], today: DateKey): CalendarEvent[] {
  const end = toDateKey(addDays(new Date(`${today}T12:00:00`), 21));
  const ids = new Set(expandOccurrences(events, today, end).map((o) => o.event.id));
  return events.filter((e) => ids.has(e.id)).slice(0, 60);
}

/**
 * The minimal, ID-free view sent to the AI service. Contains only this
 * user's own data; no other household's information can appear here.
 */
export function toModelContext(ctx: AssistantContext) {
  const byId = new Map(ctx.people.map((p) => [p.id, p]));
  const who = (id?: string, name?: string) => (id ? (byId.get(id)?.isMe ? 'me' : byId.get(id)?.name) : name) ?? null;
  const invert = (m: Record<string, string>) => new Map(Object.entries(m).map(([ref, id]) => [id, ref]));
  const taskRefs = invert(ctx.refs.tasks);
  const eventRefs = invert(ctx.refs.events);
  const propRefs = invert(ctx.refs.proposals);
  return {
    today: ctx.today,
    weekday: format(ctx.now, 'EEEE'),
    time: format(ctx.now, 'HH:mm'),
    timeZone: ctx.timeZone,
    people: ctx.people.map((p) => ({
      name: p.isMe ? `${p.name} (me)` : p.name,
      relationship: p.relationship ?? null,
      aliases: p.aliases ?? [],
      hasAccount: (p.kind ?? 'account') === 'account',
    })),
    lastPerson: ctx.lastPersonName ?? null,
    tasks: ctx.tasks
      .filter((t) => taskRefs.has(t.id))
      .map((t) => ({ ref: taskRefs.get(t.id), title: t.title, due: t.due ?? null, time: t.dueTime ?? null, assignee: who(t.assigneeId, t.assigneeName) })),
    events: ctx.events
      .filter((e) => eventRefs.has(e.id))
      .map((e) => ({ ref: eventRefs.get(e.id), title: e.title, start: e.start, end: e.end, allDay: e.allDay, repeats: e.recurrence?.freq ?? null, person: who(e.personId) })),
    shoppingLists: ctx.lists.map((l) => l.name),
    conversation: ctx.proposals.map((p) => ({ ref: propRefs.get(p.id), kind: p.kind, title: p.title, status: p.status, date: p.date ?? null, person: p.assignee?.name ?? null })),
  };
}
