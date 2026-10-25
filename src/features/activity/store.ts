import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';

/**
 * Recent shared activity shown on Home ("Alex added Milk to Groceries").
 * Local for now; with cloud sharing each member's actions arrive here too.
 * Only short descriptions are kept, the newest 40.
 */
export type ActivityKind = 'task' | 'done' | 'event' | 'shopping' | 'person' | 'memory';

export type Activity = { id: string; at: string; kind: ActivityKind; text: string; actorId: string };

type ActivityState = {
  items: Activity[];
  record: (kind: ActivityKind, text: string, actorId?: string) => void;
  clear: () => void;
};

export const MAX_ACTIVITY = 40;

export const useActivity = create<ActivityState>()(
  persist(
    (set) => ({
      items: [],
      record: (kind, text, actorId = 'me') =>
        set((s) => ({ items: [{ id: createId('ac_'), at: new Date().toISOString(), kind, text: text.slice(0, 140), actorId }, ...s.items].slice(0, MAX_ACTIVITY) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'oursome.activity', version: 1, storage: persistStorage },
  ),
);

/** Record from anywhere without importing React. */
export const recordActivity = (kind: ActivityKind, text: string) => useActivity.getState().record(kind, text);
