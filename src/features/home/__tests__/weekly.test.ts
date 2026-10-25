import type { CalendarEvent, Task } from '@/features/types';

import { startSteps } from '../start';
import { showsWeekly, weekLines, weekSummary } from '../weekly';

const task = (p: Partial<Task>): Task =>
  ({ id: 't', title: 't', categoryId: 'home', priority: 'medium', visibility: 'private', createdAt: '', ...p }) as Task;
const event = (start: string, p: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: start,
  title: 'e',
  start,
  end: start.replace(/T\d\d/, 'T23'),
  allDay: false,
  timeZone: 'UTC',
  calendarId: 'c',
  visibility: 'private',
  createdAt: '',
  ...p,
});

describe('weekly summary', () => {
  it('shows on Sundays and Mondays only', () => {
    expect(showsWeekly(new Date(2026, 9, 25))).toBe(true); // Sunday
    expect(showsWeekly(new Date(2026, 9, 26))).toBe(true); // Monday
    expect(showsWeekly(new Date(2026, 9, 27))).toBe(false);
  });

  it('counts the week just gone and glances ahead', () => {
    const tasks = [
      task({ id: 'a', completedAt: new Date(2026, 9, 20, 12).toISOString() }),
      task({ id: 'b', completedAt: new Date(2026, 9, 25, 9).toISOString() }),
      task({ id: 'c', completedAt: new Date(2026, 9, 10, 9).toISOString() }),
      task({ id: 'd', due: '2026-10-28' }),
    ];
    const events = [
      event('2026-10-21T10:00'),
      event('2026-10-27T10:00'),
      event('2026-10-29T10:00'),
      event('2026-10-21T10:00', { taskId: 'x' }),
    ];
    const s = weekSummary(tasks, events, ['2026-10-24', '2026-09-01'], new Date(2026, 9, 25, 18));
    expect(s).toEqual({
      id: 'weekly:2026-10-19',
      from: '2026-10-19',
      to: '2026-10-25',
      done: 2,
      plans: 1,
      memories: 1,
      ahead: { plans: 2, tasks: 1 },
    });
    expect(weekLines(s)).toEqual({
      back: 'This week you finished 2 things, had 1 plan and kept 1 memory.',
      ahead: 'Coming up: 2 plans and 1 task due.',
    });
  });

  it('on Monday looks at the seven days before', () => {
    expect(weekSummary([], [], [], new Date(2026, 9, 26, 8))).toMatchObject({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('is kind about quiet weeks', () => {
    expect(weekLines(weekSummary([], [], [], new Date(2026, 9, 25)))).toEqual({
      back: 'A quiet week. Those count too.',
      ahead: 'Nothing planned for the week ahead yet.',
    });
  });
});

describe('getting started', () => {
  it('ticks off steps from real state and routes people to the right place', () => {
    const fresh = startSteps({ hasHome: false, people: 1, plans: 0, memories: 0 });
    expect(fresh.map((s) => s.done)).toEqual([false, false, false, false]);
    expect(fresh[1].href).toBe('/space-create');
    const later = startSteps({ hasHome: true, people: 3, plans: 2, memories: 0 });
    expect(later.map((s) => s.done)).toEqual([true, true, true, false]);
    expect(later[1].href).toBe('/person/new');
  });
});
