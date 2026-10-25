import type { Firestore } from 'firebase/firestore';

import { useCalendar } from '@/features/calendar/store';
import { useMemories } from '@/features/memories/store';
import { useSession } from '@/features/session/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { CalendarSource, Space } from '@/features/types';
import { accentKeys } from '@/theme/tokens';

import * as api from './api';
import { watchAuth } from './auth';
import { firebase } from './firebase';
import {
  applyFamily,
  collectShared,
  diffUpload,
  fingerprint,
  mergeAccounts,
  mergeRemote,
  type CloudItem,
  type LocalState,
} from './mapping';
import { useCloud } from './state';

/**
 * Keeps families that are shared through the cloud in step on every device.
 * - Cloud → device: live listeners merge changes into the local stores.
 * - Device → cloud: store changes are diffed against what was last synced
 *   and uploaded shortly after (unsent edits are never overwritten).
 * Private items never leave the device. Loaded only when cloud is configured.
 */

let db: Firestore;
let uid: string | null = null;
let applying = false;
const watchers = new Map<string, (() => void)[]>();
let unsubscribeStores: (() => void) | null = null;
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let uploading = false;
/** Families whose cloud copy has arrived since this launch (uploads wait for it). */
const downloaded = new Set<string>();

const linked = () => useSpace.getState().spaces.filter((s) => s.cloudId);

function snapshot(): LocalState {
  return {
    tasks: useTasks.getState().tasks,
    events: useCalendar.getState().events,
    lists: useShopping.getState().lists,
    items: useShopping.getState().items,
    memories: useMemories.getState().memories,
    spaces: useSpace.getState().spaces,
  };
}

function writeBack(next: LocalState, prev: LocalState) {
  applying = true;
  try {
    if (next.tasks !== prev.tasks) useTasks.setState({ tasks: next.tasks });
    if (next.events !== prev.events) useCalendar.setState({ events: next.events });
    if (next.lists !== prev.lists || next.items !== prev.items) useShopping.setState({ lists: next.lists, items: next.items });
    if (next.memories !== prev.memories) useMemories.setState({ memories: next.memories });
    if (next.spaces !== prev.spaces) useSpace.getState().setSpaces(next.spaces);
  } finally {
    applying = false;
  }
}

/** Shared events may use a family calendar this device hasn't seen yet. */
function ensureCalendars(space: Space) {
  const { calendars, events } = useCalendar.getState();
  const known = new Set(calendars.map((c) => c.id));
  const missing = [...new Set(events.filter((e) => e.spaceId === space.id && !known.has(e.calendarId)).map((e) => e.calendarId))];
  if (!missing.length) return;
  const added: CalendarSource[] = missing.map((id) => ({ id, name: space.name, color: 'sunshine', kind: 'shared', visible: true }));
  applying = true;
  useCalendar.setState({ calendars: [...calendars, ...added] });
  applying = false;
}

function onRemoteItems(spaceId: string, remote: Map<string, CloudItem>) {
  if (!uid) return;
  const prev = snapshot();
  const local = collectShared(prev, spaceId, uid);
  const merged = mergeRemote(local, remote, useCloud.getState().syncedFor(spaceId));
  // Nothing changed here: skip the write so screens don't re-render.
  const same =
    merged.items.size === local.size &&
    [...merged.items].every(([id, c]) => local.has(id) && fingerprint(local.get(id)!) === fingerprint(c));
  if (!same) writeBack(applyFamily(prev, spaceId, merged.items, uid), prev);
  useCloud.getState().setSynced(spaceId, merged.synced);
  downloaded.add(spaceId);
  const space = useSpace.getState().spaces.find((s) => s.id === spaceId);
  if (space) ensureCalendars(space);
  useCloud.getState().setStatus('live');
  scheduleUpload();
}

function attach(space: Space) {
  if (!uid || watchers.has(space.id)) return;
  const hid = space.cloudId!;
  const fail = (e: Error) => {
    // Lost access (removed from the family, or the household was deleted): stop syncing it, keep the local copy.
    if ((e as { code?: string }).code === 'permission-denied') {
      detach(space.id);
      useSpace.getState().linkCloud(space.id, undefined);
      useCloud.getState().setStatus('live', `You’re no longer sharing “${space.name}”. Your copy stays on this device.`);
      return;
    }
    useCloud.getState().setStatus('offline', 'Can’t reach the cloud right now. Changes are saved here and sync when you’re back online.');
  };
  watchers.set(space.id, [
    api.watchItems(db, hid, (items) => onRemoteItems(space.id, items), fail),
    api.watchMembers(
      db,
      hid,
      (accounts) => {
        const s = useSpace.getState().spaces.find((x) => x.id === space.id);
        if (!s || !uid) return;
        // Whoever joined later picks a colour nobody else in the family uses, so avatars are easy to tell apart.
        const mine = accounts.find((a) => a.uid === uid);
        if (mine?.role === 'member' && accounts.some((a) => a.uid !== uid && a.color === mine.color)) {
          const free = accentKeys.find((c) => !accounts.some((a) => a.color === c));
          if (free) {
            useSession.getState().updateProfile({ color: free });
            useSpace.getState().syncMe({ name: mine.name, color: free });
            void api.updateMe(db, uid, hid, { name: mine.name, color: free }).catch(() => {});
            return;
          }
        }
        const members = mergeAccounts(s, accounts, uid);
        if (JSON.stringify(members) === JSON.stringify(s.members)) return;
        applying = true;
        useSpace.getState().setSpaces(useSpace.getState().spaces.map((x) => (x.id === s.id ? { ...x, members } : x)));
        applying = false;
      },
      fail,
    ),
    api.watchHousehold(
      db,
      hid,
      (h) => {
        const s = useSpace.getState().spaces.find((x) => x.id === space.id);
        if (!h || !s || (s.name === h.name && s.motto === h.motto && s.cover === h.cover)) return;
        applying = true;
        useSpace
          .getState()
          .setSpaces(useSpace.getState().spaces.map((x) => (x.id === s.id ? { ...x, name: h.name, motto: h.motto, cover: h.cover } : x)));
        applying = false;
        lastInfo.set(s.id, infoKey({ ...s, ...h }));
      },
      fail,
    ),
  ]);
}

function detach(spaceId: string) {
  watchers.get(spaceId)?.forEach((u) => u());
  watchers.delete(spaceId);
  downloaded.delete(spaceId);
}

const lastInfo = new Map<string, string>();
const infoKey = (s: Pick<Space, 'name' | 'motto' | 'cover'>) => JSON.stringify([s.name, s.motto ?? '', s.cover ?? '']);

function scheduleUpload() {
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => void upload(), 400);
}

async function upload() {
  if (!uid || uploading) return scheduleUpload();
  uploading = true;
  try {
    for (const space of linked()) {
      // Only after the first download, so nothing deleted elsewhere is re-uploaded.
      if (!watchers.has(space.id) || !downloaded.has(space.id)) continue;
      const hid = space.cloudId!;
      const synced = new Map(useCloud.getState().syncedFor(space.id));
      const { put, remove } = diffUpload(collectShared(snapshot(), space.id, uid), synced);
      for (const item of put) {
        await api.putItem(db, uid, hid, item);
        synced.set(item.id, fingerprint(item));
      }
      for (const id of remove) {
        await api.removeItem(db, hid, id);
        synced.delete(id);
      }
      if (put.length || remove.length) useCloud.getState().setSynced(space.id, synced);
      const key = infoKey(space);
      if (lastInfo.get(space.id) !== key) {
        await api.updateHousehold(db, hid, { name: space.name, motto: space.motto, cover: space.cover });
        lastInfo.set(space.id, key);
      }
    }
  } catch {
    useCloud.getState().setStatus('offline', 'Some changes haven’t synced yet. They’re saved here and will retry.');
    setTimeout(scheduleUpload, 5000);
  } finally {
    uploading = false;
  }
}

function syncAll() {
  for (const s of linked()) attach(s);
  for (const id of [...watchers.keys()]) if (!linked().some((s) => s.id === id)) detach(id);
}

function onStoresChanged() {
  if (applying || !uid) return;
  syncAll();
  scheduleUpload();
}

let started = false;
let markAuthReady: () => void = () => {};
/** Resolves once Firebase has restored (or ruled out) the signed-in account after launch. */
const authReady = new Promise<void>((resolve) => (markAuthReady = resolve));

/** Start once at launch (cloud configured only). */
export function startCloud() {
  if (started) return;
  started = true;
  db = firebase().db;
  watchAuth((next) => {
    uid = next;
    markAuthReady();
    unsubscribeStores?.();
    unsubscribeStores = null;
    for (const id of [...watchers.keys()]) detach(id);
    if (!uid) {
      useCloud.getState().setStatus('signed-out');
      return;
    }
    useCloud.getState().setStatus(linked().length ? 'connecting' : 'live');
    const subs = [useTasks, useCalendar, useShopping, useMemories, useSpace].map((store) =>
      (store as unknown as { subscribe: (fn: () => void) => () => void }).subscribe(onStoresChanged),
    );
    unsubscribeStores = () => subs.forEach((u) => u());
    syncAll();
  });
}

async function requireUser(): Promise<string> {
  startCloud();
  await authReady;
  if (!uid) throw new Error('Sign in with your cloud account first.');
  return uid;
}

const meFor = () => {
  const p = useSession.getState().profile;
  return { name: p?.name ?? 'Me', color: p?.color ?? 'coral' };
};

/** Share a family through the cloud. Everything already shared with it is uploaded; nothing local is removed. */
export async function shareFamily(spaceId: string): Promise<void> {
  const me = await requireUser();
  const space = useSpace.getState().spaces.find((s) => s.id === spaceId);
  if (!space) return;
  await api.createHousehold(db, me, space.id, { name: space.name, motto: space.motto, cover: space.cover }, meFor());
  lastInfo.set(space.id, infoKey(space));
  useCloud.getState().setSynced(space.id, new Map());
  useSpace.getState().linkCloud(space.id, space.id);
}

export async function inviteToFamily(spaceId: string): Promise<{ code: string; expiresAt: Date }> {
  const me = await requireUser();
  const space = useSpace.getState().spaces.find((s) => s.id === spaceId);
  if (!space?.cloudId) throw new Error('Share this family first.');
  const invite = await api.createInvite(db, me, space.cloudId);
  useCloud.getState().setInvite(spaceId, { code: invite.code, expiresAt: invite.expiresAt.toISOString() });
  return invite;
}

export async function joinFamily(code: string): Promise<string> {
  const me = await requireUser();
  const { id, info } = await api.joinHousehold(db, me, code, meFor());
  const profile = meFor();
  useCloud.getState().setSynced(id, new Map());
  useSpace.getState().addCloudSpace({
    id,
    cloudId: id,
    name: info.name,
    motto: info.motto,
    cover: info.cover,
    members: [{ id: 'me', name: profile.name, color: profile.color, role: 'member', isMe: true, kind: 'account' }],
    announcements: [],
    createdAt: new Date().toISOString(),
  });
  lastInfo.set(id, infoKey(info));
  return info.name;
}

/** Stop sharing a family on this account. The family and its items stay on this device. */
export async function leaveFamily(spaceId: string): Promise<void> {
  const me = await requireUser();
  const space = useSpace.getState().spaces.find((s) => s.id === spaceId);
  if (!space?.cloudId) return;
  detach(spaceId);
  await api.leaveHousehold(db, me, space.cloudId);
  useSpace.getState().linkCloud(spaceId, undefined);
  useCloud.getState().setSynced(spaceId, new Map());
}
