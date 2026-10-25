import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Member, Space, Visibility } from '@/features/types';
import { createId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { accentKeys, type AccentKey } from '@/theme/tokens';

import { recordActivity } from '@/features/activity/store';

import { allPeople, migrateSpaces } from './families';

/** Local id for the signed-in user until Firebase uids arrive in Stage 2. */
export const ME_ID = 'me';
/** Stable empty list for selectors, so components don't re-render in a loop with no space. */
export const NO_MEMBERS: Member[] = [];

type SpaceState = {
  /** Every family the user belongs to. */
  spaces: Space[];
  activeId: string | null;
  /** The family shown in Our Space (derived from spaces + activeId). */
  space: Space | null;
  /** Everyone across all families, each once, the user first (derived). */
  people: Member[];
  createSpace: (name: string, me: { name: string; color: AccentKey }) => Space;
  switchSpace: (id: string) => void;
  renameSpace: (name: string) => void;
  /** Personalise the family being viewed: name, motto, cover scene or photo. */
  updateHousehold: (patch: Partial<Pick<Space, 'name' | 'motto' | 'cover' | 'photo'>>) => void;
  addAnnouncement: (text: string) => void;
  removeAnnouncement: (id: string) => void;
  togglePin: (id: string) => void;
  setMemberColor: (memberId: string, color: AccentKey) => void;
  syncMe: (me: { name: string; color: AccentKey }) => void;
  /** Adds a person to the active family (creating "Our Home" if there is none). */
  addPerson: (person: { name: string; relationship?: string; color?: AccentKey }) => Member;
  updatePerson: (id: string, patch: Partial<Pick<Member, 'name' | 'relationship' | 'aliases' | 'color' | 'invitePending'>>) => void;
  removePerson: (id: string) => void;
  /** Leaves the active family; the next one becomes active. */
  leaveSpace: () => void;
  /** null clears every family (account deletion); a space is added or replaced and made active. */
  replace: (space: Space | null) => void;
  /** Cloud sync: replace families as they now are (keeps the active one). */
  setSpaces: (spaces: Space[]) => void;
  /** Mark a family as shared through the cloud (or no longer). */
  linkCloud: (id: string, cloudId: string | undefined) => void;
  /** A family joined with an invite code. */
  addCloudSpace: (space: Space) => void;
};

/** Recompute the derived fields whenever families change. */
function derive(spaces: Space[], activeId: string | null) {
  const active = spaces.find((s) => s.id === activeId) ?? spaces[0] ?? null;
  return { spaces, activeId: active?.id ?? null, space: active, people: spaces.length ? allPeople(spaces) : NO_MEMBERS };
}

const newSpace = (name: string, me: { name: string; color: AccentKey }): Space => ({
  id: createId('s_'),
  name: name.trim() || 'Our Home',
  members: [{ id: ME_ID, name: me.name, color: me.color, role: 'admin', isMe: true }],
  announcements: [],
  createdAt: new Date().toISOString(),
});

export const useSpace = create<SpaceState>()(
  persist(
    (set, get) => {
      /** Apply a change to the active family only. */
      const updateActive = (fn: (s: Space) => Space) =>
        set((st) => (st.space ? derive(st.spaces.map((s) => (s.id === st.space!.id ? fn(s) : s)), st.activeId) : st));
      /** Apply a change to a person wherever they appear. */
      const updateMembers = (fn: (m: Member) => Member) =>
        set((st) => derive(st.spaces.map((s) => ({ ...s, members: s.members.map(fn) })), st.activeId));

      return {
        ...derive([], null),
        createSpace: (name, me) => {
          const space = newSpace(name, me);
          set((st) => derive([...st.spaces, space], space.id));
          return space;
        },
        switchSpace: (id) => set((st) => derive(st.spaces, id)),
        renameSpace: (name) => updateActive((s) => ({ ...s, name: name.trim() || s.name })),
        updateHousehold: (patch) =>
          updateActive((s) => ({
            ...s,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() || s.name : s.name,
            motto: patch.motto !== undefined ? patch.motto.trim().slice(0, 80) || undefined : s.motto,
          })),
        addAnnouncement: (text) =>
          updateActive((s) => ({
            ...s,
            announcements: [{ id: createId('a_'), text: text.trim(), authorId: ME_ID, createdAt: new Date().toISOString() }, ...s.announcements],
          })),
        removeAnnouncement: (id) => updateActive((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) })),
        togglePin: (id) => updateActive((s) => ({ ...s, announcements: s.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)) })),
        setMemberColor: (memberId, color) => updateMembers((m) => (m.id === memberId ? { ...m, color } : m)),
        syncMe: (me) => updateMembers((m) => (m.isMe ? { ...m, ...me } : m)),
        addPerson: ({ name, relationship, color }) => {
          if (!get().space) set((st) => derive([...st.spaces, newSpace('Our Home', { name: 'You', color: 'coral' })], st.activeId));
          const used = new Set(get().people.map((m) => m.color));
          const person: Member = {
            id: createId('p_'),
            name: name.trim(),
            color: color ?? accentKeys.find((a) => !used.has(a)) ?? accentKeys[get().people.length % accentKeys.length],
            role: 'member',
            kind: 'person',
            relationship: relationship?.trim().toLowerCase() || undefined,
          };
          updateActive((s) => ({ ...s, members: [...s.members, person] }));
          recordActivity('person', `added ${person.name} to ${get().space?.name ?? 'the household'}`);
          return person;
        },
        updatePerson: (id, patch) =>
          updateMembers((m) =>
            m.id === id
              ? { ...m, ...patch, relationship: patch.relationship !== undefined ? patch.relationship.trim().toLowerCase() || undefined : m.relationship }
              : m,
          ),
        removePerson: (id) =>
          set((st) => derive(st.spaces.map((s) => ({ ...s, members: s.members.filter((m) => m.id !== id || m.isMe) })), st.activeId)),
        leaveSpace: () => set((st) => derive(st.spaces.filter((s) => s.id !== st.activeId), null)),
        replace: (space) =>
          set((st) => (space ? derive([...st.spaces.filter((s) => s.id !== space.id), space], space.id) : derive([], null))),
        setSpaces: (spaces) => set((st) => derive(spaces, st.activeId)),
        linkCloud: (id, cloudId) => set((st) => derive(st.spaces.map((s) => (s.id === id ? { ...s, cloudId } : s)), st.activeId)),
        addCloudSpace: (space) => set((st) => derive([...st.spaces.filter((s) => s.id !== space.id), space], space.id)),
      };
    },
    {
      name: 'oursome.space',
      // v1 held a single `space`; v2 holds every family. migrateSpaces keeps all existing data.
      version: 2,
      storage: persistStorage,
      partialize: (st) => ({ spaces: st.spaces, activeId: st.activeId }),
      migrate: (persisted) => migrateSpaces(persisted) as unknown as SpaceState,
      merge: (persisted, current) => {
        const { spaces, activeId } = migrateSpaces(persisted);
        return { ...current, ...derive(spaces, activeId) };
      },
    },
  ),
);

/** A person by id, looked up across every family. */
export function memberById(people: Member[], id?: string): Member | undefined {
  if (!id) return undefined;
  return people.find((m) => m.id === id);
}

/** Shared items remember their family: the active one unless they already have one. */
export function withFamily<T extends { visibility: Visibility; spaceId?: string }>(item: T): T {
  if (item.visibility !== 'shared' || item.spaceId) return item;
  const id = useSpace.getState().activeId;
  return id ? { ...item, spaceId: id } : item;
}
