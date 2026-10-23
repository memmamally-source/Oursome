import { nextOccurrence } from '@/features/calendar/recurrence';
import type { Category, Priority, Task } from '@/features/types';
import { addDays, fromDateKey, toDateKey, type DateKey } from '@/lib/dates';
import { createId } from '@/lib/id';

export const defaultCategories: Category[] = [
  { id: 'personal', name: 'Personal', color: 'lavender', icon: 'person-outline', builtIn: true },
  { id: 'family', name: 'Family', color: 'sunshine', icon: 'people-outline', builtIn: true },
  { id: 'home', name: 'Home', color: 'coral', icon: 'home-outline', builtIn: true },
  { id: 'work', name: 'Work', color: 'sky', icon: 'briefcase-outline', builtIn: true },
  { id: 'shopping', name: 'Shopping', color: 'mint', icon: 'basket-outline', builtIn: true },
  { id: 'health', name: 'Health', color: 'mint', icon: 'heart-outline', builtIn: true },
  { id: 'finance', name: 'Finance', color: 'sky', icon: 'wallet-outline', builtIn: true },
  { id: 'other', name: 'Other', color: 'lavender', icon: 'ellipsis-horizontal-circle-outline', builtIn: true },
];

const priorityWeight: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Completing a recurring task records the completion and creates the next
 * instance, so history is preserved and the series continues.
 */
export function completeTask(task: Task, now = new Date()): { completed: Task; next?: Task } {
  const completed: Task = { ...task, completedAt: now.toISOString() };
  if (!task.recurrence || !task.due) return { completed };
  const nextDue = nextOccurrence(task.due, task.recurrence, task.due);
  if (!nextDue) return { completed };
  return {
    completed: { ...completed, recurrence: null },
    next: {
      ...task,
      id: createId('t_'),
      due: nextDue,
      completedAt: undefined,
      createdAt: now.toISOString(),
      subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
    },
  };
}

export function isOverdue(task: Task, today: DateKey): boolean {
  return !task.completedAt && !!task.due && task.due < today;
}

export function compareTasks(a: Task, b: Task): number {
  const dueA = a.due ?? '9999-12-31';
  const dueB = b.due ?? '9999-12-31';
  if (dueA !== dueB) return dueA.localeCompare(dueB);
  if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  }
  const timeA = a.dueTime ?? '99:99';
  const timeB = b.dueTime ?? '99:99';
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  return a.order - b.order;
}

/** The three most important open tasks for today's dashboard. */
export function pickPriorities(tasks: Task[], today: DateKey, count = 3): Task[] {
  const open = tasks.filter((t) => !t.completedAt && !t.isReminder);
  const score = (t: Task) => {
    if (t.due && t.due < today) return 0; // overdue first
    if (t.due === today) return 1 + priorityWeight[t.priority] / 10;
    if (t.priority === 'high' && t.due && t.due <= toDateKey(addDays(fromDateKey(today), 2))) return 2;
    if (!t.due && t.priority === 'high') return 3;
    return 9;
  };
  return open
    .filter((t) => score(t) < 9)
    .sort((a, b) => score(a) - score(b) || compareTasks(a, b))
    .slice(0, count);
}

export type TaskGroupKey = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'someday';

export const taskGroupLabels: Record<TaskGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  upcoming: 'Coming up',
  someday: 'Anytime',
};

export type TaskSortMode = 'smart' | 'manual';

export function groupOpenTasks(tasks: Task[], today: DateKey, mode: TaskSortMode = 'smart'): { key: TaskGroupKey; tasks: Task[] }[] {
  const tomorrow = toDateKey(addDays(fromDateKey(today), 1));
  const groups: Record<TaskGroupKey, Task[]> = { overdue: [], today: [], tomorrow: [], upcoming: [], someday: [] };
  for (const t of tasks) {
    if (t.completedAt) continue;
    if (!t.due) groups.someday.push(t);
    else if (t.due < today) groups.overdue.push(t);
    else if (t.due === today) groups.today.push(t);
    else if (t.due === tomorrow) groups.tomorrow.push(t);
    else groups.upcoming.push(t);
  }
  const ordered: TaskGroupKey[] = ['overdue', 'today', 'tomorrow', 'upcoming', 'someday'];
  return ordered
    .map((key) => ({
      key,
      tasks: groups[key].sort(mode === 'manual' ? (a, b) => a.order - b.order : compareTasks),
    }))
    .filter((g) => g.tasks.length > 0);
}

/** Swap a task's manual order with its neighbour within a list. */
export function moveTask(list: Task[], id: string, direction: -1 | 1): Task[] {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((t) => t.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return list;
  const a = sorted[index];
  const b = sorted[target];
  const updates = new Map([
    [a.id, b.order],
    [b.id, a.order],
  ]);
  return list.map((t) => (updates.has(t.id) ? { ...t, order: updates.get(t.id)! } : t));
}
