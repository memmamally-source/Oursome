import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Member, Space } from '@/features/types';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';
import { accentKeys, type AccentKey } from '@/theme/tokens';

/** Local id for the signed-in user until Firebase uids arrive in Stage 2. */
export const ME_ID = 'me';
/** Stable empty list for selectors, so components don't re-render in a loop with no space. */
export const NO_MEMBERS: Member[] = [];

type SpaceState = {
  space: Space | null;
  createSpace: (name: string, me: { name: string; color: AccentKey }) => Space;
  renameSpace: (name: string) => void;
  addAnnouncement: (text: string) => void;
  removeAnnouncement: (id: string) => void;
  togglePin: (id: string) => void;
  setMemberColor: (memberId: string, color: AccentKey) => void;
  syncMe: (me: { name: string; color: AccentKey }) => void;
  addPerson: (person: { name: string; relationship?: string; color?: AccentKey }) => Member;
  updatePerson: (id: string, patch: Partial<Pick<Member, 'name' | 'relationship' | 'aliases' | 'color' | 'invitePending'>>) => void;
  removePerson: (id: string) => void;
  leaveSpace: () => void;
  replace: (space: Space | null) => void;
  clearDemo: () => void;
};

export const useSpace = create<SpaceState>()(
  persist(
    (set, get) => ({
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
      addPerson: ({ name, relationship, color }) => {
        const existing = get().space;
        const used = new Set(existing?.members.map((m) => m.color));
        const person: Member = {
          id: createId('p_'),
          name: name.trim(),
          color: color ?? accentKeys.find((a) => !used.has(a)) ?? accentKeys[(existing?.members.length ?? 0) % accentKeys.length],
          role: 'member',
          kind: 'person',
          relationship: relationship?.trim().toLowerCase() || undefined,
        };
        set((s) => {
          const space = s.space ?? {
            id: createId('s_'),
            name: 'Our Home',
            members: [{ id: ME_ID, name: 'You', color: 'coral' as AccentKey, role: 'admin' as const, isMe: true }],
            announcements: [],
            createdAt: new Date().toISOString(),
          };
          return { space: { ...space, members: [...space.members, person] } };
        });
        return person;
      },
      updatePerson: (id, patch) =>
        set((s) =>
          s.space
            ? {
                space: {
                  ...s.space,
                  members: s.space.members.map((m) =>
                    m.id === id
                      ? { ...m, ...patch, relationship: patch.relationship !== undefined ? patch.relationship.trim().toLowerCase() || undefined : m.relationship }
                      : m,
                  ),
                },
              }
            : s,
        ),
      removePerson: (id) =>
        set((s) => (s.space ? { space: { ...s.space, members: s.space.members.filter((m) => m.id !== id || m.isMe) } } : s)),
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
