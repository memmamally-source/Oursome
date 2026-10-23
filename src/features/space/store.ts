import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Member, Space } from '@/features/types';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';
import type { AccentKey } from '@/theme/tokens';

/** Local id for the signed-in user until Firebase uids arrive in Stage 2. */
export const ME_ID = 'me';

type SpaceState = {
  space: Space | null;
  createSpace: (name: string, me: { name: string; color: AccentKey }) => Space;
  renameSpace: (name: string) => void;
  addAnnouncement: (text: string) => void;
  removeAnnouncement: (id: string) => void;
  togglePin: (id: string) => void;
  setMemberColor: (memberId: string, color: AccentKey) => void;
  syncMe: (me: { name: string; color: AccentKey }) => void;
  leaveSpace: () => void;
  replace: (space: Space | null) => void;
  clearDemo: () => void;
};

export const useSpace = create<SpaceState>()(
  persist(
    (set) => ({
      space: null,
      createSpace: (name, me) => {
        const space: Space = {
          id: createId('s_'),
          name: name.trim() || 'Our Space',
          members: [{ id: ME_ID, name: me.name, color: me.color, role: 'admin', isMe: true }],
          announcements: [],
          createdAt: new Date().toISOString(),
        };
        set({ space });
        return space;
      },
      renameSpace: (name) => set((s) => (s.space ? { space: { ...s.space, name } } : s)),
      addAnnouncement: (text) =>
        set((s) =>
          s.space
            ? {
                space: {
                  ...s.space,
                  announcements: [
                    { id: createId('a_'), text: text.trim(), authorId: ME_ID, createdAt: new Date().toISOString() },
                    ...s.space.announcements,
                  ],
                },
              }
            : s,
        ),
      removeAnnouncement: (id) =>
        set((s) => (s.space ? { space: { ...s.space, announcements: s.space.announcements.filter((a) => a.id !== id) } } : s)),
      togglePin: (id) =>
        set((s) =>
          s.space
            ? {
                space: {
                  ...s.space,
                  announcements: s.space.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)),
                },
              }
            : s,
        ),
      setMemberColor: (memberId, color) =>
        set((s) =>
          s.space ? { space: { ...s.space, members: s.space.members.map((m) => (m.id === memberId ? { ...m, color } : m)) } } : s,
        ),
      syncMe: (me) =>
        set((s) => (s.space ? { space: { ...s.space, members: s.space.members.map((m) => (m.isMe ? { ...m, ...me } : m)) } } : s)),
      leaveSpace: () => set({ space: null }),
      replace: (space) => set({ space }),
      clearDemo: () => set((s) => (s.space?.isDemo ? { space: null } : s)),
    }),
    { name: 'oursome.space', version: STORE_VERSION, storage: persistStorage },
  ),
);

export function memberById(space: Space | null, id?: string): Member | undefined {
  if (!space || !id) return undefined;
  return space.members.find((m) => m.id === id);
}
