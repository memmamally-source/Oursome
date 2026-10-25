/**
 * Basic mode: a small, predictable, on-device interpreter used when the AI
 * service is unavailable (offline, not configured, or failing). It is NOT a
 * language model: it recognises common sentence shapes ("Rufaida needs to…",
 * "Remind Dad to…", "Sarah has a dentist appointment on Tuesday") and simple
 * follow-ups, and otherwise asks. It emits the same `Interpretation` as the
 * AI so the resolver, review cards and tests are shared.
 */
import { addDays } from 'date-fns/addDays';
import { nextSaturday } from 'date-fns/nextSaturday';
import { startOfWeek } from 'date-fns/startOfWeek';

import { fromDateKey, toDateKey, type DateKey } from '@/lib/dates';

import { expandOccurrences } from '@/features/calendar/recurrence';

import type { AssistantContext } from './context';
import type { Action, Interpretation, PersonMention, Query } from './interpretation';
import { capitalise, cleanTitle, extractWhen, looksLikeEvent, parseCapture, restoreCase, startsWithTaskVerb } from './parser';
import { relationKey } from './resolve';

const NOT_NAMES = new Set(
  (
    'i me we us you it this that there here they he she him her them his its our my your the a an someone somebody everyone everybody ' +
    'nobody anyone anybody something nothing today tomorrow tonight yesterday monday tuesday wednesday thursday friday saturday sunday ' +
    'january february march april may june july august september october november december please also and then actually remember ' +
    'what who when where why how can could would will should do does is are add buy get put make set move give take call pay book plan ' +
    'remind ask tell organise organize schedule create new next last this kids children family school work home ' +
    'christmas easter eid diwali ramadan hanukkah halloween thanksgiving valentine valentines'
  ).split(' '),
);

const PRONOUNS = /^(her|him|them|she|he|they)$/i;
const HOUSEHOLD = /^(we|us|our family|the family|everyone|everybody|the household|all of us)$/i;
const SELF = /^(i|me|myself)$/i;

/** Decide whether a subject phrase names a person, and how. */
function personFrom(phrase: string, ctx: AssistantContext): PersonMention | null {
  const p = phrase.trim().replace(/[,.!?]$/, '');
  if (!p) return null;
  if (SELF.test(p)) return { self: true };
  if (HOUSEHOLD.test(p)) return { household: true };
  if (PRONOUNS.test(p)) return { pronoun: true };
  const rel = p.match(/^(?:my|our)\s+([a-z ]+)$/i);
  if (rel && relationKey(rel[1])) return { relation: rel[1].toLowerCase() };
  if (isKnown(p, ctx)) return { name: p };
  if (relationKey(p) && /^[A-Z]/.test(p)) return { relation: p.toLowerCase() };
  // An unknown capitalised name: "Rufaida", "Mary Jane". Not "The", not "Monday".
  const words = p.split(/\s+/);
  if (words.length <= 2 && words.every((w) => /^[A-Z][a-zA-Z'’-]+$/.test(w) && !NOT_NAMES.has(w.toLowerCase()))) return { name: p };
  // Lower-case input ("rufaida needs to…"): accept one unfamiliar word before a strong cue.
  if (words.length === 1 && /^[a-z][a-z'’-]{2,}$/.test(p) && !NOT_NAMES.has(p)) return { name: capitalise(p) };
  return null;
}

function isKnown(name: string, ctx: AssistantContext): boolean {
  const n = name.toLowerCase();
  return ctx.people.some(
    (m) => m.name.toLowerCase() === n || m.name.toLowerCase().split(' ')[0] === n || (m.aliases ?? []).some((a) => a.toLowerCase() === n),
  );
}

const VERB_START =
  /^(?:then\s+)?(?:remind|buy|get|grab|pick|collect|fetch|call|phone|ring|pay|book|take|bring|drop|make|send|email|text|clean|cook|order|renew|pack|walk|feed|water|wash|fix|return|sign|post|tidy|sort|visit|drive|do|go|check|plan|prepare|organise|organize)\b/i;

/** Split "collect the kids at 3, buy milk and remind me to pay the bill" into actions. */
function splitClauses(text: string): string[] {
  const parts = text.split(/\s*(?:,|;|\band then\b|\bthen\b|\balso\b|\band\b)\s*/i).filter(Boolean);
  const merged: string[] = [];
  for (const part of parts) {
    // "milk, eggs and bread" stay together: only a verb starts a new action.
    if (merged.length && !VERB_START.test(part)) merged[merged.length - 1] += `, ${part}`;
    else merged.push(part);
  }
  return merged;
}

/** Rebuild "milk, eggs, bread" → ["Milk", "Eggs", "Bread"]. */
function items(text: string): string[] {
  return text
    .split(/,|\band\b|&/)
    .map((s) => s.trim().replace(/^(?:some|a|an|the|more)\s+/i, ''))
    .filter(Boolean)
    .map(capitalise);
}

/** Interpret one action clause with the existing capture parser. */
function clause(
  text: string,
  person: PersonMention | null,
  ctx: AssistantContext,
  opts: { subjectHas: boolean; reminder: boolean },
): { action?: Action; clarify?: string } {
  let t = text.trim().replace(/[.!]+$/, '');
  let who = person;
  let reminder = opts.reminder;
  const subjectHas = opts.subjectHas;

  const remind = t.match(/^remind\s+(\S+(?:\s+[A-Z]\S*)?)\s+(?:to|about|that)\s+(.+)$/i);
  if (remind) {
    reminder = true;
    who = personFrom(remind[1], ctx) ?? who;
    t = remind[2];
  }
  // A pronoun inside the message refers to its own subject ("…, and remind her to…").
  if (who?.pronoun && person && !person.pronoun) who = person;

  // "…when she takes the kids to the park" → same day as that item.
  let linkedDate: string | undefined;
  const when = t.match(/\s+(?:when|before|after)\s+(?:she|he|they|i|we|you)\s+(.+)$/i);
  if (when) {
    linkedDate = findRelatedDate(when[1], ctx);
    t = t.slice(0, when.index);
  }

  // "Dentist for me on Tuesday", "Swimming kit for Sarah": the person after "for" is who it's for.
  // Unknown names only count for appointment-like titles, so "Tickets for Hamilton" stays as written.
  if (!who || who.self) {
    const forWho = t.match(/^(.+?)\s+for\s+(me|myself|(?:my|our)\s+[a-z]+|[A-Z][a-zA-Z-]+)(?=[\s,.!?]|$)(.*)$/);
    const mention = forWho ? personFrom(forWho[2], ctx) : null;
    if (
      forWho &&
      mention &&
      !mention.household &&
      !mention.pronoun &&
      (!mention.name || isKnown(mention.name, ctx) || looksLikeEvent(forWho[1]))
    ) {
      who = mention;
      t = `${forWho[1]}${forWho[3]}`;
    }
  }

  // Buying things for yourself goes on the shopping list; for someone else it's their task.
  const buy = t.match(/^(?:buy|get|grab|pick up)\s+(.+)$/i);
  if (buy && !reminder && (!who || who.self || who.household) && !/\b(today|tomorrow|tonight|on|by|before|at)\b/i.test(buy[1])) {
    return { action: { type: 'add_shopping_items', items: items(buy[1]), person: null } };
  }

  if (buy && !reminder && who && !who.self && !who.household) {
    const w = extractWhen(t.toLowerCase(), ctx.now);
    const title = restoreCase(cleanTitle(w.rest), t);
    return {
      action: {
        type: 'create_task',
        title,
        person: who,
        date: w.date ?? null,
        time: w.time ?? null,
        category: 'shopping',
        assumptions: w.assumptions,
      },
    };
  }

  const prefixed = `${reminder ? 'remind me to ' : ''}${t}`;
  const parsed = parseCapture(prefixed, { now: ctx.now, members: [], listNames: ctx.lists.map((l) => l.name) });
  const proposal =
    parsed.type === 'proposals'
      ? (parsed.proposals.find((p) => p.kind !== 'shopping') ?? parsed.proposals[0])
      : parsed.type === 'clarify'
        ? parsed.pending.find((p) => p.kind !== 'shopping')
        : undefined;
  if (!proposal) return { clarify: 'I didn’t quite catch that — what should I add?' };
  if (proposal.kind === 'shopping')
    return { action: { type: 'add_shopping_items', items: proposal.items ?? [], listName: proposal.listName, person: null } };

  let type: Action['type'] =
    proposal.kind === 'event' ? 'create_event' : proposal.kind === 'reminder' || reminder ? 'create_reminder' : 'create_task';
  // "Sarah has a dentist appointment" is an event; "Rufaida needs to collect the kids at 3" is a task.
  if (subjectHas && looksLikeEvent(proposal.title)) type = 'create_event';
  if (!subjectHas && type === 'create_event' && startsWithTaskVerb(proposal.title)) type = 'create_task';
  if (type === 'create_event' && !proposal.date && !proposal.time) type = subjectHas ? 'create_event' : 'create_task';

  const assumptions = [...proposal.assumptions];
  let date = proposal.date ?? linkedDate;
  if (linkedDate && !proposal.date) assumptions.push('Same day as the related plan');
  // A time with no date ("collect the kids at 3") means today, or tomorrow if that time has passed.
  if (!date && proposal.time && type !== 'create_event') {
    const [h, m] = proposal.time.split(':').map(Number);
    const later = h * 60 + m > ctx.now.getHours() * 60 + ctx.now.getMinutes();
    date = toDateKey(later ? ctx.now : addDays(ctx.now, 1));
    assumptions.push(`No date given — set to ${later ? 'today' : 'tomorrow'}`);
  }
  const clarify = parsed.type === 'clarify' && parsed.question.startsWith('Did you mean') ? parsed.question : undefined;
  return {
    action: {
      type,
      title: proposal.title,
      person: who,
      date: date ?? null,
      time: proposal.time ?? null,
      endTime: proposal.endTime ?? null,
      allDay: type === 'create_event' ? !proposal.time : null,
      location: proposal.location ?? null,
      category: proposal.categoryId ?? null,
      assumptions,
    },
    clarify,
  };
}

/** Date of an item in the conversation or data whose title matches the words given. */
function findRelatedDate(words: string, ctx: AssistantContext): string | undefined {
  const keys = words
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const score = (title: string) => keys.filter((k) => title.toLowerCase().includes(k.replace(/(es|s)$/, ''))).length;
  const candidates = [
    ...ctx.proposals.map((p) => ({ title: p.title, date: p.date })),
    ...ctx.tasks.filter((t) => !t.completedAt).map((t) => ({ title: t.title, date: t.due })),
    ...ctx.events.map((e) => ({ title: e.title, date: e.start.slice(0, 10) })),
  ].filter((c) => c.date && score(c.title) >= 2);
  return candidates[0]?.date;
}

/** Find a ref for an existing item by keywords: newest proposal first, then tasks, then events. */
function findTarget(words: string, ctx: AssistantContext): string | null {
  const keys = words
    .toLowerCase()
    .replace(/\b(task|job|appointment|the|my|our|her|his|that|this)\b/g, ' ')
    .split(/\W+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/(ies|y|es|s)$/, ''));
  if (!keys.length) return null;
  const hit = (title: string) => keys.some((k) => title.toLowerCase().includes(k));
  const props = Object.entries(ctx.refs.proposals).reverse();
  for (const [ref, id] of props) {
    const p = ctx.proposals.find((x) => x.id === id);
    if (p && p.status !== 'dismissed' && hit(p.title)) return ref;
  }
  for (const [ref, id] of Object.entries(ctx.refs.tasks)) {
    const t = ctx.tasks.find((x) => x.id === id);
    if (t && hit(t.title)) return ref;
  }
  for (const [ref, id] of Object.entries(ctx.refs.events)) {
    const e = ctx.events.find((x) => x.id === id);
    if (e && hit(e.title)) return ref;
  }
  return null;
}

/** Date range for questions: "this weekend", "Saturday", "tomorrow", "this week". */
function rangeFrom(lower: string, ctx: AssistantContext): { from?: DateKey; to?: DateKey } {
  const today = fromDateKey(ctx.today);
  if (/\bweekend\b/.test(lower)) {
    const sat = today.getDay() === 6 ? today : today.getDay() === 0 ? addDays(today, -1) : nextSaturday(today);
    return { from: toDateKey(today.getDay() === 0 ? today : sat), to: toDateKey(addDays(sat, 1)) };
  }
  if (/\bnext week\b/.test(lower)) {
    const mon = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    return { from: toDateKey(mon), to: toDateKey(addDays(mon, 6)) };
  }
  if (/\bthis week\b|\bweek\b/.test(lower)) return { from: ctx.today, to: toDateKey(addDays(startOfWeek(today, { weekStartsOn: 1 }), 6)) };
  const w = extractWhen(lower, ctx.now);
  return w.date ? { from: w.date, to: w.date } : {};
}

function queryPerson(original: string, ctx: AssistantContext): PersonMention | null {
  if (/\b(everyone|everybody|we|our|us|family)\b/i.test(original)) return { household: true };
  const rel = original.match(/\bmy\s+([a-z]+)(?:'s|’s)?\b/i);
  if (rel && relationKey(rel[1])) return { relation: rel[1].toLowerCase() };
  for (const m of original.matchAll(/\b([A-Z][a-zA-Z'’-]+)(?:'s|’s)?\b/g)) {
    const p = personFrom(m[1], ctx);
    if (p?.name || p?.relation) return p;
  }
  if (/\b(do i|have i|am i|my)\b/i.test(original)) return { self: true };
  return null;
}

function detectQuery(original: string, lower: string, ctx: AssistantContext): Query | null {
  if (/^(?:can|could|would) you\b|^please\b/.test(lower)) return null;
  // "Could Rufaida take the kids swimming?" is a request for Rufaida, not a question about the calendar.
  const polite = original.match(/^(?:[Cc]an|[Cc]ould|[Ww]ould|[Ww]ill)\s+(\S+(?:\s+[A-Z]\S*)?)\s+[a-z]/);
  if (polite && personFrom(polite[1], ctx) && !/^(i|we|you)$/i.test(polite[1])) return null;
  if (
    /^plan\b|^organi[sz]e (my|our) (day|tasks|saturday|sunday|weekend|monday|tuesday|wednesday|thursday|friday)|without overlapping|avoid clashes/.test(
      lower,
    )
  ) {
    const r = rangeFrom(lower, ctx);
    return {
      kind: 'plan',
      from: r.from ?? ctx.today,
      to: r.from ?? ctx.today,
      person: /\b(our|we|us)\b/.test(lower) ? { household: true } : { self: true },
    };
  }
  const question =
    /\?$/.test(original) ||
    /^(what|whats|what's|who|whos|who's|when|which|do|does|did|is|are|have|has|anything|any|how many|show|list|tell me)\b/.test(lower);
  if (!question) return null;
  const r = rangeFrom(lower, ctx);
  if (/\b(overdue|late|missed|behind)\b/.test(lower)) return { kind: 'overdue', person: queryPerson(original, ctx) };
  const who = lower.match(/^who(?:'s|’s| is| are|'re| will be)?\s+(?:responsible for\s+|doing\s+|in charge of\s+)?(.+?)\??$/);
  if (who) {
    const topic = who[1].replace(/\b(today|tomorrow|tonight|this weekend|this week|on \w+day)\b/g, '').trim();
    return { kind: 'responsibility', topic, from: r.from ?? null, to: r.to ?? null };
  }
  const person = queryPerson(original, ctx);
  if (/\b(to ?do|tasks?|chores?|jobs?)\b/.test(lower))
    return r.from ? { kind: 'tasks', person, from: r.from, to: r.to ?? r.from } : { kind: 'tasks', person };
  return { kind: 'agenda', person, from: r.from ?? ctx.today, to: r.to ?? r.from ?? ctx.today };
}

/** "Add these ingredients: flour, eggs…" or a pasted list, one item per line. */
const LIST_INTRO =
  /^(?:please\s+)?(?:add|put|get|buy)\s+(?:these|the following|this|those|some|all (?:of )?these)?\s*(?:ingredients|items|things|groceries|bits)\b[^:\n]*(?::|\n)([\s\S]+)$/i;

function listItems(text: string): string[] {
  return text
    .split(/\n|,|;|\band\b|&/)
    .map((s) =>
      s
        .trim()
        .replace(/^(?:[-•*]|\d+[.)])\s*/, '')
        .replace(/[.!]+$/, '')
        .replace(/^(?:some|a|an|the|more)\s+/i, ''),
    )
    .filter(Boolean)
    .map(capitalise);
}

/** "Remind us about our anniversary": a reminder the day before a saved important date. */
function occasionReminder(lower: string, ctx: AssistantContext): Interpretation | null {
  const m = lower.match(
    /^remind\s+(us|me|everyone)\s+(?:about|of)\s+(?:our|my|the|mum's|mom's|dad's|[a-z]+'s)?\s*(anniversary|birthday|[a-z' ]*birthday|[a-z' ]*anniversary)$/,
  );
  if (!m) return null;
  const words = m[2].split(/\s+/).filter((w) => w.length > 2);
  const candidates = ctx.events.filter((e) => e.isImportantDate || e.recurrence?.freq === 'yearly');
  const match = candidates.find((e) => words.every((w) => e.title.toLowerCase().replace(/['’]/g, "'").includes(w)));
  const what = m[2];
  if (!match) {
    return {
      reply: '',
      actions: [],
      clarify: {
        question: `When is your ${what}? Add it as an important date on the calendar and I’ll remind you the day before.`,
        about: 'date',
      },
    };
  }
  const next = expandOccurrences([match], ctx.today, toDateKey(addDays(fromDateKey(ctx.today), 400)))[0];
  if (!next) return null;
  const date = toDateKey(addDays(fromDateKey(next.date), -1));
  return {
    reply: '',
    actions: [
      {
        type: 'create_reminder',
        title: `${match.title} is tomorrow`,
        person: m[1] === 'me' ? { self: true } : { household: true },
        date: date < ctx.today ? next.date : date,
        time: '09:00',
        assumptions: ['The day before, at 9 AM, so there’s time to plan'],
      },
    ],
  };
}

export function interpretBasic(input: string, ctx: AssistantContext): Interpretation {
  const list = input.trim().match(LIST_INTRO);
  if (list) {
    const found = listItems(list[1]);
    if (found.length) return { reply: '', actions: [{ type: 'add_shopping_items', items: found, person: null }] };
  }
  const original = input.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
  const stripped = original.replace(/^(?:hey|hi|ok|okay|so)[,!]?\s+/i, '');
  const lower = stripped.toLowerCase().replace(/[.!]+$/, '');
  const none = (clarify: string): Interpretation => ({ reply: '', actions: [], clarify: { question: clarify, about: 'what' } });
  if (!lower) return none('What would you like me to do?');

  const occasion = occasionReminder(lower, ctx);
  if (occasion) return occasion;

  const query = detectQuery(stripped, lower, ctx);
  if (query) return { reply: '', actions: [], query };

  let text = stripped
    .replace(/[.!?]+$/, '')
    .replace(/^(?:can|could|would) you\s+(?:please\s+)?|^please\s+/i, '')
    // "Could Rufaida take…" → "Rufaida will take…"
    .replace(/^(?:[Cc]an|[Cc]ould|[Ww]ould|[Ww]ill)\s+([A-Z]\S*(?:\s+[A-Z]\S*)?|my\s+[a-z]+)\s+(?=[a-z])/, '$1 will ');

  // ── Household directory ──
  const addPerson = text.match(
    /^add\s+(?:my\s+([a-z]+)\s+)?([A-Za-z][A-Za-z'’ -]*?)\s+(?:to|into)\s+(?:our|the|my)\s+(?:household|family|home|space|our space|people)$/i,
  );
  if (addPerson) {
    return {
      reply: '',
      actions: [
        { type: 'add_person', title: addPerson[2].split(/\s+/).map(capitalise).join(' '), relation: addPerson[1]?.toLowerCase() ?? null },
      ],
    };
  }

  // ── Follow-ups about the conversation ──
  const hasThread = ctx.proposals.length > 0;
  const change = text.match(
    /^(?:actually|no|sorry|oh|wait|hmm|ok|okay)?[,\s]*(?:make|change|move|switch|set|do|put)\s+(?:that|it|this)\s+(?:to|for|on|into|at)?\s*(.+)$/i,
  );
  if (change && hasThread && !/\b(list|tasks?)\b/i.test(change[1])) {
    const w = extractWhen(change[1].toLowerCase(), ctx.now);
    if (w.date || w.time)
      return {
        reply: '',
        actions: [
          {
            type: 'update_item',
            target: 'last',
            date: w.date ?? null,
            time: w.time ?? null,
            endTime: w.endTime ?? null,
            assumptions: w.assumptions,
          },
        ],
      };
  }
  const onList = text.match(
    /^(?:put|add|move|give)\s+(?:it|that|this)\s+(?:on|to|onto|for)\s+(her|his|their|[A-Za-z]+(?:'s|’s)?|my\s+[a-z]+(?:'s|’s)?)\s*(?:list|tasks?|to-?do(?: list)?)?$/i,
  );
  if (onList && hasThread) {
    const who = onList[1].replace(/(?:'s|’s)$/, '');
    const person = /^(her|his|their)$/i.test(who) ? { pronoun: true } : personFrom(who, ctx);
    if (person) return { reply: '', actions: [{ type: 'update_item', target: 'last', person }] };
  }
  const reassign =
    text.match(
      /^(?:give|assign|hand|pass)\s+([A-Za-z]+|my\s+[a-z]+)\s+(?:the|that|this)\s+(.+?)(?:\s+(?:task|job|one))?(?:\s+instead)?$/i,
    ) ??
    text.match(
      /^(?:give|assign|hand|pass|move)\s+(?:the|that|this)\s+(.+?)(?:\s+(?:task|job))?\s+to\s+([A-Za-z]+|my\s+[a-z]+)(?:\s+instead)?$/i,
    );
  if (reassign) {
    const first = /^(give|assign|hand|pass)\s+(?:[A-Za-z]+|my\s+[a-z]+)\s+(?:the|that|this)\s/i.test(text);
    const who = first ? reassign[1] : reassign[2];
    const what = first ? reassign[2] : reassign[1];
    const person = personFrom(who, ctx);
    const target = findTarget(what, ctx);
    if (person && target) return { reply: '', actions: [{ type: 'update_item', target, person }] };
    if (person) return none(`Which task should go to ${capitalise(who)}? I couldn’t find “${what}”.`);
  }
  const move = text.match(/^(?:move|reschedule|push|shift|change)\s+(?:my|the|our|her|his|their)\s+(.+?)\s+(?:to|until|till|for)\s+(.+)$/i);
  if (move) {
    const w = extractWhen(move[2].toLowerCase(), ctx.now);
    const target = findTarget(move[1], ctx);
    if (!target) return none(`I couldn’t find your ${move[1]}. Which one do you mean?`);
    if (w.date || w.time)
      return {
        reply: '',
        actions: [{ type: 'update_item', target, date: w.date ?? null, time: w.time ?? null, assumptions: w.assumptions }],
      };
  }
  text = text.replace(/^(?:also|and)\s+/i, '');

  // ── Who is it for? ──
  text = text.replace(/^([A-Za-z]+)['’]s got\b/, '$1 has got').replace(/^(we|they|i)(?:['’]ve| have) got\b/i, '$1 have got');
  const kids = text.match(/^(?:the\s+|our\s+)?(kids|children|boys|girls)\s+(?:have got|have|['’]ve got)\s+(.+)$/i);
  if (kids) text = `we have got ${kids[2]}`;
  const weNeed = text.match(/^(?:we|i)\s+(?:need|are out of|['’]re out of|have run out of|['’]ve run out of|ran out of)\s+(?!to\b)(.+)$/i);
  if (weNeed) return { reply: '', actions: [{ type: 'add_shopping_items', items: items(weNeed[1]) }] };

  /** Try 1–3 leading words as the subject, followed by a cue like "needs to". */
  const subjectThen = (input: string, cue: RegExp): { person: PersonMention; rest: string } | null => {
    const words = input.split(' ');
    for (let n = 1; n <= Math.min(3, words.length - 1); n++) {
      const after = words.slice(n).join(' ');
      const m = after.match(cue);
      const person = m ? personFrom(words.slice(0, n).join(' '), ctx) : null;
      if (m && person) return { person, rest: after.slice(m[0].length) };
    }
    return null;
  };
  const NEEDS_RE =
    /^(?:needs? to|has to|have to|has got to|must|should|is going to|are going to|is to|is supposed to|will|wants? to|ought to)\s+/i;
  const HAS_RE = /^(?:has got|have got|has|have)\s+(?:a|an|the|her|his|their|our|my)?\s*/i;

  let person: PersonMention | null = null;
  let rest = text;
  let subjectHas = false;
  let asReminder = false;
  const lead = text.match(/^(remind|ask|tell|get|have)\s+(.+)$/i);
  const fromLead = lead
    ? (subjectThen(lead[2], /^(?:to|about|that)\s+/i) ??
      (/^(ask|tell|get|have)$/i.test(lead[1]) ? subjectThen(lead[2], /^(?=[a-z])/) : null))
    : null;
  const needs = !fromLead ? subjectThen(text, NEEDS_RE) : null;
  const has = !fromLead && !needs ? subjectThen(text, HAS_RE) : null;
  if (fromLead) {
    person = fromLead.person;
    rest = fromLead.rest.replace(/^(?:she|he|they)\s+(?:needs? to|has to|have to|must|should)\s+/i, '');
    asReminder = /^remind$/i.test(lead![1]);
  } else if (needs) {
    person = needs.person;
    rest = needs.rest;
  } else if (has) {
    person = has.person;
    rest = has.rest;
    subjectHas = true;
  }

  // ── One or more actions ──
  const actions: Action[] = [];
  let clarify: string | undefined;
  for (const part of splitClauses(rest)) {
    // Only the first clause inherits "Remind X to…"; later ones say what they are.
    const r = clause(part, person, ctx, { subjectHas, reminder: asReminder && part === splitClauses(rest)[0] });
    if (r.action) {
      // "Remind me to…" inside someone else's sentence is the user's own reminder.
      if (/^remind me\b/i.test(part)) r.action.person = { self: true };
      actions.push(r.action);
    }
    clarify = clarify ?? r.clarify;
  }
  if (!actions.length) return none(clarify ?? 'I didn’t quite catch that. Try saying what needs doing, who it’s for and when.');
  return { reply: '', actions, clarify: clarify ? { question: clarify, about: 'date' } : null };
}
