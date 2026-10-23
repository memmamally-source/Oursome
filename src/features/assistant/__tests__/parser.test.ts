import { applyClarification, nextClarification, parseCapture, type ParseResult, type Proposal } from '../parser';

// Wednesday 21 October 2026, 10:00 local time.
const now = new Date(2026, 9, 21, 10, 0);
const members = [
  { id: 'me', name: 'Alex', color: 'coral' as const, role: 'admin' as const, isMe: true },
  { id: 'j', name: 'Jordan', color: 'sky' as const, role: 'member' as const },
];
const ctx = { now, members };

function proposals(result: ParseResult): Proposal[] {
  if (result.type !== 'proposals') throw new Error(`Expected proposals, got ${JSON.stringify(result)}`);
  return result.proposals;
}

describe('parseCapture — brief examples', () => {
  it('“Remember to buy milk tomorrow” → dated task + shopping item', () => {
    const [task, shop] = proposals(parseCapture('Remember to buy milk tomorrow.', ctx));
    expect(task).toMatchObject({ kind: 'task', title: 'Buy milk', date: '2026-10-22', categoryId: 'shopping' });
    expect(shop).toMatchObject({ kind: 'shopping', items: ['Milk'] });
  });

  it('“School meeting on Friday at 4” → event Friday 4–5 PM with assumption flagged', () => {
    const [p] = proposals(parseCapture('School meeting on Friday at 4', ctx));
    expect(p).toMatchObject({ kind: 'event', title: 'School meeting', date: '2026-10-23', time: '16:00', endTime: '17:00' });
    expect(p.assumptions).toContain('Time taken as 4 PM');
  });

  it('“Pay electricity bill before the 25th” → finance task due the 24th', () => {
    const [p] = proposals(parseCapture('Pay electricity bill before the 25th', ctx));
    expect(p).toMatchObject({ kind: 'task', title: 'Pay electricity bill', date: '2026-10-24', categoryId: 'finance' });
    expect(p.assumptions[0]).toMatch(/day before/);
  });

  it('“Add a dentist appointment on Tuesday at 3 PM” → event', () => {
    const [p] = proposals(parseCapture('Add a dentist appointment on Tuesday at 3 PM', ctx));
    expect(p).toMatchObject({ kind: 'event', title: 'Dentist appointment', date: '2026-10-27', time: '15:00' });
    expect(p.assumptions).toHaveLength(0);
  });

  it('“Remind me to renew my car licence next month” → reminder with flagged date', () => {
    const [p] = proposals(parseCapture('Remind me to renew my car licence next month', ctx));
    expect(p).toMatchObject({ kind: 'reminder', title: 'Renew my car licence', date: '2026-11-01', time: '09:00' });
    expect(p.assumptions.join(' ')).toMatch(/No exact day/);
  });

  it('“Remind my partner to pay the electricity bill” asks who', () => {
    const r = parseCapture('Remind my partner to pay the electricity bill', ctx);
    expect(r.type).toBe('clarify');
    if (r.type !== 'clarify') return;
    expect(r.question).toBe('Who should I remind?');
    expect(r.options.map((o) => o.label)).toEqual(['Jordan']);
    // Assignee comes first; the reminder still needs a time, so a follow-up question is due.
    const resolved = applyClarification(r.pending, r.options[0]);
    expect(resolved[0]).toMatchObject({ kind: 'reminder', assigneeId: 'j', title: 'Pay the electricity bill' });
    const next = nextClarification(resolved, now);
    expect(next?.type === 'clarify' && next.question).toBe('When should I remind them?');
  });

  it('reminding a named member resolves without asking', () => {
    const [p] = proposals(parseCapture('Remind Jordan to call the plumber tomorrow at 9am', ctx));
    expect(p).toMatchObject({ kind: 'reminder', assigneeId: 'j', title: 'Call the plumber', date: '2026-10-22', time: '09:00' });
  });

  it('remind-other without a space offers a personal reminder', () => {
    const r = parseCapture('Remind my wife to book the vet', { now, members: [] });
    expect(r.type).toBe('clarify');
    if (r.type === 'clarify') expect(r.options[0].label).toBe('Remind me instead');
  });
});

describe('parseCapture — dates', () => {
  const dateOf = (text: string) => proposals(parseCapture(text, ctx))[0].date;

  it.each([
    ['Call mum today', '2026-10-21'],
    ['Call mum tomorrow', '2026-10-22'],
    ['Call mum the day after tomorrow', '2026-10-23'],
    ['Call mum on Monday', '2026-10-26'],
    ['Call mum Wednesday', '2026-10-28'], // same weekday → next week
    ['Call mum this Wednesday', '2026-10-21'],
    ['Call mum on the 3rd', '2026-11-03'], // already passed this month
    ['Call mum on the 30th', '2026-10-30'],
    ['Call mum on 5 December', '2026-12-05'],
    ['Call mum on March 2nd', '2027-03-02'],
    ['Call mum in 3 days', '2026-10-24'],
    ['Call mum in two weeks', '2026-11-04'],
  ])('%s → %s', (text, expected) => {
    expect(dateOf(text)).toBe(expected);
  });

  it('same weekday as today is flagged as next week', () => {
    const [p] = proposals(parseCapture('Call mum Wednesday', ctx));
    expect(p.assumptions[0]).toMatch(/^Today is Wednesday — taken as next week/);
  });

  it('“next Friday” means Friday of next week, flagged', () => {
    const [p] = proposals(parseCapture('Haircut next Friday at 11am', ctx));
    expect(p).toMatchObject({ kind: 'event', date: '2026-10-30', time: '11:00' });
    expect(p.assumptions[0]).toMatch(/Next Friday/);
  });

  it('ambiguous numeric date asks US vs UK', () => {
    const r = parseCapture('Dentist on 11/12 at 2pm', ctx);
    expect(r.type).toBe('clarify');
    if (r.type !== 'clarify') return;
    expect(r.options.map((o) => o.patch.date)).toEqual(['2026-11-12', '2026-12-11']);
    const [p] = applyClarification(r.pending, r.options[1]);
    expect(p).toMatchObject({ kind: 'event', date: '2026-12-11', time: '14:00' });
  });

  it('unambiguous numeric date resolves', () => {
    expect(dateOf('Dentist on 10/28 at 2pm')).toBe('2026-10-28');
  });
});

describe('parseCapture — times', () => {
  const first = (text: string) => proposals(parseCapture(text, ctx))[0];

  it.each([
    ['Lunch with Sam tomorrow at 12:30pm', '12:30', '13:30'],
    ['Meeting tomorrow at 14:00', '14:00', '15:00'],
    ['Meeting tomorrow 3-4pm', '15:00', '16:00'],
    ['Meeting tomorrow from 11 to 1pm', '11:00', '13:00'],
    ['Meeting tomorrow at noon', '12:00', '13:00'],
    ['Yoga class tomorrow at 7am for 90 minutes', '07:00', '08:30'],
    ['Call with Priya tomorrow at 4pm for half an hour', '16:00', '16:30'],
  ])('%s → %s–%s', (text, start, end) => {
    expect(first(text)).toMatchObject({ kind: 'event', time: start, endTime: end });
  });

  it('“at 9” assumes morning', () => {
    const p = first('Team meeting Friday at 9');
    expect(p.time).toBe('09:00');
    expect(p.assumptions).toContain('Time taken as 9 AM');
  });

  it('time without date lands today if still ahead', () => {
    const p = first('Meeting at 3pm');
    expect(p).toMatchObject({ date: '2026-10-21', time: '15:00' });
  });

  it('time without date that has passed lands tomorrow', () => {
    const p = first('Meeting at 8am');
    expect(p).toMatchObject({ date: '2026-10-22', time: '08:00' });
  });

  it('“tonight” sets evening', () => {
    const p = first('Dinner with the Parkers tonight');
    expect(p).toMatchObject({ kind: 'event', date: '2026-10-21', time: '19:00' });
  });

  it('event with date but no time becomes all-day', () => {
    const p = first('Sports Day on Friday');
    expect(p).toMatchObject({ kind: 'event', title: 'Sports Day', date: '2026-10-23', allDay: true });
  });

  it('captures capitalised locations', () => {
    const p = first('Dentist at Bright Smiles on Tuesday at 3pm');
    expect(p).toMatchObject({ kind: 'event', title: 'Dentist', location: 'Bright Smiles', time: '15:00' });
  });
});

describe('parseCapture — other intents', () => {
  it('“Add eggs, bread and butter to the shopping list” → shopping items', () => {
    const [p] = proposals(parseCapture('Add eggs, bread and butter to the shopping list', ctx));
    expect(p).toMatchObject({ kind: 'shopping', items: ['Eggs', 'Bread', 'Butter'], listName: undefined });
  });

  it('named lists are kept', () => {
    const [p] = proposals(parseCapture('Add light bulbs to the hardware store list', ctx));
    expect(p).toMatchObject({ kind: 'shopping', items: ['Light bulbs'], listName: 'Hardware store' });
  });

  it('undated “buy” becomes a shopping item only', () => {
    const ps = proposals(parseCapture('Buy bananas and oat milk', ctx));
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ kind: 'shopping', items: ['Bananas', 'Oat milk'] });
  });

  it('reminder without any time asks when', () => {
    const r = parseCapture('Remind me to call the bank', ctx);
    expect(r.type).toBe('clarify');
    if (r.type !== 'clarify') return;
    expect(r.options.map((o) => o.label)).toEqual(['This evening', 'Tomorrow morning', 'No time — just a task']);
    const [p] = applyClarification(r.pending, r.options[1]);
    expect(p).toMatchObject({ kind: 'reminder', date: '2026-10-22', time: '09:00' });
  });

  it('plain task without date', () => {
    const [p] = proposals(parseCapture('Renew passport', ctx));
    expect(p).toMatchObject({ kind: 'task', title: 'Renew passport', date: undefined });
  });

  it.each([
    ["What's on today?", 'today'],
    ['What do I have tomorrow', 'tomorrow'],
    ['Summarise my week', 'week'],
    ['Organise my tasks for tomorrow', 'plan-tomorrow'],
    ['Move my flexible tasks to another day because I’m busy', 'reschedule'],
  ])('query: %s', (text, query) => {
    expect(parseCapture(text, ctx)).toEqual({ type: 'query', query });
  });

  it('generative requests are deferred to the AI assistant', () => {
    expect(parseCapture('Create a grocery list for dinner tonight', ctx)).toEqual({ type: 'unsupported', reason: 'generative' });
  });
});
