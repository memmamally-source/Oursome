import { z } from 'zod';

/**
 * The structured output Claude must return. It mirrors `Interpretation` in
 * src/features/assistant/interpretation.ts (the app re-validates every field
 * with `sanitizeInterpretation`, so this server is never trusted blindly).
 * Every field is present; "not stated" is null.
 */
export const PersonMention = z.object({
  name: z.string().nullable().describe('A name exactly as the user said it, e.g. "Rufaida". Never invent one.'),
  relation: z.string().nullable().describe('A relationship word the user used, e.g. "wife", "dad". Lower case.'),
  self: z.boolean().nullable().describe('The user themself: I, me, my.'),
  pronoun: z.boolean().nullable().describe('her / him / them, referring to someone mentioned earlier.'),
  household: z.boolean().nullable().describe('we, us, the family, everyone, the kids as a group.'),
});

export const ActionSchema = z.object({
  type: z.enum(['create_task', 'create_reminder', 'create_event', 'add_shopping_items', 'update_item', 'add_person']),
  title: z.string().nullable().describe('Short title in sentence case, without the person or the date: "Take the kids to the park".'),
  person: PersonMention.nullable().describe('Who it is for or who is responsible. null when nobody was mentioned.'),
  date: z.string().nullable().describe('YYYY-MM-DD resolved from today. null when no day was stated.'),
  time: z.string().nullable().describe('HH:MM 24-hour. null when no time was stated.'),
  endTime: z.string().nullable(),
  allDay: z.boolean().nullable(),
  location: z.string().nullable(),
  category: z.enum(['personal', 'family', 'home', 'work', 'shopping', 'health', 'finance', 'other']).nullable(),
  items: z.array(z.string()).nullable().describe('add_shopping_items only: one entry per item.'),
  listName: z.string().nullable().describe('add_shopping_items only: a list name from context, if the user named one.'),
  target: z.string().nullable().describe('update_item only: a ref from context (t1, e2, p1) or "last". Never anything else.'),
  relation: z.string().nullable().describe('add_person only: the relationship the user stated.'),
  assumptions: z.array(z.string()).nullable().describe('Anything inferred rather than stated, in plain words.'),
});

export const QuerySchema = z.object({
  kind: z.enum(['agenda', 'tasks', 'overdue', 'responsibility', 'plan']),
  person: PersonMention.nullable(),
  from: z.string().nullable().describe('YYYY-MM-DD'),
  to: z.string().nullable().describe('YYYY-MM-DD'),
  topic: z.string().nullable().describe('responsibility only: what the question is about.'),
});

export const InterpretationSchema = z.object({
  reply: z.string().describe('One short friendly sentence. Never claim anything was saved.'),
  actions: z.array(ActionSchema),
  query: QuerySchema.nullable(),
  clarify: z
    .object({
      question: z.string(),
      about: z.enum(['date', 'time', 'person', 'what', 'target']),
    })
    .nullable(),
});

export type Interpretation = z.infer<typeof InterpretationSchema>;

/** What the app sends. Bounded so one request can't run up a large bill. */
export const RequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.record(z.string(), z.unknown()),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(2000) }))
    .max(6)
    .default([]),
});
export type InterpretRequest = z.infer<typeof RequestSchema>;

/** Maximum serialised context size accepted (characters). */
export const MAX_CONTEXT_CHARS = 24_000;
