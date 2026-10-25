import type { EventOccurrence } from '@/features/types';

import { homeGreeting, ordinal, seasonOf, upcomingOccasions } from '../occasions';

const occ = (title: string, date: string, start = '2016-10-25T00:00', yearly = true): EventOccurrence =>
  ({
    key: `${title}-${date}`,
    date,
    start: `${date}T00:00`,
    end: `${date}T23:59`,
    event: {
      id: title,
      title,
      start,
      end: start,
      allDay: true,
      timeZone: 'UTC',
      calendarId: 'c',
      visibility: 'shared',
      createdAt: '',
      isImportantDate: true,
      recurrence: yearly ? { freq: 'yearly' } : null,
    },
  }) as EventOccurrence;

describe('occasions', () => {
  const now = new Date(2026, 9, 25, 9, 0);

  it('finds birthdays and anniversaries today and tomorrow, today first, with the years', () => {
    const list = upcomingOccasions(
      [occ('Grandma’s birthday', '2026-10-26', '1950-10-26T00:00'), occ('Our anniversary', '2026-10-25'), occ('Later', '2026-11-02')],
      now,
    );
    expect(list.map((o) => [o.title, o.kind, o.when, o.years])).toEqual([
      ['Our anniversary', 'anniversary', 'today', 10],
      ['Grandma’s birthday', 'birthday', 'tomorrow', 76],
    ]);
  });

  it('leaves out the years for one-off dates', () => {
    expect(upcomingOccasions([occ('Moving day', '2026-10-25', '2026-10-25T00:00', false)], now)[0].years).toBeUndefined();
  });

  it('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 112].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
      '112th',
    ]);
  });

  it('seasons (northern hemisphere)', () => {
    expect([0, 3, 6, 9, 11].map((m) => seasonOf(new Date(2026, m, 15)))).toEqual(['winter', 'spring', 'summer', 'autumn', 'winter']);
  });

  it('greets by time of day and household', () => {
    expect(homeGreeting(now, 'Alex', 'Our Home')).toEqual({
      hello: 'Good morning, Alex.',
      line: 'Here’s what’s happening at Our Home today.',
    });
    expect(homeGreeting(new Date(2026, 9, 25, 19), undefined, undefined)).toEqual({
      hello: 'Good evening.',
      line: 'Here’s what’s happening at home today.',
    });
  });
});
