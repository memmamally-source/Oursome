import { PERSONAL_CALENDAR_ID, useCalendar } from '@/features/calendar/store';
import { addPerson, claimSuggestedTasks } from '@/features/people/service';
import { useShopping } from '@/features/shopping/store';
import { familyOf } from '@/features/space/families';
import { ME_ID, useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { Member, Task } from '@/features/types';
import {
  combine,
  dateKeyOf,
  deviceTimeZone,
  fromLocalDateTime,
  minutesOfDay,
  timeFromMinutes,
  timeKeyOf,
  toLocalDateTime,
} from '@/lib/dates';

import { blockingIssue, type Assignee, type Proposal } from './proposals';

/** Task fields for an assignee: an ID only for real household members. */
function familyIdFor(a: Assignee | undefined): string | undefined {
  if (!a || a.status !== 'member') return undefined;
  const { spaces } = useSpace.getState();
  return familyOf(a.memberId, spaces)?.id;
}

function assigneeFields(a: Assignee | undefined): Pick<Task, 'assigneeId' | 'assigneeName'> {
  if (!a) return { assigneeId: undefined, assigneeName: undefined };
  if (a.status === 'me' || a.status === 'member') return { assigneeId: a.memberId, assigneeName: undefined };
  if (a.status === 'suggested') return { assigneeId: undefined, assigneeName: a.name };
  return { assigneeId: undefined, assigneeName: undefined };
}

function calendarFor(a: Assignee | undefined): string {
  const { calendars } = useCalendar.getState();
  if (a && a.status === 'member') {
    const own = calendars.find((c) => c.memberId === a.memberId);
    if (own) return own.id;
  }
  if (a && a.status !== 'me') {
    const shared = calendars.find((c) => c.kind === 'shared');
    if (shared) return shared.id;
  }
  return PERSONAL_CALENDAR_ID;
}

export class ProposalError extends Error {}

/**
 * Save an approved proposal. This is the only place assistant output turns
 * into data, and it re-checks everything: the person must be resolved, an
 * edit target must still exist, and nothing is ever deleted.
 */
export function executeProposal(p: Proposal): Proposal {
  const issue = blockingIssue(p);
  if (issue) throw new ProposalError(issue);
  const shared = !!p.assignee && p.assignee.status !== 'me';
  // Something for Mum goes to the family Mum is in; otherwise the family being viewed.
  const spaceId = shared ? familyIdFor(p.assignee) : undefined;

  switch (p.kind) {
    case 'task':
    case 'reminder': {
      const task = useTasks.getState().addTask({
        title: p.title,
        categoryId: p.categoryId,
        priority: 'medium',
        due: p.date,
        dueTime: p.time,
        isReminder: p.kind === 'reminder',
        reminderMinutes: p.kind === 'reminder' ? 0 : null,
        visibility: shared ? 'shared' : 'private',
        spaceId,
        ...assigneeFields(p.assignee),
      });
      return { ...p, status: 'saved', savedRef: { kind: 'task', id: task.id } };
    }
    case 'event': {
      const start = p.allDay || !p.time ? '00:00' : p.time;
      const end = p.allDay || !p.time ? '23:59' : (p.endTime ?? timeFromMinutes(Math.min(minutesOfDay(p.time) + 60, 23 * 60 + 59)));
      const personId = p.assignee && (p.assignee.status === 'member' || p.assignee.status === 'me') ? p.assignee.memberId : undefined;
      const event = useCalendar.getState().addEvent({
        title: p.title,
        start: combine(p.date!, start),
        end: combine(p.date!, end),
        allDay: !!p.allDay || !p.time,
        timeZone: deviceTimeZone(),
        calendarId: calendarFor(p.assignee),
        personId: personId === ME_ID ? undefined : personId,
        location: p.location,
        visibility: shared ? 'shared' : 'private',
        spaceId,
        reminderMinutes: 30,
      });
      return { ...p, status: 'saved', savedRef: { kind: 'event', id: event.id } };
    }
    case 'shopping': {
      const shop = useShopping.getState();
      const wanted = p.listName?.toLowerCase();
      let list =
        (wanted && shop.lists.find((l) => l.name.toLowerCase() === wanted)) ||
        shop.lists.find((l) => /grocer|shopping/i.test(l.name)) ||
        shop.lists[0];
      if (!list)
        list = shop.addList({
          name: p.listName ?? 'Groceries',
          color: 'mint',
          icon: 'basket-outline',
          visibility: useSpace.getState().space ? 'shared' : 'private',
        });
      for (const item of p.items ?? []) useShopping.getState().addItem(list.id, item, ME_ID);
      return { ...p, status: 'saved', savedRef: { kind: 'list', id: list.id } };
    }
    case 'person': {
      const person = addPerson({ name: p.title, relationship: p.relation });
      claimSuggestedTasks(person);
      return { ...p, status: 'saved', savedRef: { kind: 'person', id: person.id } };
    }
    case 'update': {
      const { target, changes } = p.update!;
      if (target.kind === 'task') {
        const task = useTasks.getState().tasks.find((t) => t.id === target.id);
        if (!task) throw new ProposalError('That task no longer exists.');
        const patch: Partial<Task> = {};
        if (changes.title) patch.title = changes.title;
        if (changes.date) patch.due = changes.date;
        if (changes.time) patch.dueTime = changes.time;
        if (changes.assignee) {
          Object.assign(patch, assigneeFields(changes.assignee));
          if (changes.assignee.status !== 'me') {
            patch.visibility = 'shared';
            patch.spaceId = familyIdFor(changes.assignee) ?? task.spaceId;
          }
        }
        useTasks.getState().updateTask(task.id, patch);
      } else {
        const event = useCalendar.getState().events.find((e) => e.id === target.id);
        if (!event) throw new ProposalError('That event no longer exists.');
        const duration = fromLocalDateTime(event.end).getTime() - fromLocalDateTime(event.start).getTime();
        const date = changes.date ?? dateKeyOf(event.start);
        const time = changes.time ?? timeKeyOf(event.start);
        const start = combine(date, time);
        const patch: Record<string, unknown> = { start, end: toLocalDateTime(new Date(fromLocalDateTime(start).getTime() + duration)) };
        if (changes.title) patch.title = changes.title;
        if (changes.assignee && changes.assignee.status === 'member') patch.personId = changes.assignee.memberId;
        useCalendar.getState().updateEvent(event.id, patch);
      }
      return { ...p, status: 'saved', savedRef: target };
    }
  }
}

// ── Decisions about people on a proposal ───────────────────────────────

const setAssignee = (p: Proposal, a: Assignee | undefined): Proposal =>
  p.update
    ? { ...p, update: { ...p.update, changes: { ...p.update.changes, assignee: a } } }
    : { ...p, assignee: a, visibility: a && a.status !== 'me' ? 'shared' : p.visibility };

/** Pick an existing member; optionally remember the relationship ("Rufaida is my wife"). */
export function chooseMember(p: Proposal, member: Member, rememberRelation?: string): Proposal {
  if (rememberRelation) useSpace.getState().updatePerson(member.id, { relationship: rememberRelation });
  return setAssignee(
    p,
    member.isMe ? { status: 'me', memberId: member.id, name: member.name } : { status: 'member', memberId: member.id, name: member.name },
  );
}

/** Add the named person to the household (no account, no invitation sent). */
export function addAndAssign(p: Proposal, name: string, opts: { relation?: string; invite?: boolean } = {}): Proposal {
  const person = addPerson({ name, relationship: opts.relation });
  if (opts.invite) useSpace.getState().updatePerson(person.id, { invitePending: true });
  return setAssignee(p, { status: 'member', memberId: person.id, name: person.name });
}

/** Keep the name as a suggested assignee without adding anyone. */
export function keepAsSuggestion(p: Proposal): Proposal {
  const a = p.update?.changes.assignee ?? p.assignee;
  return setAssignee(p, a ? { status: 'suggested', name: a.name } : undefined);
}

export function unassign(p: Proposal): Proposal {
  return setAssignee(p, undefined);
}
