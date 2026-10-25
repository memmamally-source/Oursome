import { useTasks } from '../store';

describe('completing with undo', () => {
  beforeEach(() => useTasks.getState().replaceAll([]));

  it('undo restores a one-off task', () => {
    const t = useTasks.getState().addTask({ title: 'Pay rent', categoryId: 'home', priority: 'medium', visibility: 'private', due: '2026-10-25' });
    const undo = useTasks.getState().complete(t.id)!;
    expect(useTasks.getState().tasks.find((x) => x.id === t.id)?.completedAt).toBeTruthy();
    undo();
    expect(useTasks.getState().tasks.find((x) => x.id === t.id)?.completedAt).toBeUndefined();
  });

  it('undo on a repeating task restores its schedule and removes the next occurrence', () => {
    const t = useTasks.getState().addTask({
      title: 'Bins out',
      categoryId: 'home',
      priority: 'medium',
      visibility: 'private',
      due: '2026-10-27',
      recurrence: { freq: 'weekly' },
    });
    const undo = useTasks.getState().complete(t.id)!;
    expect(useTasks.getState().tasks).toHaveLength(2);
    undo();
    const tasks = useTasks.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: t.id, due: '2026-10-27', recurrence: { freq: 'weekly' } });
    expect(tasks[0].completedAt).toBeUndefined();
  });

  it('does nothing for an already completed task', () => {
    const t = useTasks.getState().addTask({ title: 'Done', categoryId: 'home', priority: 'medium', visibility: 'private' });
    useTasks.getState().complete(t.id);
    expect(useTasks.getState().complete(t.id)).toBeNull();
  });
});
