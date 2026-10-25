import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Category, Task } from '@/features/types';
import { recordActivity } from '@/features/activity/store';
import { withFamily } from '@/features/space/store';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';

import { completeTask, defaultCategories, moveTask } from './logic';

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'order' | 'subtasks'> & {
  subtasks?: Task['subtasks'];
};

type TasksState = {
  tasks: Task[];
  categories: Category[];
  /** Ids completed in this session — drives the celebration and undo. */
  lastCompletedId?: string;
  addTask: (draft: TaskDraft) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  /**
   * Complete a task and return an undo that restores it exactly (including a
   * repeating task's schedule) and removes the next occurrence it created.
   */
  complete: (id: string) => (() => void) | null;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  move: (id: string, direction: -1 | 1, scopeIds: string[]) => void;
  addCategory: (category: Omit<Category, 'id'>) => Category;
  replaceAll: (tasks: Task[]) => void;
  reset: () => void;
};

const nextOrder = (tasks: Task[]) => tasks.reduce((max, t) => Math.max(max, t.order), 0) + 1;

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      categories: defaultCategories,
      addTask: (draft) => {
        const task: Task = withFamily({
          ...draft,
          subtasks: draft.subtasks ?? [],
          id: createId('t_'),
          createdAt: new Date().toISOString(),
          order: nextOrder(get().tasks),
        });
        set((s) => ({ tasks: [...s.tasks, task] }));
        if (!task.isDemo) recordActivity('task', `added “${task.title}”`);
        return task;
      },
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? withFamily({ ...t, ...patch }) : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleComplete: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          if (task.completedAt) {
            return {
              tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedAt: undefined } : t)),
              lastCompletedId: undefined,
            };
          }
          const { completed, next } = completeTask(task);
          const tasks = s.tasks.map((t) => (t.id === id ? completed : t));
          if (next) tasks.push({ ...next, order: nextOrder(tasks) });
          return { tasks, lastCompletedId: id };
        }),
      complete: (id) => {
        const before = get().tasks.find((t) => t.id === id);
        if (!before || before.completedAt) return null;
        const { completed, next } = completeTask(before);
        const nextTask = next ? { ...next, order: nextOrder(get().tasks) } : undefined;
        set((s) => ({ tasks: [...s.tasks.map((t) => (t.id === id ? completed : t)), ...(nextTask ? [nextTask] : [])], lastCompletedId: id }));
        recordActivity('done', `finished “${before.title}”`);
        return () =>
          set((s) => ({
            tasks: s.tasks.filter((t) => t.id !== nextTask?.id).map((t) => (t.id === id ? before : t)),
            lastCompletedId: undefined,
          }));
      },
      toggleSubtask: (taskId, subtaskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st)) } : t,
          ),
        })),
      move: (id, direction, scopeIds) =>
        set((s) => {
          const scope = new Set(scopeIds);
          const moved = moveTask(
            s.tasks.filter((t) => scope.has(t.id)),
            id,
            direction,
          );
          const byId = new Map(moved.map((t) => [t.id, t]));
          return { tasks: s.tasks.map((t) => byId.get(t.id) ?? t) };
        }),
      addCategory: (category) => {
        const created: Category = { ...category, id: createId('c_') };
        set((s) => ({ categories: [...s.categories, created] }));
        return created;
      },
      replaceAll: (tasks) => set({ tasks }),
      reset: () => set({ tasks: [], categories: defaultCategories, lastCompletedId: undefined }),
    }),
    {
      name: 'oursome.tasks',
      version: STORE_VERSION,
      storage: persistStorage,
      partialize: (s) => ({ tasks: s.tasks, categories: s.categories }),
    },
  ),
);
