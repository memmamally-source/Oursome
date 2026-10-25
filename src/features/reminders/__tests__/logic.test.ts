import type { NotificationPrefs } from '@/features/settings/store';
import type { CalendarEvent, Task } from '@/features/types';

import { coalesce, daySummary, inQuietHours, remindersDue } from '../logic';

const prefs: NotificationPrefs = {
  appointments: true,
  deadlines: true,
  assignments: true,
  household: true,
  routines: true,
  morningBriefing: false,
  eveningBriefing: false,
  quietHours: { enabled: true, from: '21:30', to: '07:00' },
};

const event = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e1',
  title: 'Dentist',
  start: '2026-10-26T10:00',
  end: '2026-10-26T11:00',
  allDay: false,
  timeZone: 'Europe/London',
  calendarId: 'personal',
  reminderMinutes: 30,
  visibility: 'private',
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

const task = (over: Partial<Task>): Task =>
  ({
    id: 't1',
    title: 'Pay electricity bill',
    categoryId: 'home',
    priority: 'medium',
    visibility: 'private',
    createdAt: '2026-10-01T00:00:00Z',
    ...over,
  }) as Task;

const at = (s: string) => new Date(s);

describe('reminders', () => {
  it('fires an event reminder once, in the window that contains it', () => {
    const events = [event({})];
    const due = remindersDue({ tasks: [], events, prefs, from: at('2026-10-26T09:25'), to: at('2026-10-26T09:31') });
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ kind: 'event', title: 'Dentist', href: '/event/e1' });
    expect(due[0].body).toBe('In 30 minutes · 10 AM');
    // The next window doesn't repeat it.
    expect(remindersDue({ tasks: [], events, prefs, from: at('2026-10-26T09:31'), to: at('2026-10-26T09:40') })).toHaveLength(0);
  });

  it('reminds about each occurrence of a repeating event', () => {
    const events = [event({ recurrence: { freq: 'weekly' }, reminderMinutes: 60 })];
    const due = remindersDue({ tasks: [], events, prefs, from: at('2026-11-02T08:50'), to: at('2026-11-02T09:10') });
    expect(due.map((r) => r.title)).toEqual(['Dentist']);
  });

  it('reminds about all-day events at 9 AM, or the day before', () => {
    const events = [
      event({ allDay: true, start: '2026-10-28T00:00', end: '2026-10-28T23:59', reminderMinutes: 1440, title: 'Mum’s birthday' }),
    ];
    const due = remindersDue({ tasks: [], events, prefs, from: at('2026-10-27T08:59'), to: at('2026-10-27T09:00') });
    expect(due[0]).toMatchObject({ title: 'Mum’s birthday', body: 'Tomorrow' });
  });

  it('reminds about tasks with a reminder, skipping finished ones', () => {
    const tasks = [
      task({ due: '2026-10-26', dueTime: '18:00', reminderMinutes: 0 }),
      task({
        id: 't2',
        title: 'Done already',
        due: '2026-10-26',
        dueTime: '18:00',
        reminderMinutes: 0,
        completedAt: '2026-10-26T10:00:00Z',
      }),
      task({ id: 't3', title: 'No reminder', due: '2026-10-26', dueTime: '18:00' }),
    ];
    const due = remindersDue({ tasks, events: [], prefs, from: at('2026-10-26T17:59'), to: at('2026-10-26T18:00') });
    expect(due.map((r) => r.title)).toEqual(['Pay electricity bill']);
    expect(due[0].body).toBe('Due 6 PM');
  });

  it('respects the categories switched off', () => {
    const due = remindersDue({
      tasks: [task({ due: '2026-10-26', dueTime: '09:30', reminderMinutes: 0 })],
      events: [event({})],
      prefs: { ...prefs, appointments: false, deadlines: false },
      from: at('2026-10-26T09:00'),
      to: at('2026-10-26T10:00'),
    });
    expect(due).toHaveLength(0);
  });

  it('adds morning and evening briefings when switched on', () => {
    const due = remindersDue({
      tasks: [task({ due: '2026-10-27' })],
      events: [event({})],
      prefs: { ...prefs, morningBriefing: true, eveningBriefing: true, appointments: false },
      from: at('2026-10-26T07:00'),
      to: at('2026-10-26T20:00'),
    });
    expect(due.map((r) => [r.title, r.body])).toEqual([
      ['Good morning', '1 event. First up: Dentist at 10 AM.'],
      ['Tomorrow', '1 task.'],
    ]);
  });

  it('knows quiet hours, including past midnight', () => {
    const q = prefs.quietHours;
    expect(inQuietHours(at('2026-10-26T22:00'), q)).toBe(true);
    expect(inQuietHours(at('2026-10-26T06:59'), q)).toBe(true);
    expect(inQuietHours(at('2026-10-26T07:00'), q)).toBe(false);
    expect(inQuietHours(at('2026-10-26T12:00'), q)).toBe(false);
    expect(inQuietHours(at('2026-10-26T22:00'), { ...q, enabled: false })).toBe(false);
    expect(inQuietHours(at('2026-10-26T13:30'), { enabled: true, from: '13:00', to: '15:00' })).toBe(true);
  });

  it('turns a pile of reminders into one summary', () => {
    const r = (title: string) => ({ id: title, kind: 'task' as const, title, body: '', at: new Date(), href: '/' });
    expect(coalesce([r('a'), r('b')]).single).toHaveLength(2);
    expect(coalesce([r('a'), r('b'), r('c'), r('d'), r('e')]).summary).toEqual({ title: '5 reminders', body: 'a, b, c, d…' });
  });

  it('summarises a quiet day kindly', () => {
    expect(daySummary([], [], '2026-10-26')).toBe('Nothing planned. Enjoy the space.');
  });
});
