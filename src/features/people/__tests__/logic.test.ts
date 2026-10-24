import type { CalendarSource, EventOccurrence, Member, Task } from '@/features/types';

import { isTaskFor, plateCounts, todayTasks } from '../logic';

const me: Member = { id: 'me', name: 'Sam', color: 'coral', role: 'admin', isMe: true };
const ru: Member = { id: 'ru', name: 'Rufaida', color: 'sky', role: 'member', kind: 'person' };

const task = (p: Partial<Task>): Task => ({
  id: p.id ?? Math.round(Math.abs(Math.sin(p.order ?? 1)) * 1e6).toString(),
  title: 't',
  categoryId: 'home',
  priority: 'medium',
  subtasks: [],
  visibility: 'private',
  order: 0,
  createdAt: '2026-10-01T00:00:00Z',
  ...p,
});

const occ = (personId: string | undefined, calendarId = 'c1'): EventOccurrence => ({
  key: `${personId}-${calendarId}`,
  date: '2026-10-24',
  start: '2026-10-24T09:00',
  end: '2026-10-24T10:00',
  event: {
    id: 'e',
    title: 'e',
    start: '2026-10-24T09:00',
    end: '2026-10-24T10:00',
    allDay: false,
    timeZone: 'UTC',
    calendarId,
    visibility: 'private',
    personId,
    createdAt: '',
  },
});

describe('people logic', () => {
  it('treats unassigned tasks as mine, but not ones with a suggested name', () => {
    expect(isTaskFor(task({}), me)).toBe(true);
    expect(isTaskFor(task({ assigneeName: 'Bob' }), me)).toBe(false);
    expect(isTaskFor(task({ assigneeId: 'ru' }), ru)).toBe(true);
    expect(isTaskFor(task({ assigneeId: 'ru' }), me)).toBe(false);
  });

  it('counts tasks due by today and events by person or member calendar', () => {
    const calendars: CalendarSource[] = [{ id: 'ruCal', name: 'Ru', color: 'sky', kind: 'member', memberId: 'ru', visible: true }];
    const tasks = [
      task({ id: '1', assigneeId: 'ru', due: '2026-10-23' }),
      task({ id: '2', assigneeId: 'ru', due: '2026-10-30' }),
      task({ id: '3', assigneeId: 'ru' }),
      task({ id: '4', due: '2026-10-24' }),
      task({ id: '5', assigneeId: 'ru', due: '2026-10-24', completedAt: 'x' }),
    ];
    const counts = plateCounts([me, ru], tasks, [occ('ru'), occ(undefined, 'ruCal'), occ('me')], calendars, '2026-10-24');
    expect(counts).toEqual({ me: 2, ru: 3 });
  });

  it('orders today: overdue, then priority, then time', () => {
    const list = todayTasks(
      [
        task({ id: 'a', due: '2026-10-24', priority: 'low' }),
        task({ id: 'b', due: '2026-10-24', priority: 'high', dueTime: '15:00' }),
        task({ id: 'c', due: '2026-10-22', priority: 'low' }),
        task({ id: 'd', due: '2026-10-24', priority: 'high', dueTime: '09:00' }),
        task({ id: 'e' }),
      ],
      '2026-10-24',
    );
    expect(list.map((t) => t.id)).toEqual(['c', 'd', 'b', 'a']);
  });
});
