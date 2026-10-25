import type { CalendarEvent } from '@/features/types';

import { mergeImported, parseICS, toICS } from '../ics';

const event = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e1',
  title: 'Dinner with my parents',
  start: '2026-10-30T19:00',
  end: '2026-10-30T21:00',
  allDay: false,
  timeZone: 'Europe/London',
  calendarId: 'cal_personal',
  visibility: 'private',
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

const GOOGLE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Europe/London:20261103T090000',
  'DTEND;TZID=Europe/London:20261103T093000',
  'RRULE:FREQ=WEEKLY;BYDAY=TU',
  'UID:abc123@google.com',
  'SUMMARY:Swimming\\, lane 3',
  'LOCATION:Leisure centre',
  'DESCRIPTION:Bring goggles\\nand a towel',
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'TRIGGER:-P0DT0H15M0S',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261224',
  'DTEND;VALUE=DATE:20261227',
  'UID:holiday@google.com',
  'SUMMARY:Family visit',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261105T170000Z',
  'DURATION:PT45M',
  'SUMMARY:Call with the bank',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261106T100000',
  'SUMMARY:Cancelled thing',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('calendar files', () => {
  it('reads timed, all-day, UTC and repeating events from Google’s format', () => {
    const events = parseICS(GOOGLE);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      uid: 'abc123@google.com',
      title: 'Swimming, lane 3',
      start: '2026-11-03T09:00',
      end: '2026-11-03T09:30',
      allDay: false,
      location: 'Leisure centre',
      notes: 'Bring goggles\nand a towel',
      recurrence: { freq: 'weekly' },
      reminderMinutes: 15,
    });
    expect(events[1]).toMatchObject({ title: 'Family visit', allDay: true, start: '2026-12-24T00:00', end: '2026-12-26T23:59' });
    const utc = new Date(Date.UTC(2026, 10, 5, 17, 0));
    const local = `${utc.getFullYear()}-${String(utc.getMonth() + 1).padStart(2, '0')}-${String(utc.getDate()).padStart(2, '0')}T${String(utc.getHours()).padStart(2, '0')}:00`;
    expect(events[2]).toMatchObject({ title: 'Call with the bank', start: local });
  });

  it('turns a repeat count into an end date and flags rules it simplifies', () => {
    const ics =
      'BEGIN:VEVENT\nDTSTART:20261102T080000\nRRULE:FREQ=DAILY;COUNT=5\nSUMMARY:Antibiotics\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART:20261102T080000\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE\nSUMMARY:Gym\nEND:VEVENT';
    const [a, b] = parseICS(ics);
    expect(a.recurrence).toEqual({ freq: 'daily', until: '2026-11-06' });
    expect(a.simplified).toBeUndefined();
    expect(b).toMatchObject({ recurrence: { freq: 'weekly' }, simplified: true });
  });

  it('unfolds long lines', () => {
    const [e] = parseICS(
      'BEGIN:VEVENT\r\nDTSTART:20261102T080000\r\nSUMMARY:A very long title that was\r\n  folded by the exporter\r\nEND:VEVENT',
    );
    expect(e.title).toBe('A very long title that was folded by the exporter');
  });

  it('writes a file Google and Apple can import, and reads it back', () => {
    const ics = toICS(
      [
        event({ reminderMinutes: 30, location: 'Mum & Dad’s, Leeds', notes: 'Bring wine; dessert' }),
        event({
          id: 'e2',
          title: 'Our anniversary',
          allDay: true,
          start: '2026-06-12T00:00',
          end: '2026-06-12T23:59',
          recurrence: { freq: 'yearly' },
        }),
        event({ id: 'e3', title: 'Task view only', taskId: 't1' }),
      ],
      'Riveras',
      new Date('2026-10-25T12:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0');
    expect(ics).toContain('DTSTART;TZID=Europe/London:20261030T190000');
    expect(ics).toContain('LOCATION:Mum & Dad’s\\, Leeds');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260612\r\nDTEND;VALUE=DATE:20260613');
    expect(ics).toContain('RRULE:FREQ=YEARLY');
    expect(ics).not.toContain('Task view only');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);

    const back = parseICS(ics);
    expect(back.map((e) => [e.title, e.start, e.end, e.allDay])).toEqual([
      ['Dinner with my parents', '2026-10-30T19:00', '2026-10-30T21:00', false],
      ['Our anniversary', '2026-06-12T00:00', '2026-06-12T23:59', true],
    ]);
    expect(back[0]).toMatchObject({ notes: 'Bring wine; dessert', reminderMinutes: 30 });
    expect(back[1].recurrence).toEqual({ freq: 'yearly' });
  });

  it('updates rather than duplicates when the same file is imported again', () => {
    let n = 0;
    const makeId = () => `id${++n}`;
    const first = mergeImported([], parseICS(GOOGLE), 'cal_x', 'Europe/London', makeId);
    expect([first.added, first.updated]).toEqual([3, 0]);
    const changed = GOOGLE.replace('SUMMARY:Family visit', 'SUMMARY:Family visit (Grandma too)');
    const second = mergeImported(first.events, parseICS(changed), 'cal_x', 'Europe/London', makeId);
    expect([second.added, second.updated]).toEqual([0, 3]);
    expect(second.events.find((e) => e.externalId === 'holiday@google.com')?.title).toBe('Family visit (Grandma too)');
  });
});
