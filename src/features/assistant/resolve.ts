import { useTasks } from '@/features/tasks/store';
import type { Member } from '@/features/types';
import { format, fromDateKey, relativeDayLabel, formatTime, type DateKey } from '@/lib/dates';
import { createId } from '@/lib/id';

import type { AssistantContext } from './context';
import type { Action, Interpretation, PersonMention, Query } from './interpretation';
import { capitalise, guessTaskCategory } from './parser';
import type { Assignee, ItemChanges, Proposal } from './proposals';

// ── People ─────────────────────────────────────────────────────────────

/** Relationship words that mean the same thing. Never crosses roles (wife ≠ partner). */
const RELATION_GROUPS = [
  ['mum', 'mom', 'mother', 'mummy', 'mommy', 'ma'],
  ['dad', 'father', 'daddy', 'papa', 'pa'],
  ['grandma', 'grandmother', 'granny', 'nan', 'nana', 'nanna', 'gran'],
  ['grandpa', 'grandfather', 'grandad', 'granddad', 'gramps'],
  ['wife'],
  ['husband'],
  ['partner'],
  ['spouse'],
  ['son'],
  ['daughter'],
  ['brother'],
  ['sister'],
  ['nanny', 'au pair'],
  ['housemate', 'flatmate', 'roommate'],
  ['boyfriend'],
  ['girlfriend'],
  ['aunt', 'auntie', 'aunty'],
  ['uncle'],
];

export function relationKey(word: string): string | null {
  const w = word.trim().toLowerCase();
  return RELATION_GROUPS.find((g) => g.includes(w))?.[0] ?? null;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, '')
    .trim();

function matchByName(name: string, people: Member[]): Member[] {
  const n = norm(name);
  const exact = people.filter((p) => norm(p.name) === n || (p.aliases ?? []).some((a) => norm(a) === n));
  if (exact.length) return exact;
  // "Rufaida" matches "Rufaida Khan"; "Ru" never matches "Rufaida" unless it's an alias.
  return people.filter((p) => norm(p.name).split(' ')[0] === n);
}

function matchByRelation(relation: string, people: Member[]): Member[] {
  const key = relationKey(relation) ?? norm(relation);
  return people.filter((p) => !p.isMe && p.relationship && (relationKey(p.relationship) ?? norm(p.relationship)) === key);
}

/** Match a mention against the household directory. */
export function resolvePerson(m: PersonMention | null | undefined, ctx: AssistantContext): Assignee | undefined {
  if (!m) return undefined;
  const me = ctx.people.find((p) => p.isMe);
  if (m.self) return { status: 'me', memberId: me?.id ?? 'me', name: me?.name ?? 'You' };
  if (m.household) return { status: 'household', name: 'Everyone' };
  if (m.pronoun && !m.name && !m.relation) {
    const last = ctx.people.find((p) => p.id === ctx.lastPersonId);
    if (last)
      return last.isMe ? { status: 'me', memberId: last.id, name: last.name } : { status: 'member', memberId: last.id, name: last.name };
    if (ctx.lastPersonName) return { status: 'unknown', name: ctx.lastPersonName };
    return { status: 'unclear', name: 'them' };
  }
  const others = ctx.people.filter((p) => !p.isMe);
  if (m.name) {
    const found = matchByName(m.name, ctx.people);
    if (found.length === 1) {
      const p = found[0];
      return p.isMe ? { status: 'me', memberId: p.id, name: p.name } : { status: 'member', memberId: p.id, name: p.name };
    }
    if (found.length > 1) return { status: 'ambiguous', name: capitalise(m.name), candidates: found };
    // "Mum needs to…" — a relationship word used like a name.
    if (relationKey(m.name)) return resolvePerson({ relation: m.name }, ctx);
    return { status: 'unknown', name: m.name.split(/\s+/).map(capitalise).join(' ') };
  }
  if (m.relation) {
    const found = matchByRelation(m.relation, ctx.people);
    const label = m.relation.toLowerCase();
    if (found.length === 1) return { status: 'member', memberId: found[0].id, name: found[0].name };
    if (found.length > 1) return { status: 'ambiguous', name: `your ${label}`, candidates: found };
    return { status: 'relation_unset', name: `your ${label}`, relation: label, candidates: others };
  }
  return undefined;
}

// ── Proposals ──────────────────────────────────────────────────────────

const ownerIsSomeoneElse = (a?: Assignee) => !!a && a.status !== 'me';

function categoryFor(action: Action, title: string): string {
  const known = new Set(useTasks.getState().categories.map((c) => c.id));
  if (action.category && known.has(action.category.toLowerCase())) return action.category.toLowerCase();
  return guessTaskCategory(title);
}

function changesFrom(action: Action, ctx: AssistantContext): ItemChanges {
  const changes: ItemChanges = {};
  if (action.date) changes.date = action.date;
  if (action.time) changes.time = action.time;
  if (action.endTime) changes.endTime = action.endTime;
  if (action.title) changes.title = action.title;
  const assignee = resolvePerson(action.person, ctx);
  if (assignee) changes.assignee = assignee;
  return changes;
}

function applyChanges(p: Proposal, c: ItemChanges, assumptions: string[]): Proposal {
  const next: Proposal = { ...p, assumptions: [...assumptions] };
  if (c.title) next.title = c.title;
  if (c.date) next.date = c.date;
  if (c.time) {
    next.time = c.time;
    next.allDay = false;
  }
  if (c.endTime) next.endTime = c.endTime;
  if (c.assignee) {
    next.assignee = c.assignee;
    next.visibility = ownerIsSomeoneElse(c.assignee) ? 'shared' : next.visibility;
  }
  return next;
}

export type Resolution = {
  /** New proposals to show. */
  proposals: Proposal[];
  /** Pending proposals from earlier in the conversation, revised. */
  updated: Proposal[];
  query?: Query;
  /** A question the user needs to answer before anything can be proposed. */
  clarify?: string;
  /** Model-written reply, only used when there's nothing else to say. */
  reply?: string;
};

/**
 * Turn an interpretation into reviewable proposals. Targets for edits must
 * be refs from this user's context; anything else is rejected, so neither
 * the model nor a pasted document can point an edit at data it wasn't shown.
 */
export function resolveInterpretation(interp: Interpretation, ctx: AssistantContext): Resolution {
  const out: Resolution = { proposals: [], updated: [] };
  const revised = new Map<string, Proposal>();
  const proposalByRef = (ref: string): Proposal | undefined => {
    const id = ctx.refs.proposals[ref];
    return (id && (revised.get(id) ?? ctx.proposals.find((p) => p.id === id))) || undefined;
  };
  const lastProposal = (): Proposal | undefined => {
    const fresh = out.proposals[out.proposals.length - 1];
    if (fresh) return fresh;
    const prior = [...ctx.proposals].reverse().find((p) => p.status !== 'dismissed' && p.kind !== 'person');
    return prior && (revised.get(prior.id) ?? prior);
  };

  for (const action of interp.actions) {
    const assumptions = action.assumptions ?? [];

    if (action.type === 'update_item') {
      const changes = changesFrom(action, ctx);
      const ref = action.target ?? 'last';
      const proposal = ref === 'last' ? lastProposal() : ref.startsWith('p') ? proposalByRef(ref) : undefined;
      if (proposal && proposal.status !== 'saved') {
        const next = applyChanges(proposal, changes, [
          ...proposal.assumptions.filter((a) => !changes.date || !/day|date|week|month/i.test(a)),
          ...assumptions,
        ]);
        if (out.proposals.includes(proposal)) out.proposals[out.proposals.indexOf(proposal)] = next;
        else revised.set(proposal.id, next);
        continue;
      }
      // A saved item: the proposal remembers what it created.
      const savedRef = proposal?.savedRef;
      const taskId = savedRef?.kind === 'task' ? savedRef.id : ref.startsWith('t') ? ctx.refs.tasks[ref] : undefined;
      const eventId = savedRef?.kind === 'event' ? savedRef.id : ref.startsWith('e') ? ctx.refs.events[ref] : undefined;
      const task = taskId ? ctx.tasks.find((t) => t.id === taskId) : undefined;
      const event = eventId ? ctx.events.find((e) => e.id === eventId) : undefined;
      if (!task && !event) {
        out.clarify = 'Which item should I change? I couldn’t find it.';
        continue;
      }
      out.proposals.push({
        id: createId('p_'),
        kind: 'update',
        title: task?.title ?? event!.title,
        categoryId: task?.categoryId ?? 'personal',
        visibility: task?.visibility ?? event!.visibility,
        update: {
          target: task ? { kind: 'task', id: task.id, title: task.title } : { kind: 'event', id: event!.id, title: event!.title },
          changes,
        },
        assumptions,
        status: 'pending',
      });
      continue;
    }

    if (action.type === 'add_person') {
      const name = (action.title ?? action.person?.name ?? '').trim();
      if (!name) continue;
      const already = matchByName(name, ctx.people);
      if (already.length) {
        out.reply = `${already[0].name} is already in your household.`;
        continue;
      }
      out.proposals.push({
        id: createId('p_'),
        kind: 'person',
        title: name.split(/\s+/).map(capitalise).join(' '),
        relation: action.relation ?? action.person?.relation ?? undefined,
        categoryId: 'family',
        visibility: 'shared',
        assumptions,
        status: 'pending',
      });
      continue;
    }

    if (action.type === 'add_shopping_items') {
      const items = (action.items ?? []).filter(Boolean);
      if (!items.length) continue;
      out.proposals.push({
        id: createId('p_'),
        kind: 'shopping',
        title: 'Add to shopping list',
        items,
        listName: action.listName ?? undefined,
        assignee: resolvePerson(action.person, ctx),
        categoryId: 'shopping',
        visibility: 'shared',
        assumptions,
        status: 'pending',
      });
      continue;
    }

    const title = (action.title ?? '').trim();
    if (!title) {
      out.clarify = out.clarify ?? 'What would you like me to add?';
      continue;
    }
    const assignee = resolvePerson(action.person, ctx);
    const kind = action.type === 'create_event' ? 'event' : action.type === 'create_reminder' ? 'reminder' : 'task';
    out.proposals.push({
      id: createId('p_'),
      kind,
      title: capitalise(title),
      date: action.date ?? undefined,
      time: action.time ?? undefined,
      endTime: action.endTime ?? undefined,
      allDay: kind === 'event' ? (action.allDay ?? !action.time) : undefined,
      location: action.location ?? undefined,
      categoryId: categoryFor(action, title),
      assignee,
      visibility: ownerIsSomeoneElse(assignee) ? 'shared' : 'private',
      assumptions,
      status: 'pending',
    });
  }

  out.updated = [...revised.values()];
  if (interp.query) out.query = interp.query;
  // A date the user must choose ("11/12") is asked even alongside the proposal it belongs to.
  if (interp.clarify && (interp.clarify.about === 'date' || (!out.proposals.length && !out.updated.length)))
    out.clarify = interp.clarify.question;
  if (interp.reply && !out.proposals.length && !out.updated.length && !out.query && !out.clarify) out.reply = interp.reply;
  return out;
}

// ── Plain-language summaries ───────────────────────────────────────────

function when(p: { date?: DateKey; time?: string; allDay?: boolean }, now: Date): string {
  if (!p.date) return '';
  const day = relativeDayLabel(p.date, now);
  const dayText = /^(Today|Tomorrow|Yesterday)$/.test(day)
    ? day.toLowerCase()
    : `on ${day.includes(' ') ? format(fromDateKey(p.date), 'EEEE d MMMM') : day}`;
  return p.time && !p.allDay ? `${dayText} at ${formatTime(p.time)}` : dayText;
}

const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

function ownerPhrase(a: Assignee | undefined, noun: string): string {
  if (!a || a.status === 'me') return `your ${noun}`;
  if (a.status === 'household') return `the household ${noun}`;
  if (a.status === 'relation_unset' || a.status === 'unclear') return `${a.name === 'them' ? 'their' : possessive(a.name)} ${noun}`;
  return `${possessive(a.name)} ${noun}`;
}

/** The confirmation sentence shown above a proposal card. */
export function describeProposal(p: Proposal, now: Date): string {
  const w = when(p, now);
  switch (p.kind) {
    case 'task':
      return `I’ll add “${p.title}” to ${ownerPhrase(p.assignee, 'tasks')}${w ? ` for ${w.replace(/^on /, '')}` : ''}.${p.date ? '' : ' No date was specified.'}`;
    case 'reminder': {
      const who = !p.assignee || p.assignee.status === 'me' ? 'you' : p.assignee.name;
      const what = p.title.charAt(0).toLowerCase() + p.title.slice(1);
      return `I’ll remind ${who} to ${what}${w ? ` ${w}` : ''}.${p.date ? '' : ' When should the reminder go off?'}`;
    }
    case 'event': {
      const whose =
        !p.assignee || p.assignee.status === 'me'
          ? 'your calendar'
          : p.assignee.status === 'household'
            ? 'the family calendar'
            : `${possessive(p.assignee.name)} calendar`;
      return `I’ll add “${p.title}” to ${whose}${w ? ` ${w}` : ''}.${p.date ? '' : ' Which day is it?'}`;
    }
    case 'shopping': {
      const items = p.items ?? [];
      const list = items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
      return `I’ll add ${list.toLowerCase()} to ${p.listName ?? 'your shopping list'}.`;
    }
    case 'person':
      return `I’ll add ${p.title}${p.relation ? ` (your ${p.relation})` : ''} to your household. No account or invitation is needed yet.`;
    case 'update': {
      const c = p.update!.changes;
      const parts: string[] = [];
      if (c.assignee) parts.push(`give it to ${c.assignee.status === 'me' ? 'you' : c.assignee.name}`);
      if (c.date || c.time) parts.push(`move it to ${when({ date: c.date ?? undefined, time: c.time }, now) || formatTime(c.time!)}`);
      if (c.title) parts.push(`rename it “${c.title}”`);
      return `I’ll update “${p.update!.target.title}”: ${parts.join(' and ') || 'no changes'}.`;
    }
  }
}
