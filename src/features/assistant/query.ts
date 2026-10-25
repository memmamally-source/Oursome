import { findConflicts } from '@/features/calendar/layout';
import { expandOccurrences } from '@/features/calendar/recurrence';
import type { EventOccurrence, Member, Task } from '@/features/types';
import {
  addDays,
  dateKeyOf,
  format,
  formatTime,
  fromDateKey,
  minutesOfDay,
  relativeDayLabel,
  timeFromMinutes,
  timeKeyOf,
  toDateKey,
  type DateKey,
} from '@/lib/dates';

import type { AssistantContext } from './context';
import type { Query } from './interpretation';
import { resolvePerson } from './resolve';

export type AnswerLine = { title: string; detail?: string; who?: string };
export type Answer = { text: string; lines: AnswerLine[] };

const STOP = new Set([
  'the',
  'a',
  'an',
  'to',
  'for',
  'of',
  'up',
  'on',
  'in',
  'at',
  'is',
  'are',
  'who',
  'whos',
  'responsible',
  'doing',
  'do',
  'does',
  'our',
  'my',
  'we',
  'today',
  'tomorrow',
  'from',
  'with',
]);

/** Loose keyword match: "groceries" ~ "grocery", "picking up the kids" ~ "Pick up kids". */
function topicMatches(title: string, topic: string): boolean {
  const words = topic
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|es|s)$/, '').slice(0, 5));
  if (!words.length) return false;
  const t = title.toLowerCase();
  const synonyms: Record<string, string[]> = {
    kid: ['children', 'child', 'kids'],
    child: ['kids', 'kid'],
    groce: ['shop', 'food'],
    pick: ['collect', 'fetch'],
    colle: ['pick', 'fetch'],
  };
  const hits = words.filter((w) => t.includes(w) || (synonyms[w] ?? []).some((s) => t.includes(s)));
  return hits.length >= Math.min(2, words.length);
}

function personFilter(member: Member | undefined, ctx: AssistantContext) {
  const memberCalendars = new Set(ctx.calendars.filter((c) => c.memberId).map((c) => c.id));
  return {
    task: (t: Task) => (!member ? true : member.isMe ? !t.assigneeId || t.assigneeId === member.id : t.assigneeId === member.id),
    event: (o: EventOccurrence) => {
      if (!member) return true;
      if (o.event.participantIds?.includes(member.id)) return true;
      const cal = ctx.calendars.find((c) => c.id === o.event.calendarId);
      if (o.event.personId) return o.event.personId === member.id;
      if (cal?.memberId) return cal.memberId === member.id;
      // Shared household events involve everyone; personal ones are the user's.
      return member.isMe ? !memberCalendars.has(o.event.calendarId) : o.event.visibility === 'shared';
    },
  };
}

const dayRange = (from: DateKey, to: DateKey) =>
  from === to ? relativeDayLabel(from).toLowerCase() : `${relativeDayLabel(from)} to ${relativeDayLabel(to)}`.toLowerCase();

function eventLine(o: EventOccurrence, ctx: AssistantContext, multiDay: boolean): AnswerLine {
  const who = o.event.personId ? ctx.people.find((p) => p.id === o.event.personId)?.name : undefined;
  const time = o.event.allDay ? 'all day' : `${formatTime(timeKeyOf(o.start))}–${formatTime(timeKeyOf(o.end))}`;
  return { title: o.event.title, detail: multiDay ? `${format(fromDateKey(o.date), 'EEE')} · ${time}` : time, who };
}

function taskLine(t: Task, ctx: AssistantContext): AnswerLine {
  const who = t.assigneeId ? ctx.people.find((p) => p.id === t.assigneeId)?.name : t.assigneeName;
  const due = t.due ? `${relativeDayLabel(t.due)}${t.dueTime ? ` · ${formatTime(t.dueTime)}` : ''}` : 'No date';
  return { title: t.title, detail: due, who: who ?? undefined };
}

/** Answer a question about the user's own data. Never invents anything. */
export function answerQuery(q: Query, ctx: AssistantContext): Answer {
  const assignee = resolvePerson(q.person, ctx);
  if (assignee && (assignee.status === 'unknown' || assignee.status === 'relation_unset' || assignee.status === 'unclear')) {
    return {
      text:
        assignee.status === 'relation_unset'
          ? `I don’t know who your ${assignee.relation} is yet. You can set that on their profile in Our Space.`
          : `I don’t know anyone called ${assignee.name} in your household yet.`,
      lines: [],
    };
  }
  const member = assignee && 'memberId' in assignee ? ctx.people.find((p) => p.id === assignee.memberId) : undefined;
  const name = member ? (member.isMe ? 'You' : member.name) : 'Everyone';
  const f = personFilter(member, ctx);
  const from = q.from ?? ctx.today;
  const to = q.to ?? from;
  const open = ctx.tasks.filter((t) => !t.completedAt);

  switch (q.kind) {
    case 'overdue': {
      const items = open.filter((t) => t.due && t.due < ctx.today && f.task(t));
      return items.length
        ? {
            text: `${items.length === 1 ? 'One task is' : `${items.length} tasks are`} overdue${member ? ` for ${member.isMe ? 'you' : member.name}` : ''}.`,
            lines: items.map((t) => taskLine(t, ctx)),
          }
        : { text: `Nothing is overdue${member && !member.isMe ? ` for ${member.name}` : ''}. Nicely done.`, lines: [] };
    }
    case 'tasks': {
      const ranged = !!q.from || !!q.to;
      // "Still to do today" includes anything overdue.
      const sinceAnyDay = ranged && from === ctx.today;
      const items = open.filter((t) => f.task(t) && (!ranged || (t.due && (sinceAnyDay || t.due >= from) && t.due <= to)));
      const late = sinceAnyDay ? items.filter((t) => t.due! < ctx.today).length : 0;
      const span = ranged ? ` ${dayRange(from, to)}${late ? ` (${late} overdue)` : ''}` : '';
      if (!items.length) return { text: `${name === 'You' ? 'You have' : `${name} has`} nothing to do${span}.`, lines: [] };
      return {
        text: `${name === 'You' ? 'You have' : `${name} has`} ${items.length} ${items.length === 1 ? 'thing' : 'things'} to do${span}:`,
        lines: items.slice(0, 12).map((t) => taskLine(t, ctx)),
      };
    }
    case 'responsibility': {
      const topic = q.topic ?? '';
      const occ = expandOccurrences(ctx.events, from, q.to ?? toDateKey(addDays(fromDateKey(from), 14))).filter((o) =>
        topicMatches(o.event.title, topic),
      );
      const tasks = open.filter((t) => topicMatches(t.title, topic) && (!q.from || !t.due || (t.due >= from && t.due <= to)));
      const lines = [...tasks.map((t) => taskLine(t, ctx)), ...occ.map((o) => eventLine(o, ctx, true))];
      if (!lines.length) return { text: `No one is down for ${topic || 'that'} yet. Want me to add it as a task?`, lines: [] };
      const owners = [...new Set(lines.map((l) => l.who).filter(Boolean))];
      const head = owners.length
        ? `${owners.join(' and ')} ${owners.length > 1 ? 'are' : 'is'} on it`
        : 'It’s on the list, but nobody is assigned yet';
      return { text: `${head}:`, lines };
    }
    case 'plan': {
      const occ = expandOccurrences(ctx.events, from, from).filter((o) => !o.event.allDay && f.event(o));
      const conflicts = findConflicts(occ);
      const tasksThatDay = open.filter((t) => t.due === from && f.task(t));
      const free: string[] = [];
      let cursor = 8 * 60;
      for (const o of [...occ].sort((a, b) => a.start.localeCompare(b.start))) {
        const s = dateKeyOf(o.start) < from ? 0 : minutesOfDay(timeKeyOf(o.start));
        if (s - cursor >= 60) free.push(`${formatTime(timeFromMinutes(cursor))}–${formatTime(timeFromMinutes(s))}`);
        cursor = Math.max(cursor, dateKeyOf(o.end) > from ? 24 * 60 : minutesOfDay(timeKeyOf(o.end)));
      }
      if (21 * 60 - cursor >= 60) free.push(`${formatTime(timeFromMinutes(cursor))}–9 PM`);
      const day = relativeDayLabel(from);
      const parts = [
        `${day} has ${occ.length || 'no'} ${occ.length === 1 ? 'appointment' : 'appointments'}${tasksThatDay.length ? ` and ${tasksThatDay.length} ${tasksThatDay.length === 1 ? 'task' : 'tasks'}` : ''}.`,
      ];
      parts.push(
        conflicts.length
          ? `${conflicts.map(([a, b]) => `${a.event.title} overlaps with ${b.event.title}`).join('; ')} — you may want to move one. I won’t change anything without asking.`
          : occ.length > 1
            ? 'Nothing overlaps.'
            : '',
      );
      if (free.length) parts.push(`Free time: ${free.join(', ')}.`);
      return {
        text: parts.filter(Boolean).join(' '),
        lines: [...occ.map((o) => eventLine(o, ctx, false)), ...tasksThatDay.map((t) => taskLine(t, ctx))],
      };
    }
    case 'agenda':
    default: {
      const occ = expandOccurrences(ctx.events, from, to).filter(f.event);
      const tasks = open.filter((t) => t.due && t.due >= from && t.due <= to && f.task(t));
      const span = dayRange(from, to);
      if (!occ.length && !tasks.length) {
        return { text: `${member ? (member.isMe ? 'You have' : `${member.name} has`) : 'There’s'} nothing planned ${span}.`, lines: [] };
      }
      const count = occ.length + tasks.length;
      const who = member ? (member.isMe ? 'You have' : `${member.name} has`) : 'There are';
      return {
        text: `${who} ${count} ${count === 1 ? 'thing' : 'things'} ${span}:`,
        lines: [...occ.map((o) => eventLine(o, ctx, from !== to)), ...tasks.map((t) => taskLine(t, ctx))],
      };
    }
  }
}
