import type { CalendarEvent } from '@/features/types';

import { findConflicts, findTightGaps, layoutDay } from '../layout';
import { expandOccurrences, nextOccurrence, occurrencesOnDay, occursOn } from '../recurrence';

const base: CalendarEvent = {
  id: 'e',
  title: 'Event',
  start: '2026-10-21T09:00',
  end: '2026-10-21T10:00',
  allDay: false,
  timeZone: 'UTC',
  calendarId: 'c',
  visibility: 'private',
  createdAt: '',
};
const ev = (patch: Partial<CalendarEvent>): CalendarEvent => ({ ...base, ...patch });

describe('occursOn', () => {
  it('handles daily with interval', () => {
    const rule = { freq: 'daily' as const, interval: 2 };
    expect(occursOn('2026-10-21', rule, '2026-10-23')).toBe(true);
    expect(occursOn('2026-10-21', rule, '2026-10-22')).toBe(false);
  });
  it('weekdays skip weekends', () => {
    const rule = { freq: 'weekdays' as const };
    expect(occursOn('2026-10-21', rule, '2026-10-24')).toBe(false); // Saturday
    expect(occursOn('2026-10-21', rule, '2026-10-26')).toBe(true); // Monday
  });
  it('monthly on the 31st clamps to short months', () => {
    const rule = { freq: 'monthly' as const };
    expect(occursOn('2026-01-31', rule, '2026-02-28')).toBe(true);
    expect(occursOn('2026-01-31', rule, '2026-04-30')).toBe(true);
    expect(occursOn('2026-01-31', rule, '2026-04-29')).toBe(false);
  });
  it('respects until and never occurs before anchor', () => {
    const rule = { freq: 'weekly' as const, until: '2026-11-04' };
    expect(occursOn('2026-10-21', rule, '2026-11-04')).toBe(true);
    expect(occursOn('2026-10-21', rule, '2026-11-11')).toBe(false);
    expect(occursOn('2026-10-21', rule, '2026-10-14')).toBe(false);
  });
  it('yearly handles leap days', () => {
    expect(occursOn('2028-02-29', { freq: 'yearly' }, '2029-02-28')).toBe(true);
  });
});

describe('nextOccurrence', () => {
  it.each([
    [{ freq: 'daily' as const }, '2026-10-21', '2026-10-22'],
    [{ freq: 'weekly' as const }, '2026-10-21', '2026-10-28'],
    [{ freq: 'weekdays' as const }, '2026-10-23', '2026-10-26'],
    [{ freq: 'monthly' as const }, '2026-10-21', '2026-11-21'],
  ])('%j from %s → %s', (rule, from, expected) => {
    expect(nextOccurrence('2026-10-21', rule, from)).toBe(expected);
  });
  it('keeps the anchor day after a clamped month', () => {
    expect(nextOccurrence('2026-01-31', { freq: 'monthly' }, '2026-02-28')).toBe('2026-03-31');
  });
  it('returns null past until', () => {
    expect(nextOccurrence('2026-10-21', { freq: 'weekly', until: '2026-10-27' }, '2026-10-21')).toBeNull();
  });
});

describe('expandOccurrences', () => {
  it('expands a weekly series across a range', () => {
    const occ = expandOccurrences([ev({ recurrence: { freq: 'weekly' } })], '2026-10-01', '2026-11-30');
    expect(occ.map((o) => o.date)).toEqual(['2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
    expect(occ[1].start).toBe('2026-10-28T09:00');
    expect(occ[1].end).toBe('2026-10-28T10:00');
  });
  it('includes multi-day events on each day they touch', () => {
    const trip = ev({ start: '2026-10-21T18:00', end: '2026-10-23T12:00' });
    expect(occurrencesOnDay([trip], '2026-10-22')).toHaveLength(1);
    expect(occurrencesOnDay([trip], '2026-10-24')).toHaveLength(0);
  });
  it('sorts all-day first, then by start', () => {
    const occ = expandOccurrences(
      [
        ev({ id: 'b', start: '2026-10-21T08:00', end: '2026-10-21T08:30' }),
        ev({ id: 'a', allDay: true, start: '2026-10-21T00:00', end: '2026-10-21T23:59' }),
        ev({ id: 'c' }),
      ],
      '2026-10-21',
      '2026-10-21',
    );
    expect(occ.map((o) => o.event.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('layoutDay & conflicts', () => {
  it('places overlapping events in columns', () => {
    const occ = occurrencesOnDay(
      [
        ev({ id: 'a', start: '2026-10-21T09:00', end: '2026-10-21T10:00' }),
        ev({ id: 'b', start: '2026-10-21T09:30', end: '2026-10-21T10:30' }),
        ev({ id: 'c', start: '2026-10-21T11:00', end: '2026-10-21T12:00' }),
      ],
      '2026-10-21',
    );
    const laid = layoutDay(occ, '2026-10-21');
    const byId = Object.fromEntries(laid.map((p) => [p.occurrence.event.id, p]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2, startMin: 540 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ column: 0, columns: 1 });
    expect(findConflicts(occ).map(([x, y]) => [x.event.id, y.event.id])).toEqual([['a', 'b']]);
  });
  it('flags back-to-back events at different locations', () => {
    const occ = occurrencesOnDay(
      [
        ev({ id: 'doc', start: '2026-10-21T10:00', end: '2026-10-21T11:00', location: 'Clinic' }),
        ev({ id: 'meet', start: '2026-10-21T11:00', end: '2026-10-21T12:00', location: 'Office' }),
      ],
      '2026-10-21',
    );
    expect(findTightGaps(occ)).toHaveLength(1);
    expect(findConflicts(occ)).toHaveLength(0);
  });
});
