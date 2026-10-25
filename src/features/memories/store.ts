import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { recordActivity } from '@/features/activity/store';
import { withFamily } from '@/features/space/store';
import type { Visibility } from '@/features/types';
import { createId } from '@/lib/id';
import type { DateKey } from '@/lib/dates';
import { deletePhoto } from '@/lib/photoStore';
import { persistStorage } from '@/lib/storage';

export type MemoryKind = 'memory' | 'milestone' | 'note';

/**
 * A page in the household journal: a moment, a milestone or a note, with an
 * optional photo (stored separately, see lib/photoStore). Private unless
 * the author shares it with their family.
 */
export type Memory = {
  id: string;
  title: string;
  body?: string;
  date: DateKey;
  kind: MemoryKind;
  photoId?: string;
  visibility: Visibility;
  spaceId?: string;
  authorId: string;
  createdAt: string;
};

type MemoriesState = {
  memories: Memory[];
  addMemory: (m: Omit<Memory, 'id' | 'createdAt' | 'authorId'>) => Memory;
  updateMemory: (id: string, patch: Partial<Omit<Memory, 'id' | 'createdAt'>>) => void;
  removeMemory: (id: string) => void;
  restoreMemory: (m: Memory) => void;
};

export const useMemories = create<MemoriesState>()(
  persist(
    (set, get) => ({
      memories: [],
      addMemory: (input) => {
        const memory: Memory = withFamily({ ...input, id: createId('m_'), createdAt: new Date().toISOString(), authorId: 'me' });
        set((s) => ({ memories: [...s.memories, memory] }));
        recordActivity('memory', `added “${memory.title}” to the journal`);
        return memory;
      },
      updateMemory: (id, patch) => set((s) => ({ memories: s.memories.map((m) => (m.id === id ? withFamily({ ...m, ...patch }) : m)) })),
      removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      restoreMemory: (m) => set((s) => (s.memories.some((x) => x.id === m.id) ? s : { memories: [...s.memories, m] })),
    }),
    { name: 'oursome.memories', version: 1, storage: persistStorage },
  ),
);

/** Remove a memory and, once it can't be undone any more, its photo. */
export function forgetPhotoLater(photoId: string | undefined, stillUsed: () => boolean, delayMs = 8000) {
  if (!photoId) return;
  setTimeout(() => {
    if (!stillUsed()) deletePhoto(photoId).catch(() => {});
  }, delayMs);
}

export const useMemoryById = (id: string) => useMemories((s) => s.memories.find((m) => m.id === id));
