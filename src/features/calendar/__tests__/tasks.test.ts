import type { Task } from '@/features/types';

import { TASKS_CALENDAR_ID, taskOccurrences } from '../tasks';

const task = (p: Partial<Task>): Task => ({
  id: 't',
  title: 'Task',
  categoryId: 'home',
  priority: 'medium',
  subtasks: [],
  visibility: 'private',
  order: 0,
  createdAt: '',
  ...p,
});

describe('tasks on the calendar', () => {
  it('shows open dated tasks in range: timed as 30-minute blocks, others all day', () => {
    const occ = taskOccurrences(
      [
        task({ id: 'a', title: 'Call the bank', due: '2026-10-26', dueTime: '09:00' }),
        task({ id: 'b', title: 'Pay rent', due: '2026-10-27' }),
        task({ id: 'c', title: 'Someday' }),
        task({ id: 'd', title: 'Done', due: '2026-10-26', completedAt: 'x' }),
        task({ id: 'e', title: 'Too late', due: '2026-11-30' }),
      ],
      '2026-10-24',
      '2026-10-31',
    );
    expect(occ.map((o) => o.event.taskId)).toEqual(['a', 'b']);
    expect(occ[0]).toMatchObject({ date: '2026-10-26', start: '2026-10-26T09:00', end: '2026-10-26T09:30', event: { allDay: false, calendarId: TASKS_CALENDAR_ID } });
    expect(occ[1].event.allDay).toBe(true);
  });

  it('belongs to the assignee, or to me when unassigned', () => {
    const [mine, hers, noted] = taskOccurrences(
      [task({ id: 'a', due: '2026-10-25' }), task({ id: 'b', due: '2026-10-25', assigneeId: 'p_ru' }), task({ id: 'c', due: '2026-10-25', assigneeName: 'Bob' })],
      '2026-10-25',
      '2026-10-25',
    );
    expect(mine.event.personId).toBe('me');
    expect(hers.event.personId).toBe('p_ru');
    expect(noted.event.personId).toBeUndefined();
  });

  it('keeps a late-evening task within the day', () => {
    const [o] = taskOccurrences([task({ due: '2026-10-25', dueTime: '23:50' })], '2026-10-25', '2026-10-25');
    expect(o.end).toBe('2026-10-25T23:59');
  });
});
