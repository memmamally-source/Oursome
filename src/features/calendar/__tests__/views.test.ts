import type { CalendarSource, EventOccurrence } from '@/features/types';

import { columnsFor, onlyPerson, rangeFor, stepFor } from '../views';

describe('calendar views', () => {
  it('shows three days from the selected day on phones, the week on wide screens', () => {
    expect(columnsFor('days', '2026-10-24', false)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    const week = columnsFor('days', '2026-10-24', true);
    expect(week).toHaveLength(7);
    expect(week).toContain('2026-10-24');
    expect(columnsFor('day', '2026-10-24', false)).toEqual(['2026-10-24']);
  });

  it('steps by the size of the view, across month ends', () => {
    expect(stepFor('days', '2026-10-30', 1, false)).toBe('2026-11-02');
    expect(stepFor('days', '2026-10-24', -1, true)).toBe('2026-10-17');
    expect(stepFor('day', '2026-12-31', 1, false)).toBe('2027-01-01');
    expect(stepFor('month', '2026-01-31', 1, false)).toBe('2026-02-28');
  });

  it('loads the right range of events', () => {
    expect(rangeFor('days', '2026-10-24', false)).toEqual(['2026-10-24', '2026-10-26']);
    expect(rangeFor('list', '2026-10-24', false)).toEqual(['2026-10-24', '2026-11-23']);
    const [a, b] = rangeFor('month', '2026-10-15', false);
    expect(a <= '2026-10-01' && b >= '2026-10-31').toBe(true);
  });

  it('filters to one person by event owner or member calendar', () => {
    const calendars: CalendarSource[] = [{ id: 'jc', name: 'J', color: 'sky', kind: 'member', memberId: 'j', visible: true }];
    const o = (id: string, calendarId: string, personId?: string) =>
      ({ key: id, date: '2026-10-24', start: '', end: '', event: { id, calendarId, personId } }) as unknown as EventOccurrence;
    const all = [o('a', 'jc'), o('b', 'personal', 'j'), o('c', 'personal')];
    expect(onlyPerson(all, 'j', calendars).map((x) => x.key)).toEqual(['a', 'b']);
    expect(onlyPerson(all, null, calendars)).toHaveLength(3);
  });
});
