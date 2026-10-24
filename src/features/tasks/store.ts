import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Category, Task } from '@/features/types';
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
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  move: (id: string, direction: -1 | 1, scopeIds: string[]) => void;
  addCategory: (category: Omit<Category, 'id'>) => Category;
  replaceAll: (tasks: Task[]) => void;
  clearDemo: () => void;
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
      clearDemo: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.isDemo) })),
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
