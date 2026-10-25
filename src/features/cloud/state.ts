import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

export type CloudStatus = 'off' | 'signed-out' | 'connecting' | 'live' | 'offline';

type CloudState = {
  status: CloudStatus;
  message?: string;
  /** Per family: what each item looked like when last synced (see mapping.mergeRemote). */
  synced: Record<string, Record<string, string>>;
  /** The latest invite code made on this device, per family. */
  invites: Record<string, { code: string; expiresAt: string }>;
  setStatus: (status: CloudStatus, message?: string) => void;
  syncedFor: (spaceId: string) => Map<string, string>;
  setSynced: (spaceId: string, synced: Map<string, string>) => void;
  setInvite: (spaceId: string, invite: { code: string; expiresAt: string }) => void;
};

/** Cloud sharing status for the screens, and the sync bookkeeping that must survive a reload. */
export const useCloud = create<CloudState>()(
  persist(
    (set, get) => ({
      status: 'off',
      synced: {},
      invites: {},
      setStatus: (status, message) => set({ status, message }),
      syncedFor: (spaceId) => new Map(Object.entries(get().synced[spaceId] ?? {})),
      setSynced: (spaceId, synced) => set((s) => ({ synced: { ...s.synced, [spaceId]: Object.fromEntries(synced) } })),
      setInvite: (spaceId, invite) => set((s) => ({ invites: { ...s.invites, [spaceId]: invite } })),
    }),
    { name: 'oursome.cloud', version: 1, storage: persistStorage, partialize: (s) => ({ synced: s.synced, invites: s.invites }) },
  ),
);
