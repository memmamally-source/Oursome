import type { Task } from '@/features/types';

import { completeTask, groupOpenTasks, moveTask, pickPriorities } from '../logic';

const t = (patch: Partial<Task>): Task => ({
  id: Math.random().toString(36),
  title: 'Task',
  categoryId: 'personal',
  priority: 'medium',
  subtasks: [],
  visibility: 'private',
  order: 0,
  createdAt: '',
  ...patch,
});
const today = '2026-10-21';

describe('completeTask', () => {
  it('marks a one-off task complete', () => {
    const { completed, next } = completeTask(t({ due: today }), new Date(2026, 9, 21, 12));
    expect(completed.completedAt).toBeDefined();
    expect(next).toBeUndefined();
  });
  it('rolls a recurring task forward and resets subtasks', () => {
    const task = t({ due: today, recurrence: { freq: 'weekly' }, subtasks: [{ id: 's', title: 'x', done: true }] });
    const { completed, next } = completeTask(task);
    expect(completed.recurrence).toBeNull();
    expect(next).toMatchObject({ due: '2026-10-28', recurrence: { freq: 'weekly' } });
    expect(next!.subtasks[0].done).toBe(false);
    expect(next!.id).not.toBe(task.id);
  });
});

describe('pickPriorities', () => {
  it('orders overdue, then today by priority, and skips reminders/completed', () => {
    const tasks = [
      t({ id: 'later', due: '2026-10-30' }),
      t({ id: 'today-low', due: today, priority: 'low' }),
      t({ id: 'today-high', due: today, priority: 'high' }),
      t({ id: 'overdue', due: '2026-10-19' }),
      t({ id: 'reminder', due: today, isReminder: true }),
      t({ id: 'done', due: today, completedAt: 'x' }),
    ];
    expect(pickPriorities(tasks, today).map((x) => x.id)).toEqual(['overdue', 'today-high', 'today-low']);
  });
});

describe('groupOpenTasks', () => {
  it('buckets by due date', () => {
    const groups = groupOpenTasks(
      [t({ due: '2026-10-20' }), t({ due: today }), t({ due: '2026-10-22' }), t({ due: '2026-11-01' }), t({})],
      today,
    );
    expect(groups.map((g) => g.key)).toEqual(['overdue', 'today', 'tomorrow', 'upcoming', 'someday']);
  });
  it('manual mode sorts by order', () => {
    const groups = groupOpenTasks(
      [t({ id: 'b', due: today, order: 2, priority: 'high' }), t({ id: 'a', due: today, order: 1 })],
      today,
      'manual',
    );
    expect(groups[0].tasks.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('moveTask', () => {
  it('swaps order with neighbour and ignores edges', () => {
    const list = [t({ id: 'a', order: 1 }), t({ id: 'b', order: 2 }), t({ id: 'c', order: 3 })];
    const moved = moveTask(list, 'c', -1);
    expect(moved.find((x) => x.id === 'c')!.order).toBe(2);
    expect(moved.find((x) => x.id === 'b')!.order).toBe(3);
    expect(moveTask(list, 'a', -1)).toBe(list);
  });
});
