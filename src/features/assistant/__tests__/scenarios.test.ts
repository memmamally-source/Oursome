/**
 * Realistic organiser conversations. Each scenario checks *understanding*
 * (who, what, when, which kind) and *behaviour* (asking instead of guessing,
 * never trusting unknown IDs, never writing without approval).
 *
 * Every scenario runs against the on-device Basic interpreter. When
 * AI_EVAL_ENDPOINT is set (see `npm run eval:ai`) the same scenarios also run
 * against the live AI service, so the model is held to identical checks.
 */
import { interpretBasic } from '../basic';
import { makeRefs, type AssistantContext } from '../context';
import { applyResult, emptyConversation, type ConversationState } from '../conversation';
import { processMessage, type EngineResult, type Interpreter } from '../engine';
import { blockingIssue, type Proposal } from '../proposals';
import { interpretRemote } from '../remote';
import { sanitizeInterpretation } from '../interpretation';
import { useTasks } from '@/features/tasks/store';
import type { CalendarEvent, Member, Task } from '@/features/types';

const NOW = new Date(2026, 9, 21, 10, 0); // Wednesday 21 October 2026, 10:00
const TODAY = '2026-10-21';

const me: Member = { id: 'me', name: 'Alex', color: 'coral', role: 'admin', isMe: true };
const rufaida: Member = { id: 'm_ruf', name: 'Rufaida', color: 'sky', role: 'member', kind: 'person' };
const sarah: Member = { id: 'm_sar', name: 'Sarah', color: 'mint', role: 'member', kind: 'person', relationship: 'daughter' };

type Setup = { people?: Member[]; tasks?: Task[]; events?: CalendarEvent[] };

const task = (p: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
  categoryId: 'family',
  priority: 'medium',
  subtasks: [],
  visibility: 'shared',
  order: 0,
  createdAt: '',
  ...p,
});
const event = (p: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'title' | 'start' | 'end'>): CalendarEvent => ({
  allDay: false,
  timeZone: 'UTC',
  calendarId: 'cal_personal',
  visibility: 'private',
  createdAt: '',
  ...p,
});

function makeCtx(setup: Setup, conv: ConversationState): AssistantContext {
  const tasks = setup.tasks ?? [];
  const events = setup.events ?? [];
  return {
    now: NOW,
    today: TODAY,
    timeZone: 'UTC',
    people: setup.people ?? [me, rufaida, sarah],
    tasks,
    events,
    calendars: [{ id: 'cal_personal', name: 'Me', color: 'coral', kind: 'personal', visible: true }],
    lists: [{ id: 'l1', name: 'Groceries', color: 'mint', icon: 'basket-outline', visibility: 'shared', createdAt: '' }],
    proposals: conv.proposals,
    lastPersonId: conv.lastPersonId,
    lastPersonName: conv.lastPersonName,
    refs: makeRefs(tasks, events, conv.proposals, TODAY),
  };
}

const basic: Interpreter = async (text, ctx) => interpretBasic(text, ctx);

async function chat(interpreter: Interpreter, setup: Setup, ...messages: string[]) {
  let conv = emptyConversation;
  let last!: EngineResult;
  let ctx!: AssistantContext;
  for (const m of messages) {
    ctx = makeCtx(setup, conv);
    last = await processMessage(m, ctx, [], interpreter);
    conv = applyResult(conv, last);
  }
  return { last, conv, ctx };
}

/** Mark every proposal so far as saved, as if the user tapped Add (without touching stores). */
function saveAll(conv: ConversationState): ConversationState {
  return { ...conv, proposals: conv.proposals.map((p) => ({ ...p, status: 'saved', savedRef: { kind: 'task', id: `saved_${p.id}` } })) };
}

const only = (r: EngineResult): Proposal => {
  expect(r.resolution.proposals).toHaveLength(1);
  return r.resolution.proposals[0];
};
const assignee = (p: Proposal) => p.update?.changes.assignee ?? p.assignee;

const engines: [string, Interpreter][] = [['basic', basic]];
if (process.env.AI_EVAL_ENDPOINT) engines.push(['ai', interpretRemote]);

describe.each(engines)('%s interpreter', (_name, interp) => {
  const run = (setup: Setup, ...m: string[]) => chat(interp, setup, ...m);

  describe('1. a named person needs to do something', () => {
    it.each([
      'Rufaida needs to take the kids to the park.',
      'Rufaida has to take the children to the park',
      'rufaida must take the kids to the park',
      'Ask Rufaida to take the kids to the park',
    ])('%s', async (text) => {
      const p = only((await run({}, text)).last);
      expect(p.kind).toBe('task');
      expect(p.title.toLowerCase()).toMatch(/take the (kids|children) to the park/);
      expect(assignee(p)).toMatchObject({ status: 'member', memberId: 'm_ruf' });
      expect(p.categoryId).toBe('family');
      expect(p.date).toBeUndefined();
      expect(p.time).toBeUndefined();
      expect(p.visibility).toBe('shared');
      expect(blockingIssue(p)).toBeNull();
    });

    it('recognises an unknown person and asks instead of inventing an ID', async () => {
      const p = only((await run({ people: [me] }, 'Rufaida needs to take the kids to the park.')).last);
      expect(assignee(p)).toEqual({ status: 'unknown', name: 'Rufaida' });
      expect(blockingIssue(p)).toMatch(/Rufaida isn’t in your household/);
      expect(JSON.stringify(p)).not.toMatch(/m_ruf/);
    });

    it('asks which one when a name matches two people', async () => {
      const people = [me, { ...rufaida, id: 's1', name: 'Sam Patel' }, { ...sarah, id: 's2', name: 'Sam Jones', relationship: undefined }];
      const p = only((await run({ people }, 'Sam needs to walk the dog tonight')).last);
      expect(assignee(p)).toMatchObject({ status: 'ambiguous' });
      expect(blockingIssue(p)).toMatch(/Which Sam/);
    });
  });

  it('2. remind a person with a date', async () => {
    const p = only((await run({}, 'Remind Rufaida to collect the children tomorrow.')).last);
    expect(p).toMatchObject({ kind: 'reminder', date: '2026-10-22' });
    expect(p.title.toLowerCase()).toBe('collect the children');
    expect(assignee(p)).toMatchObject({ status: 'member', name: 'Rufaida' });
  });

  it('2b. unseen phrasing with a time', async () => {
    const p = only((await run({}, 'remind rufaida to pick up the kids tomorrow at 3pm')).last);
    expect(p).toMatchObject({ kind: 'reminder', date: '2026-10-22', time: '15:00' });
  });

  describe('3. relationships are never assumed', () => {
    it('asks who “my wife” is when no one has that relationship', async () => {
      const p = only((await run({}, 'My wife must fetch the groceries.')).last);
      expect(p.title.toLowerCase()).toBe('fetch the groceries');
      expect(assignee(p)).toMatchObject({ status: 'relation_unset', relation: 'wife' });
      expect(blockingIssue(p)).toBe('Who is your wife?');
    });
    it('uses the relationship once it has been configured', async () => {
      const people = [me, { ...rufaida, relationship: 'wife' }, sarah];
      const p = only((await run({ people }, 'my wife needs to pick up the groceries')).last);
      expect(assignee(p)).toMatchObject({ status: 'member', memberId: 'm_ruf' });
    });
    it('does not treat “partner” as “wife”', async () => {
      const people = [me, { ...rufaida, relationship: 'wife' }];
      const p = only((await run({ people }, 'My partner needs to call the bank')).last);
      expect(assignee(p)).toMatchObject({ status: 'relation_unset', relation: 'partner' });
    });
    it('“Mum needs to buy milk” uses a configured mum', async () => {
      const people = [me, { ...rufaida, id: 'm_mum', name: 'Margaret', relationship: 'mum' }];
      const p = only((await run({ people }, 'Mum needs to buy milk')).last);
      expect(p.title.toLowerCase()).toBe('buy milk');
      expect(assignee(p)).toMatchObject({ status: 'member', memberId: 'm_mum' });
    });
  });

  it('4. someone else’s appointment is an event on their calendar', async () => {
    const p = only((await run({}, 'Sarah has a dentist appointment next Tuesday.')).last);
    expect(p).toMatchObject({ kind: 'event', date: '2026-10-27', allDay: true });
    expect(p.title.toLowerCase()).toBe('dentist appointment');
    expect(assignee(p)).toMatchObject({ status: 'member', name: 'Sarah' });
  });

  it('4b. unseen phrasing: “Sarah’s got a doctor’s appointment on Friday at 2pm”', async () => {
    const p = only((await run({}, 'Sarah’s got a doctor’s appointment on Friday at 2pm')).last);
    expect(p).toMatchObject({ kind: 'event', date: '2026-10-23', time: '14:00' });
    expect(assignee(p)).toMatchObject({ name: 'Sarah' });
  });

  it.each(['Buy milk, eggs and bread.', 'We need milk, eggs and bread'])('5. shopping: %s', async (text) => {
    const p = only((await run({}, text)).last);
    expect(p.kind).toBe('shopping');
    expect(p.items).toEqual(['Milk', 'Eggs', 'Bread']);
  });

  it('6. unknown person with a deadline', async () => {
    const p = only((await run({}, 'John needs to pay the electricity bill before Friday.')).last);
    expect(p).toMatchObject({ kind: 'task', date: '2026-10-22', categoryId: 'finance' });
    expect(p.title.toLowerCase()).toBe('pay the electricity bill');
    expect(assignee(p)).toEqual({ status: 'unknown', name: 'John' });
  });

  it('7. “we” means a shared household event', async () => {
    const p = only((await run({}, 'We’ve got swimming on Saturday morning.')).last);
    expect(p).toMatchObject({ kind: 'event', date: '2026-10-24', time: '09:00', visibility: 'shared' });
    expect(p.title.toLowerCase()).toBe('swimming');
    expect(assignee(p)).toMatchObject({ status: 'household' });
    expect(p.assumptions.join(' ')).toMatch(/9 AM/);
  });

  describe('8. moving an existing item proposes a change, never applies it', () => {
    const meeting = event({ id: 'ev_meet', title: 'Team meeting', start: '2026-10-26T10:00', end: '2026-10-26T11:00' });
    it('targets the real event and keeps the time', async () => {
      const { last } = await run({ events: [meeting] }, 'Move my meeting to next Thursday.');
      const p = only(last);
      expect(p.kind).toBe('update');
      expect(p.update).toMatchObject({ target: { kind: 'event', id: 'ev_meet' }, changes: { date: '2026-10-29' } });
      expect(p.status).toBe('pending');
    });
    it('asks when there is no such meeting', async () => {
      const { last } = await run({}, 'Move my meeting to next Thursday.');
      expect(last.resolution.proposals).toHaveLength(0);
      expect(last.resolution.clarify).toMatch(/meeting/i);
    });
  });

  describe('9. follow-ups refer to the previous proposal', () => {
    it('“Actually, make that Friday” revises the pending proposal', async () => {
      const { conv, last } = await run({}, 'Rufaida needs to take the kids to the park Saturday.', 'Actually, make that Friday.');
      expect(last.resolution.proposals).toHaveLength(0);
      expect(conv.proposals).toHaveLength(1);
      expect(conv.proposals[0]).toMatchObject({ date: '2026-10-23', title: expect.stringMatching(/park/) });
    });
    it('after saving, the same words propose an update to the saved item', async () => {
      const first = await run({}, 'Rufaida needs to take the kids to the park Saturday.');
      const conv = saveAll(first.conv);
      const ctx = makeCtx({ tasks: [task({ id: `saved_${conv.proposals[0].id}`, title: 'Take the kids to the park', due: '2026-10-24', assigneeId: 'm_ruf' })] }, conv);
      const r = await processMessage('Actually, make that Friday.', ctx, [], interp);
      expect(only(r)).toMatchObject({ kind: 'update', update: { changes: { date: '2026-10-23' } } });
    });
    it('the full thread from the brief', async () => {
      const { conv } = await run(
        {},
        'Rufaida needs to take the kids to the park Saturday.',
        'Can you put it on her list?',
        'Actually make that Sunday.',
        'Also remind her to bring snacks.',
      );
      const [park, snacks] = conv.proposals;
      expect(conv.proposals).toHaveLength(2);
      expect(park).toMatchObject({ date: '2026-10-25' });
      expect(assignee(park)).toMatchObject({ memberId: 'm_ruf' });
      expect(snacks).toMatchObject({ kind: 'reminder' });
      expect(snacks.title.toLowerCase()).toContain('snacks');
      expect(assignee(snacks)).toMatchObject({ memberId: 'm_ruf' });
    });
  });

  describe('10. who is responsible', () => {
    it('answers from real data', async () => {
      const tasks = [task({ id: 't1', title: 'Pick up the kids', due: TODAY, dueTime: '15:00', assigneeId: 'm_ruf' })];
      const { last } = await run({ tasks }, 'Who’s picking up the kids today?');
      expect(last.answer?.text).toMatch(/Rufaida/);
      expect(last.resolution.proposals).toHaveLength(0);
    });
    it('does not invent a responsible person', async () => {
      const { last } = await run({}, 'Who is responsible for groceries?');
      expect(last.answer?.text).toMatch(/No one/);
      expect(last.answer?.lines).toHaveLength(0);
    });
  });

  describe('11. adding someone to the household', () => {
    it('proposes adding the person (no account, no invite)', async () => {
      const p = only((await run({ people: [me] }, 'Add Rufaida to our household.')).last);
      expect(p).toMatchObject({ kind: 'person', title: 'Rufaida' });
    });
    it('notices when they are already there', async () => {
      const { last } = await run({}, 'Add Rufaida to our household.');
      expect(last.resolution.proposals).toHaveLength(0);
      expect(last.resolution.reply).toMatch(/already/);
    });
  });

  it('12. what everyone is doing this weekend comes from the calendar only', async () => {
    const events = [
      event({ id: 'e1', title: 'Swim class', start: '2026-10-24T09:00', end: '2026-10-24T10:00', visibility: 'shared' }),
      event({ id: 'e2', title: 'Leo’s party', start: '2026-10-25T14:00', end: '2026-10-25T16:00', visibility: 'shared' }),
      event({ id: 'e3', title: 'Dentist', start: '2026-10-28T10:00', end: '2026-10-28T11:00' }),
    ];
    const { last } = await run({ events }, 'What’s everyone doing this weekend?');
    expect(last.answer?.lines.map((l) => l.title)).toEqual(['Swim class', 'Leo’s party']);
  });

  it('13. a reminder linked to another plan inherits its day', async () => {
    const { conv } = await run(
      {},
      'Rufaida needs to take the kids to the park on Saturday',
      'Remind Rufaida to bring snacks when she takes the kids to the park.',
    );
    const snacks = conv.proposals[1];
    expect(snacks).toMatchObject({ kind: 'reminder', date: '2026-10-24' });
    expect(snacks.title.toLowerCase()).toBe('bring snacks');
    expect(assignee(snacks)).toMatchObject({ memberId: 'm_ruf' });
  });

  it('14. reassigning a task to someone else', async () => {
    const people = [me, { ...rufaida, relationship: 'wife' }, sarah];
    const { conv, last } = await run({ people }, 'My wife must fetch the groceries.', 'Can you give Sarah the grocery task instead?');
    expect(last.resolution.proposals).toHaveLength(0);
    expect(assignee(conv.proposals[0])).toMatchObject({ memberId: 'm_sar' });
  });

  it('14b. reassigning a saved task proposes an update', async () => {
    const tasks = [task({ id: 'tg', title: 'Buy groceries', assigneeId: 'm_ruf' })];
    const p = only((await run({ tasks }, 'Give Sarah the grocery task instead')).last);
    expect(p).toMatchObject({ kind: 'update', update: { target: { id: 'tg' }, changes: { assignee: { memberId: 'm_sar' } } } });
  });

  it('15. planning a day reports overlaps and changes nothing', async () => {
    const events = [
      event({ id: 'a', title: 'Swim class', start: '2026-10-24T09:00', end: '2026-10-24T10:00' }),
      event({ id: 'b', title: 'Football', start: '2026-10-24T09:30', end: '2026-10-24T11:00' }),
    ];
    const { last } = await run({ events }, 'Plan our Saturday without overlapping appointments.');
    expect(last.resolution.proposals).toHaveLength(0);
    expect(last.answer?.text).toMatch(/Swim class overlaps with Football/);
    expect(last.answer?.text).toMatch(/won’t change anything/);
  });

  describe('more', () => {
    it('several actions in one sentence, each for the right person', async () => {
      const { last } = await run({}, 'Rufaida needs to collect the kids at 3, buy milk and remind me to pay the electricity bill tomorrow.');
      const [collect, milk, bill] = last.resolution.proposals;
      expect(last.resolution.proposals).toHaveLength(3);
      expect(collect).toMatchObject({ kind: 'task', time: '15:00', date: TODAY });
      expect(assignee(collect)).toMatchObject({ memberId: 'm_ruf' });
      expect(milk.title.toLowerCase()).toBe('buy milk');
      expect(assignee(milk)).toMatchObject({ memberId: 'm_ruf' });
      expect(bill).toMatchObject({ kind: 'reminder', date: '2026-10-22' });
      expect(assignee(bill)).toMatchObject({ status: 'me' });
    });

    it('what a person has to do tomorrow, from their tasks only', async () => {
      const tasks = [
        task({ id: 't1', title: 'Collect the kids', due: '2026-10-22', assigneeId: 'm_ruf' }),
        task({ id: 't2', title: 'Book flu shots', due: '2026-10-22', visibility: 'private' }),
      ];
      const { last } = await run({ tasks }, 'What does Rufaida have to do tomorrow?');
      expect(last.answer?.lines.map((l) => l.title)).toEqual(['Collect the kids']);
    });

    it('overdue tasks', async () => {
      const tasks = [task({ id: 't1', title: 'Return library books', due: '2026-10-19' })];
      const { last } = await run({ tasks }, 'What tasks are overdue?');
      expect(last.answer?.lines.map((l) => l.title)).toEqual(['Return library books']);
    });

    it('“her” with nobody to refer to asks who', async () => {
      const p = only((await run({}, 'Remind her to call the vet tomorrow')).last);
      expect(assignee(p)).toMatchObject({ status: 'unclear' });
      expect(blockingIssue(p)).toBe('Who is this for?');
    });

    it('ambiguous numeric dates ask', async () => {
      const { last } = await run({}, 'Sarah has a dentist appointment on 11/12');
      expect(last.resolution.clarify ?? '').toMatch(/Did you mean/);
    });

    it('“for me” / “for Sarah” says who it is for and leaves the title clean', async () => {
      const mine = only((await run({}, 'Dentist for me on Tuesday at 3pm')).last);
      expect(mine).toMatchObject({ kind: 'event', title: 'Dentist', date: '2026-10-27', time: '15:00' });
      expect(assignee(mine)).toMatchObject({ status: 'me' });
      const hers = only((await run({}, 'Swimming kit for Sarah')).last);
      expect(hers.title).toBe('Swimming kit');
      expect(assignee(hers)).toMatchObject({ memberId: 'm_sar' });
      // An unknown capitalised word after "for" is not a person unless it reads like an appointment.
      expect(only((await run({}, 'Book tickets for Hamilton')).last).title).toBe('Book tickets for Hamilton');
      const xmas = only((await run({}, 'Make dinner for Christmas')).last);
      expect(xmas.title).toMatch(/for Christmas$/);
      expect(assignee(xmas)?.status).not.toBe('unknown');
    });

    it('processing a message never writes data', async () => {
      const before = useTasks.getState().tasks.length;
      await run({}, 'Rufaida needs to take the kids to the park.', 'Buy milk', 'Move my meeting to Friday');
      expect(useTasks.getState().tasks.length).toBe(before);
    });
  });
  describe('phrasings not used while building the interpreter', () => {
    const people = [me, rufaida, sarah, { ...rufaida, id: 'm_dad', name: 'Yusuf', relationship: 'dad' }];
    it.each<[string, Partial<Proposal>, string | undefined]>([
      ['Rufaida is going to collect the children from school at 3:30', { kind: 'task', time: '15:30' }, 'm_ruf'],
      ['Tell Sarah she needs to tidy her room', { kind: 'task', title: 'Tidy her room' }, 'm_sar'],
      ['Dad has to take the car for a service next week', { kind: 'task', date: '2026-10-26' }, 'm_dad'],
      ['Remind Dad to take the car for a service', { kind: 'reminder' }, 'm_dad'],
      ['get Rufaida to call the plumber on Monday morning', { kind: 'task', date: '2026-10-26', time: '09:00' }, 'm_ruf'],
      ['I need to take the children to school tomorrow', { kind: 'task', date: '2026-10-22' }, 'me'],
      ['Sarah has piano on Thursday at 4', { kind: 'event', date: '2026-10-22', time: '16:00' }, 'm_sar'],
      ['Could Rufaida take the kids swimming on Saturday?', { kind: 'task', date: '2026-10-24' }, 'm_ruf'],
      ['Rufaida will drop Sarah at ballet at 5', { kind: 'task', time: '17:00' }, 'm_ruf'],
      ['The kids have football on Sunday at 10', { kind: 'event', title: 'Football', date: '2026-10-25' }, undefined],
    ])('%s', async (text, expected, who) => {
      const p = only((await run({ people }, text)).last);
      expect(p).toMatchObject(expected);
      const a = assignee(p);
      if (who) expect(a && 'memberId' in a ? a.memberId : undefined).toBe(who);
    });
  });
});

describe('model output is never trusted blindly', () => {
  const ctx = makeCtx({ tasks: [task({ id: 'real', title: 'Buy groceries' })] }, emptyConversation);
  const fake = (interpretation: unknown): Interpreter => async () => sanitizeInterpretation(interpretation)!;

  it('rejects edits to refs that were not in the context', async () => {
    const r = await processMessage('x', ctx, [], fake({ reply: '', actions: [{ type: 'update_item', target: 't99', person: { name: 'Sarah' } }] }));
    expect(r.resolution.proposals).toHaveLength(0);
    expect(r.resolution.clarify).toMatch(/couldn’t find/);
  });

  it('ignores IDs and unknown fields smuggled into the output', async () => {
    const r = await processMessage(
      'x',
      ctx,
      [],
      fake({ reply: '', actions: [{ type: 'create_task', title: 'Pay rent', person: { name: 'Mallory', memberId: 'm_ruf' }, deleteAll: true }, { type: 'delete_everything' }] }),
    );
    expect(r.resolution.proposals).toHaveLength(1);
    expect(assignee(r.resolution.proposals[0])).toEqual({ status: 'unknown', name: 'Mallory' });
  });

  it('drops malformed dates and times', async () => {
    const r = await processMessage('x', ctx, [], fake({ reply: '', actions: [{ type: 'create_event', title: 'Party', date: 'next week', time: '25:99' }] }));
    const p = r.resolution.proposals[0];
    expect(p.date).toBeUndefined();
    expect(blockingIssue(p)).toMatch(/Choose a date/);
  });

  it('falls back to Basic mode when the AI fails, without breaking', async () => {
    const r = await processMessage('Rufaida needs to take the kids to the park', ctx, [], async () => {
      throw new Error('network down');
    });
    expect(r.source).toBe('basic');
    expect(r.resolution.proposals[0].title).toMatch(/park/);
  });
});
