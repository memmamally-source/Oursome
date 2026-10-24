/**
 * On-device quick-capture parser.
 *
 * Turns a sentence like "School meeting on Friday at 4" into structured
 * *proposals* the user reviews before anything is saved. It is deliberately
 * rule-based and predictable: it never guesses a recipient, and when a date
 * or time had to be assumed it says so in `assumptions` so the review card
 * can highlight it. In Stage 4 the server-side AI returns the same
 * `ParseResult` shape, validated against a schema, so the UI is unchanged.
 */
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { getDaysInMonth } from 'date-fns/getDaysInMonth';
import { startOfWeek } from 'date-fns/startOfWeek';

import { guessCategory } from '@/features/shopping/logic';
import type { Member } from '@/features/types';
import { format, fromDateKey, timeFromMinutes, toDateKey, type DateKey, type TimeKey } from '@/lib/dates';

export type ProposalKind = 'task' | 'reminder' | 'event' | 'shopping';

export type Proposal = {
  id: string;
  kind: ProposalKind;
  title: string;
  date?: DateKey;
  time?: TimeKey;
  endTime?: TimeKey;
  allDay?: boolean;
  location?: string;
  categoryId?: string;
  /** Shopping proposals: individual items and the target list name, if given. */
  items?: string[];
  listName?: string;
  assigneeId?: string;
  /** Things the parser inferred that the user should double-check. */
  assumptions: string[];
};

export type ClarifyOption = { label: string; patch: Partial<Proposal> };

export type ParseResult =
  | { type: 'proposals'; proposals: Proposal[] }
  | { type: 'clarify'; question: string; options: ClarifyOption[]; pending: Proposal[] }
  | { type: 'query'; query: QueryKind }
  | { type: 'unsupported'; reason: string };

export type QueryKind = 'today' | 'tomorrow' | 'week' | 'plan-today' | 'plan-tomorrow' | 'reschedule';

export type ParseContext = { now: Date; members: Member[]; listNames?: string[] };

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10 };

const WEEKDAY_RE = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)';
const MONTH_RE =
  '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';

const EVENT_WORDS = [
  'appointment',
  'appt',
  'meeting',
  'dentist',
  'doctor',
  'dr',
  'gp',
  'vet',
  'party',
  'dinner',
  'lunch',
  'breakfast',
  'brunch',
  'class',
  'lesson',
  'practice',
  'training',
  'game',
  'match',
  'recital',
  'concert',
  'show',
  'flight',
  'trip',
  'holiday',
  'vacation',
  'wedding',
  'birthday',
  'anniversary',
  'interview',
  'coffee',
  'drinks',
  'date night',
  'check-up',
  'checkup',
  'haircut',
  'physio',
  'therapy',
  'playdate',
  'sports day',
  'assembly',
  'conference',
  'festival',
  'visit',
  'call with',
  'session',
  'rehearsal',
  'event',
];

const TASK_VERBS = [
  'pay',
  'fetch',
  'drop',
  'pick',
  'grab',
  'walk',
  'cook',
  'drive',
  'visit',
  'phone',
  'ring',
  'remember',
  'plan',
  'collect',
  'buy',
  'call',
  'email',
  'text',
  'book',
  'renew',
  'return',
  'pick up',
  'clean',
  'fix',
  'send',
  'order',
  'submit',
  'sign',
  'finish',
  'write',
  'prepare',
  'pack',
  'cancel',
  'check',
  'take',
  'bring',
  'collect',
  'file',
  'wash',
  'mow',
  'tidy',
  'get',
  'make',
  'post',
  'reply',
  'update',
  'organise',
  'organize',
  'sort',
  'water',
  'feed',
];

const CATEGORY_WORDS: [string, string[]][] = [
  ['finance', ['pay', 'bill', 'bank', 'tax', 'rent', 'mortgage', 'insurance', 'invoice', 'budget', 'licence', 'license']],
  [
    'health',
    [
      'doctor',
      'dentist',
      'pharmacy',
      'prescription',
      'vitamin',
      'gym',
      'medication',
      'medicine',
      'physio',
      'flu shot',
      'check-up',
      'checkup',
      'workout',
      'run',
    ],
  ],
  ['shopping', ['buy', 'pick up', 'order', 'groceries', 'shop']],
  ['home', ['clean', 'fix', 'plumber', 'bins', 'bin', 'laundry', 'garden', 'plants', 'vacuum', 'dishes', 'tidy', 'mow', 'car']],
  ['family', ['school', 'kids', 'children', 'child', 'park', 'mum', 'mom', 'dad', 'grandma', 'grandpa', 'birthday', 'family', 'teacher', 'permission slip', 'swimming', 'playdate', 'nursery', 'daycare']],
  ['work', ['email', 'report', 'client', 'deadline', 'presentation', 'work', 'office']],
];

let seq = 0;
const pid = () => `p_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const has = (text: string, word: string) => new RegExp(`(^|[^a-z])${word.replace(/[-]/g, '\\-')}([^a-z]|$)`).test(text);

export function guessTaskCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, words] of CATEGORY_WORDS) if (words.some((w) => has(lower, w))) return cat;
  return 'personal';
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Extracted = { date?: DateKey; deadline?: boolean; partOfDay?: TimeKey; assumptions: string[] };

/** Find and remove a date expression. Mutates `state.text`. */
function extractDate(state: { text: string }, now: Date, out: Extracted): ParseResult | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => format(d, 'EEE d MMM');
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => Date | null | 'clarify'): boolean | 'clarify' => {
    const m = state.text.match(re);
    if (!m) return false;
    const prefix = (m[1] ?? '').trim();
    const d = fn(m);
    if (d === 'clarify') return 'clarify';
    if (!d) return false;
    let date = d;
    if (prefix === 'before') {
      date = addDays(d, -1);
      out.assumptions.push(`Due the day before (${fmt(date)})`);
    }
    if (prefix === 'before' || prefix === 'by' || prefix === 'due' || prefix === 'due by') out.deadline = true;
    out.date = toDateKey(date);
    state.text = (state.text.slice(0, m.index) + ' ' + state.text.slice(m.index! + m[0].length)).trim();
    return true;
  };
  const P = '(?:^|\\s)((?:on|by|before|due by|due|for|this|from)\\s+)?';

  // Numeric dates are ambiguous between US (MM/DD) and UK (DD/MM) — ask.
  const numeric = state.text.match(new RegExp(`${P}(?:the\\s+)?(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{2,4}))?(?=\\s|$)`));
  if (numeric) {
    const a = Number(numeric[2]);
    const b = Number(numeric[3]);
    const year = numeric[4] ? Number(numeric[4].length === 2 ? `20${numeric[4]}` : numeric[4]) : undefined;
    const build = (month: number, day: number) => {
      if (month < 1 || month > 12 || day < 1) return null;
      let d = new Date(year ?? today.getFullYear(), month - 1, day);
      if (day > getDaysInMonth(d)) return null;
      if (!year && d < today) d = new Date(today.getFullYear() + 1, month - 1, day);
      return d;
    };
    const us = build(a, b);
    const uk = build(b, a);
    state.text = (state.text.slice(0, numeric.index) + ' ' + state.text.slice(numeric.index! + numeric[0].length)).trim();
    if (us && uk && toDateKey(us) !== toDateKey(uk)) {
      return {
        type: 'clarify',
        question: `Did you mean ${format(us, 'EEEE d MMMM')} or ${format(uk, 'EEEE d MMMM')}?`,
        options: [
          { label: format(us, 'MMMM d'), patch: { date: toDateKey(us) } },
          { label: format(uk, 'd MMMM'), patch: { date: toDateKey(uk) } },
        ],
        pending: [],
      };
    }
    const d = us ?? uk;
    if (d) out.date = toDateKey(d);
    return null;
  }

  const rules: [RegExp, (m: RegExpMatchArray) => Date | null][] = [
    [new RegExp(`${P}(?:the\\s+)?day after tomorrow\\b`), () => addDays(today, 2)],
    [
      new RegExp(`${P}tomorrow(?:\\s+(morning|afternoon|evening|night))?\\b`),
      (m) => {
        if (m[2]) out.partOfDay = partOfDay(m[2]);
        return addDays(today, 1);
      },
    ],
    [
      new RegExp(`${P}tonight\\b`),
      () => {
        out.partOfDay = '19:00';
        return today;
      },
    ],
    [
      new RegExp(`${P}today(?:\\s+(morning|afternoon|evening))?\\b|${P}this\\s+(morning|afternoon|evening)\\b`),
      (m) => {
        const part = m[2] ?? m[4];
        if (part) out.partOfDay = partOfDay(part);
        return today;
      },
    ],
    [
      new RegExp(`${P}next\\s+${WEEKDAY_RE}\\b`),
      (m) => {
        const dow = WEEKDAYS[m[2]];
        const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        const d = addDays(nextWeekStart, (dow + 6) % 7);
        out.assumptions.push(`“Next ${capitalise(m[2])}” taken as ${fmt(d)}`);
        return d;
      },
    ],
    [
      new RegExp(`${P}${WEEKDAY_RE}(?:\\s+(morning|afternoon|evening|night))?\\b`),
      (m) => {
        const dow = WEEKDAYS[m[2]];
        if (m[3]) out.partOfDay = partOfDay(m[3]);
        let diff = (dow - today.getDay() + 7) % 7;
        if (diff === 0) {
          diff = m[1]?.trim() === 'this' ? 0 : 7;
          if (diff === 7) out.assumptions.push(`Today is ${capitalise(m[2])} — taken as next week (${fmt(addDays(today, 7))})`);
        }
        return addDays(today, diff);
      },
    ],
    [new RegExp(`${P}(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+${MONTH_RE}\\b`), (m) => monthDay(MONTHS[m[3]], Number(m[2]))],
    [new RegExp(`${P}${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`), (m) => monthDay(MONTHS[m[2]], Number(m[3]))],
    [
      new RegExp(`${P}the\\s+(\\d{1,2})(?:st|nd|rd|th)\\b`),
      (m) => {
        const day = Number(m[2]);
        if (day < 1 || day > 31) return null;
        let d = new Date(today.getFullYear(), today.getMonth(), Math.min(day, getDaysInMonth(today)));
        if (d < today) {
          const next = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1);
          d = new Date(next.getFullYear(), next.getMonth(), Math.min(day, getDaysInMonth(next)));
        }
        return d;
      },
    ],
    [
      new RegExp(`${P}in\\s+(\\d+|a|an|one|two|three|four|five|six|seven|ten)\\s+(days?|weeks?|months?)\\b`),
      (m) => {
        const n = NUMBER_WORDS[m[2]] ?? Number(m[2]);
        if (m[3].startsWith('day')) return addDays(today, n);
        if (m[3].startsWith('week')) return addDays(today, n * 7);
        return addMonths(today, n);
      },
    ],
    [
      new RegExp(`${P}next\\s+week\\b`),
      () => {
        const d = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        out.assumptions.push(`No day given — set to ${fmt(d)}`);
        return d;
      },
    ],
    [
      new RegExp(`${P}(?:this\\s+)?weekend\\b`),
      () => {
        const d = addDays(today, (6 - today.getDay() + 7) % 7);
        out.assumptions.push(`Weekend taken as ${fmt(d)}`);
        return d;
      },
    ],
    [
      new RegExp(`${P}next\\s+month\\b`),
      () => {
        const d = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1);
        out.assumptions.push(`No exact day given — set to ${fmt(d)}`);
        return d;
      },
    ],
  ];

  function monthDay(month: number, day: number): Date | null {
    const d = new Date(today.getFullYear(), month, 1);
    if (day < 1 || day > getDaysInMonth(d)) return null;
    const candidate = new Date(today.getFullYear(), month, day);
    return candidate < today ? new Date(today.getFullYear() + 1, month, day) : candidate;
  }

  for (const [re, fn] of rules) {
    if (take(re, fn) === true) break;
  }
  return null;
}

function partOfDay(word: string): TimeKey {
  if (word === 'morning') return '09:00';
  if (word === 'afternoon') return '14:00';
  return '19:00';
}

type TimeExtract = { time?: TimeKey; endTime?: TimeKey; assumptions: string[] };

function to24(hour: number, minute: number, meridiem?: string): number {
  let h = hour % 12;
  if (meridiem?.startsWith('p')) h += 12;
  if (!meridiem) h = hour;
  return h * 60 + minute;
}

function extractTime(state: { text: string }, out: TimeExtract) {
  const strip = (m: RegExpMatchArray) => {
    state.text = (state.text.slice(0, m.index) + ' ' + state.text.slice(m.index! + m[0].length)).trim();
  };
  const MER = '(am|pm|a\\.m\\.|p\\.m\\.)';

  const range = state.text.match(
    new RegExp(
      `(?:^|\\s)(?:from\\s+|at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*${MER}?\\s*(?:-|–|to|until|till)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${MER}(?=\\s|$|[,.!])`,
    ),
  );
  if (range) {
    const endMer = range[6];
    const startMer = range[3] ?? endMer;
    let start = to24(Number(range[1]), Number(range[2] ?? 0), startMer);
    const end = to24(Number(range[4]), Number(range[5] ?? 0), endMer);
    if (!range[3] && start > end) start -= 12 * 60; // "11-1pm" → 11 AM
    out.time = timeFromMinutes(start);
    out.endTime = timeFromMinutes(end);
    strip(range);
    return;
  }

  const special = state.text.match(/(?:^|\s)(?:at\s+)?(noon|midday|midnight)\b/);
  if (special) {
    out.time = special[1] === 'midnight' ? '00:00' : '12:00';
    strip(special);
    return;
  }

  const withMer = state.text.match(new RegExp(`(?:^|\\s)(?:at\\s+|@\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*${MER}(?=\\s|$|[,.!])`));
  if (withMer) {
    const h = Number(withMer[1]);
    if (h >= 1 && h <= 12) {
      out.time = timeFromMinutes(to24(h, Number(withMer[2] ?? 0), withMer[3]));
      strip(withMer);
      return;
    }
  }

  const clock = state.text.match(/(?:^|\s)(?:at\s+|@\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)(?=\s|$|[,.!])/);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    if (h >= 13 || h === 0) out.time = timeFromMinutes(h * 60 + m);
    else out.time = assumeMeridiem(h, m, out);
    strip(clock);
    return;
  }

  const bare = state.text.match(/(?:^|\s)(?:at|@)\s*(\d{1,2})(?=\s|$|[,.!])/);
  if (bare) {
    const h = Number(bare[1]);
    if (h <= 23) {
      out.time = h >= 13 || h === 0 ? timeFromMinutes(h * 60) : assumeMeridiem(h, 0, out);
      strip(bare);
    }
  }
}

/** "at 4" → 4 PM, "at 9" → 9 AM, flagged for review. */
function assumeMeridiem(h: number, m: number, out: TimeExtract): TimeKey {
  const pm = h === 12 || h <= 6;
  const time = timeFromMinutes(((h % 12) + (pm ? 12 : 0)) * 60 + m);
  const label = `${h}${m ? `:${String(m).padStart(2, '0')}` : ''} ${pm ? 'PM' : 'AM'}`;
  out.assumptions.push(`Time taken as ${label}`);
  return time;
}

function extractDuration(state: { text: string }): number | undefined {
  const m = state.text.match(/(?:^|\s)for\s+(an?|one|two|three|\d+(?:\.\d+)?|half an)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
  if (!m) return undefined;
  state.text = (state.text.slice(0, m.index) + ' ' + state.text.slice(m.index! + m[0].length)).trim();
  if (m[1] === 'half an') return 30;
  const n = NUMBER_WORDS[m[1]] ?? Number(m[1]);
  return m[2].startsWith('h') ? n * 60 : n;
}

const LEAD_PHRASES = [
  /^(?:hey|hi|ok|okay)[,\s]+/,
  /^(?:please|pls)\s+/,
  /^(?:can|could|would) you\s+(?:please\s+)?/,
  /^(?:i need to|i have to|i've got to|i must|need to|gotta|we need to)\s+/,
  /^(?:remind me to|remind me about|remind me|remember to|don'?t forget to|don'?t forget)\s+/,
  /^(?:add|create|schedule|put|set up|make|new)\s+(?:a|an|the|my)?\s*(?:new\s+)?(?:reminder|task|event|appointment\s+(?=for|to))?\s*(?:to|for)?\s*/,
  /^(?:a|an)\s+/,
];

function cleanTitle(raw: string): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  for (const re of LEAD_PHRASES) t = t.replace(re, '');
  t = t
    .replace(/\s+(?:to|in|on|into)\s+(?:my|the|our)\s+(?:calendar|diary|schedule|list|to-?do list|tasks?)\b/g, '')
    .replace(/\s+(?:on|at|by|for|before|from|in|due|this)\s*$/g, '')
    .replace(/\s+(?:on|at|by|for|before|from|in|due|this)\s*$/g, '')
    .replace(/[\s,.!?;:]+$/g, '')
    .replace(/^[\s,.;:-]+/, '');
  return capitalise(t);
}

/** Restore the user's original capitalisation ("sports day" → "Sports Day"). */
function restoreCase(title: string, original: string): string {
  const forms = new Map<string, string>();
  for (const token of original.split(/[\s,.!?;:]+/)) {
    const key = token.toLowerCase();
    if (token !== key && !forms.has(key)) forms.set(key, token);
  }
  return title
    .split(' ')
    .map((w, i) => {
      const form = forms.get(w.toLowerCase());
      // Keep the user's capitalisation for names; ignore a capital that came only from sentence start.
      if (form && !(i > 0 && original.startsWith(form) && form.slice(1) === form.slice(1).toLowerCase() && !/^[A-Z]{2,}/.test(form))) {
        return form;
      }
      return i === 0 ? capitalise(w) : w;
    })
    .join(' ');
}

function splitItems(text: string): string[] {
  return text
    .split(/,|\band\b|&|\+/)
    .map((s) => s.trim().replace(/^(?:some|a|an|the|more)\s+/, ''))
    .filter(Boolean)
    .map(capitalise);
}

function detectQuery(lower: string): QueryKind | null {
  if (/\b(move|reschedule|push|shift)\b.*\b(tasks?|things|everything|flexible)\b/.test(lower)) return 'reschedule';
  if (/\b(organi[sz]e|plan|prioriti[sz]e|sort out)\b.*\b(tomorrow)\b/.test(lower)) return 'plan-tomorrow';
  if (/\b(organi[sz]e|plan|prioriti[sz]e|sort out)\b.*\b(today|my day|tasks)\b/.test(lower)) return 'plan-today';
  if (/^(what'?s|what is|what do i have|show( me)?|summari[sz]e|how('?s| is| does)|anything|do i have)\b/.test(lower)) {
    if (/\b(week|weekend|upcoming|coming up)\b/.test(lower)) return 'week';
    if (/\btomorrow\b/.test(lower)) return 'tomorrow';
    return 'today';
  }
  return null;
}

/** Parse a natural-language capture into reviewable proposals. */
export function parseCapture(input: string, ctx: ParseContext): ParseResult {
  const original = input.trim().replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (!original) return { type: 'unsupported', reason: 'empty' };
  const lower = original.toLowerCase().replace(/[!?]+$/g, '');

  const query = detectQuery(lower);
  if (query) return { type: 'query', query };

  if (/\b(recipe|meal plan|grocery list for|shopping list for|ideas for)\b/.test(lower)) {
    return { type: 'unsupported', reason: 'generative' };
  }

  // ── Recipient ────────────────────────────────────────────────────────
  let assigneeId: string | undefined;
  let needsAssignee = false;
  let body = lower;
  const remindOther = body.match(/^(?:please\s+)?remind\s+(?!me\b)(my\s+\w+|\w+)\s+(?:to|about)\s+/);
  if (remindOther) {
    const who = remindOther[1];
    const others = ctx.members.filter((m) => !m.isMe);
    const byName = others.find((m) => m.name.toLowerCase() === who.replace(/^my\s+/, ''));
    if (byName) assigneeId = byName.id;
    else needsAssignee = true;
    body = 'remind me to ' + body.slice(remindOther[0].length);
  }

  const isReminder = /^(?:please\s+)?(?:remind me|set a reminder|reminder)\b/.test(body);

  // ── Shopping ─────────────────────────────────────────────────────────
  const addTo = body.match(/^(?:please\s+)?(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the|my|our)\s+(.+?)(?:\s+list)?$/);
  if (addTo && !/calendar|diary|schedule|to-?do|tasks?/.test(addTo[2])) {
    const listName = addTo[2].replace(/\s+list$/, '');
    const listLike =
      /shop|grocer|store|market|hardware|pharmacy|list/.test(addTo[2]) || (ctx.listNames ?? []).some((n) => n.toLowerCase() === listName);
    if (listLike) {
      return {
        type: 'proposals',
        proposals: [
          {
            id: pid(),
            kind: 'shopping',
            title: `Add to ${capitalise(listName)}`,
            items: splitItems(addTo[1]),
            listName: /^(shopping|grocery|groceries)$/.test(listName) ? undefined : capitalise(listName),
            assumptions: [],
          },
        ],
      };
    }
  }

  // ── Dates & times ────────────────────────────────────────────────────
  const state = { text: body };
  const extracted: Extracted = { assumptions: [] };
  const clarifyDate = extractDate(state, ctx.now, extracted);
  const timeOut: TimeExtract = { assumptions: [] };
  extractTime(state, timeOut);
  const duration = extractDuration(state);

  // Location: "… at Bright Smiles" — only capitalised names from the original text.
  let location: string | undefined;
  const locMatch = original.match(/\s(?:at|@)\s+((?:the\s+)?[A-Z][\w'&.-]*(?:\s+(?:&\s+)?[A-Z][\w'&.-]*)*)/);
  if (locMatch) {
    const loc = locMatch[1];
    const locLower = loc.toLowerCase();
    if (!/^(noon|midday|midnight|\d)/i.test(loc) && !Object.keys(WEEKDAYS).includes(locLower.split(' ')[0])) {
      location = loc;
      state.text = state.text.replace(new RegExp(`\\s(?:at|@)\\s+${locLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), ' ');
    }
  }

  const rest = state.text;
  const date = extracted.date;
  const time = timeOut.time ?? extracted.partOfDay;
  const assumptions = [...extracted.assumptions, ...timeOut.assumptions];
  if (!timeOut.time && extracted.partOfDay) {
    assumptions.push(`Time taken as ${extracted.partOfDay === '09:00' ? '9 AM' : extracted.partOfDay === '14:00' ? '2 PM' : '7 PM'}`);
  }

  const cleaned = cleanTitle(rest);
  if (!cleaned) return { type: 'unsupported', reason: 'no-title' };
  const title = restoreCase(cleaned, original);
  const titleLower = cleaned.toLowerCase();

  const hasEventWord = EVENT_WORDS.some((w) => has(titleLower, w));
  const startsWithEventPhrase = EVENT_WORDS.some((w) => w.includes(' ') && titleLower.startsWith(w));
  const startsWithVerb = !startsWithEventPhrase && TASK_VERBS.some((v) => titleLower.startsWith(v + ' ') || titleLower === v);

  let kind: ProposalKind = 'task';
  if (isReminder) kind = 'reminder';
  else if (!extracted.deadline && ((timeOut.time && !startsWithVerb) || (hasEventWord && !startsWithVerb && (date || time))))
    kind = 'event';

  const proposal: Proposal = {
    id: pid(),
    kind,
    title,
    date,
    time,
    assumptions,
    assigneeId,
    categoryId: guessTaskCategory(titleLower),
  };

  if (kind === 'event') {
    proposal.location = location;
    if (!proposal.date) {
      const nowMin = ctx.now.getHours() * 60 + ctx.now.getMinutes();
      const [h, m] = (time ?? '23:59').split(':').map(Number);
      const d = h * 60 + m > nowMin ? ctx.now : addDays(ctx.now, 1);
      proposal.date = toDateKey(d);
      assumptions.push(`No date given — set to ${toDateKey(d) === toDateKey(ctx.now) ? 'today' : 'tomorrow'}`);
    }
    if (!time) {
      proposal.allDay = true;
    } else {
      const [h, m] = time.split(':').map(Number);
      const start = h * 60 + m;
      proposal.endTime = timeOut.endTime ?? timeFromMinutes(Math.min(start + (duration ?? 60), 23 * 60 + 59));
    }
  } else if (location) {
    proposal.title = `${title} at ${location}`;
  }

  if (kind === 'reminder' && date && !time) {
    proposal.time = '09:00';
    assumptions.push('Reminder set for 9 AM');
  }

  const proposals: Proposal[] = [proposal];

  // "buy milk tomorrow" → also offer to add the items to a shopping list.
  const buy = titleLower.match(/^(?:buy|get|pick up|grab)\s+(.+)$/);
  if (buy && kind !== 'event') {
    const items = splitItems(buy[1]);
    if (items.length && items.some((i) => guessCategory(i) !== 'other')) {
      proposals.push({ id: pid(), kind: 'shopping', title: 'Add to shopping list', items, assumptions: [] });
      if (!date && !time && kind === 'task') proposals.shift(); // no date → the list is enough
    }
  }

  if (clarifyDate?.type === 'clarify') return { ...clarifyDate, pending: proposals };

  if (needsAssignee) {
    const others = ctx.members.filter((m) => !m.isMe);
    if (!others.length) {
      return {
        type: 'clarify',
        question: 'Reminding someone else needs an Our Space with them in it. Shall I make this your own reminder for now?',
        options: [{ label: 'Remind me instead', patch: {} }],
        pending: proposals,
      };
    }
    return {
      type: 'clarify',
      question: 'Who should I remind?',
      options: others.map((m) => ({ label: m.name, patch: { assigneeId: m.id } })),
      pending: proposals,
    };
  }

  const followUp = nextClarification(proposals, ctx.now);
  if (followUp) return followUp;

  return { type: 'proposals', proposals };
}

/** A further question the pending proposals still need answered, if any. */
export function nextClarification(pending: Proposal[], now: Date): ParseResult | null {
  const reminder = pending.find((p) => p.kind === 'reminder' && !p.date && !p.time);
  if (!reminder) return null;
  const tomorrow = toDateKey(addDays(now, 1));
  const today = toDateKey(now);
  const options: ClarifyOption[] = [];
  if (now.getHours() < 18) options.push({ label: 'This evening', patch: { date: today, time: '18:00' } });
  options.push({ label: 'Tomorrow morning', patch: { date: tomorrow, time: '09:00' } });
  options.push({ label: 'No time — just a task', patch: { kind: 'task' } });
  const who = reminder.assigneeId ? 'them' : 'you';
  return { type: 'clarify', question: `When should I remind ${who}?`, options, pending };
}

/** Apply a clarification choice to pending proposals. */
export function applyClarification(pending: Proposal[], option: ClarifyOption): Proposal[] {
  return pending.map((p) => (p.kind === 'shopping' ? p : { ...p, ...option.patch }));
}

export function describeWhen(p: Proposal, now = new Date()): string | null {
  if (!p.date && !p.time) return null;
  const parts: string[] = [];
  if (p.date) {
    const d = fromDateKey(p.date);
    const diff = Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
    parts.push(diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : format(d, diff > 0 && diff < 7 ? 'EEEE' : 'EEE d MMM'));
  }
  if (p.allDay) parts.push('all day');
  else if (p.time) {
    const fmtT = (t: string) =>
      format(new Date(2000, 0, 1, Number(t.slice(0, 2)), Number(t.slice(3))), t.endsWith(':00') ? 'h a' : 'h:mm a');
    parts.push(p.endTime ? `${fmtT(p.time)} – ${fmtT(p.endTime)}` : fmtT(p.time));
  }
  return parts.join(' · ');
}

// ── Reusable pieces for the people-aware interpreter (./basic.ts) ────────

export type When = {
  /** Text with the date/time phrases removed. */
  rest: string;
  date?: DateKey;
  time?: TimeKey;
  endTime?: TimeKey;
  /** Inferred values the user should double-check. */
  assumptions: string[];
  /** A numeric date that reads differently in US and UK order. */
  ambiguous?: { question: string; options: { label: string; date: DateKey }[] };
};

/** Extract a date, time, range and duration from (lower-case) text. */
export function extractWhen(text: string, now: Date): When {
  const state = { text };
  const d: Extracted = { assumptions: [] };
  const clarify = extractDate(state, now, d);
  const t: TimeExtract = { assumptions: [] };
  extractTime(state, t);
  const duration = extractDuration(state);
  const time = t.time ?? d.partOfDay;
  const assumptions = [...d.assumptions, ...t.assumptions];
  if (!t.time && d.partOfDay) {
    assumptions.push(`Time taken as ${d.partOfDay === '09:00' ? '9 AM' : d.partOfDay === '14:00' ? '2 PM' : '7 PM'}`);
  }
  let endTime = t.endTime;
  if (!endTime && time && duration) {
    const [h, m] = time.split(':').map(Number);
    endTime = timeFromMinutes(Math.min(h * 60 + m + duration, 23 * 60 + 59));
  }
  const ambiguous =
    clarify?.type === 'clarify'
      ? { question: clarify.question, options: clarify.options.map((o) => ({ label: o.label, date: o.patch.date! })) }
      : undefined;
  return { rest: state.text.replace(/\s+/g, ' ').trim(), date: d.date, time, endTime, assumptions, ambiguous };
}

/** Whether a title reads like a calendar event ("dentist appointment", "swimming"). */
export function looksLikeEvent(title: string): boolean {
  const lower = title.toLowerCase();
  return EVENT_WORDS.some((w) => has(lower, w)) || /\b(swimming|football|soccer|ballet|piano|gym|yoga)\b/.test(lower);
}

/** Whether a title starts with an everyday task verb ("pay", "buy", "collect"). */
export function startsWithTaskVerb(title: string): boolean {
  const lower = title.toLowerCase();
  return TASK_VERBS.some((v) => lower.startsWith(v + ' ') || lower === v);
}

export { capitalise, cleanTitle, restoreCase, splitItems };
