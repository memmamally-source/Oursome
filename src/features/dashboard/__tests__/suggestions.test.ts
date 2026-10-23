import type { CalendarEvent, EventOccurrence, Task } from '@/features/types';

import { buildSuggestions } from '../suggestions';

const occ = (id: string, date: string, from: string, to: string, extra: Partial<CalendarEvent> = {}): EventOccurrence => {
  const event: CalendarEvent = {
    id,
    title: id,
    start: `${date}T${from}`,
    end: `${date}T${to}`,
    allDay: false,
    timeZone: 'UTC',
    calendarId: 'c',
    visibility: 'private',
    createdAt: '',
    ...extra,
  };
  return { key: `${id}@${date}`, event, date, start: event.start, end: event.end };
};
const task = (patch: Partial<Task>): Task => ({
  id: 't',
  title: 'Task',
  categoryId: 'personal',
  priority: 'medium',
  subtasks: [],
  visibility: 'private',
  order: 0,
  createdAt: '',
  ...patch,
});

const base = {
  now: new Date(2026, 9, 21, 16, 0),
  today: '2026-10-21',
  todayOccurrences: [] as EventOccurrence[],
  tomorrowOccurrences: [] as EventOccurrence[],
  upcomingImportant: [] as EventOccurrence[],
  tasks: [] as Task[],
};

describe('buildSuggestions', () => {
  it('returns nothing on a calm day', () => {
    expect(buildSuggestions(base)).toEqual([]);
  });

  it('suggests preparing for a busy tomorrow, worded for the evening', () => {
    const tomorrow = ['a', 'b', 'c'].map((id, i) => occ(id, '2026-10-22', `0${9 + i}:00`, `0${9 + i}:30`));
    const [s] = buildSuggestions({ ...base, tomorrowOccurrences: tomorrow });
    expect(s.text).toBe('You have three appointments tomorrow. Would you like to prepare your to-do list tonight?');
  });

  it('flags overlaps still ahead today, ignoring ones already over', () => {
    const today = [
      occ('Doctor', '2026-10-21', '17:00', '18:00'),
      occ('Meeting', '2026-10-21', '17:30', '18:30'),
      occ('Past1', '2026-10-21', '09:00', '10:00'),
      occ('Past2', '2026-10-21', '09:30', '10:30'),
    ];
    const s = buildSuggestions({ ...base, todayOccurrences: today });
    expect(s).toHaveLength(1);
    expect(s[0].text).toMatch(/^Doctor and Meeting overlap at 5:30 PM/);
  });

  it('warns about back-to-back events at different places without inventing travel time', () => {
    const today = [
      occ('Doctor', '2026-10-21', '17:00', '18:00', { location: 'Clinic' }),
      occ('Meeting', '2026-10-21', '18:00', '19:00', { location: 'Office' }),
    ];
    const [s] = buildSuggestions({ ...base, todayOccurrences: today });
    expect(s.text).toContain('might conflict if you need travel time');
  });

  it('offers to move overdue tasks', () => {
    const [s] = buildSuggestions({ ...base, tasks: [task({ id: 'x', title: 'Return books', due: '2026-10-19' })] });
    expect(s.action).toEqual({ type: 'move-overdue-to-today', taskIds: ['x'] });
  });

  it('nudges for an upcoming birthday once', () => {
    const bday = occ('Grandma’s birthday', '2026-10-26', '00:00', '23:59', { allDay: true, isImportantDate: true });
    const [s] = buildSuggestions({ ...base, upcomingImportant: [bday] });
    expect(s.action).toEqual({ type: 'create-task', title: 'Card or gift for Grandma', due: '2026-10-26' });
    const again = buildSuggestions({ ...base, upcomingImportant: [bday], tasks: [task({ title: 'Card or gift for Grandma' })] });
    expect(again).toEqual([]);
  });
});
