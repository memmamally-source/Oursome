/**
 * The interpretation contract.
 *
 * Both the server-side AI (Claude, via structured outputs) and the on-device
 * basic interpreter produce an `Interpretation`: what the user wants, in
 * their own words — names, relationships, dates — but never database IDs.
 * The resolver (./resolve.ts) maps names to people, checks targets against
 * the user's own data and turns it into proposals the user approves.
 * Nothing here writes to the database.
 */

/** Who an action is for, as the user said it. */
export type PersonMention = {
  /** A name: "Rufaida", "Sarah". */
  name?: string | null;
  /** A relationship word: "wife", "dad", "mum". */
  relation?: string | null;
  /** "I", "me", "my". */
  self?: boolean | null;
  /** "her", "him", "them" — refers to someone from earlier in the conversation. */
  pronoun?: boolean | null;
  /** "we", "us", "the family", "everyone". */
  household?: boolean | null;
};

export const ACTION_TYPES = [
  'create_task',
  'create_reminder',
  'create_event',
  'add_shopping_items',
  'update_item',
  'add_person',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type Action = {
  type: ActionType;
  /** Short imperative title: "Take the kids to the park". */
  title?: string | null;
  /** Who is responsible (tasks, reminders) or whose event it is. */
  person?: PersonMention | null;
  /** YYYY-MM-DD, resolved against today's date. */
  date?: string | null;
  /** HH:MM, 24-hour. */
  time?: string | null;
  endTime?: string | null;
  allDay?: boolean | null;
  location?: string | null;
  category?: string | null;
  /** Shopping items for add_shopping_items. */
  items?: string[] | null;
  listName?: string | null;
  /**
   * update_item: the thing being changed — a ref from the context the
   * assistant was given ("t3" a task, "e2" an event, "p1" a proposal in this
   * conversation) or "last" for the most recent proposal.
   */
  target?: string | null;
  /** add_person: their relationship to the user, if stated. */
  relation?: string | null;
  /** Things inferred rather than stated, shown for review. */
  assumptions?: string[] | null;
};

export const QUERY_KINDS = ['agenda', 'tasks', 'overdue', 'responsibility', 'plan'] as const;
export type QueryKind = (typeof QUERY_KINDS)[number];

/** A question about existing data. Answered by ./query.ts from real data, never by the model. */
export type Query = {
  kind: QueryKind;
  person?: PersonMention | null;
  /** Inclusive date range (YYYY-MM-DD). */
  from?: string | null;
  to?: string | null;
  /** responsibility: what the question is about ("groceries", "picking up the kids"). */
  topic?: string | null;
};

export type Interpretation = {
  /** One short, friendly sentence. */
  reply: string;
  actions: Action[];
  query?: Query | null;
  /** Something essential is missing or ambiguous. */
  clarify?: { question: string; about: 'date' | 'time' | 'person' | 'what' | 'target' } | null;
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isoTime = /^([01]\d|2[0-3]):[0-5]\d$/;
const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

function person(v: unknown): PersonMention | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>;
  const out: PersonMention = {
    name: str(p.name, 60),
    relation: str(p.relation, 30)?.toLowerCase() ?? null,
    self: bool(p.self),
    pronoun: bool(p.pronoun),
    household: bool(p.household),
  };
  return out.name || out.relation || out.self || out.pronoun || out.household ? out : null;
}

/**
 * Defensive validation of an interpretation from any source. Unknown action
 * types, malformed dates and over-long text are dropped rather than trusted.
 */
export function sanitizeInterpretation(raw: unknown): Interpretation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const actions: Action[] = [];
  for (const a of Array.isArray(r.actions) ? r.actions.slice(0, 8) : []) {
    if (!a || typeof a !== 'object') continue;
    const x = a as Record<string, unknown>;
    if (!ACTION_TYPES.includes(x.type as ActionType)) continue;
    const date = str(x.date, 10);
    const time = str(x.time, 5);
    const endTime = str(x.endTime, 5);
    actions.push({
      type: x.type as ActionType,
      title: str(x.title, 140),
      person: person(x.person),
      date: date && isoDate.test(date) ? date : null,
      time: time && isoTime.test(time) ? time : null,
      endTime: endTime && isoTime.test(endTime) ? endTime : null,
      allDay: bool(x.allDay),
      location: str(x.location, 100),
      category: str(x.category, 30),
      items: Array.isArray(x.items) ? x.items.map((i) => str(i, 60)).filter((i): i is string => !!i).slice(0, 30) : null,
      listName: str(x.listName, 40),
      target: str(x.target, 20),
      relation: str(x.relation, 30)?.toLowerCase() ?? null,
      assumptions: Array.isArray(x.assumptions) ? x.assumptions.map((s) => str(s, 120)).filter((s): s is string => !!s).slice(0, 4) : null,
    });
  }
  let query: Query | null = null;
  if (r.query && typeof r.query === 'object') {
    const q = r.query as Record<string, unknown>;
    if (QUERY_KINDS.includes(q.kind as QueryKind)) {
      const from = str(q.from, 10);
      const to = str(q.to, 10);
      query = {
        kind: q.kind as QueryKind,
        person: person(q.person),
        from: from && isoDate.test(from) ? from : null,
        to: to && isoDate.test(to) ? to : null,
        topic: str(q.topic, 60),
      };
    }
  }
  let clarify: Interpretation['clarify'] = null;
  if (r.clarify && typeof r.clarify === 'object') {
    const c = r.clarify as Record<string, unknown>;
    const question = str(c.question, 200);
    const about = ['date', 'time', 'person', 'what', 'target'].includes(c.about as string) ? (c.about as 'date') : 'what';
    if (question) clarify = { question, about };
  }
  return { reply: str(r.reply, 300) ?? '', actions, query, clarify };
}
