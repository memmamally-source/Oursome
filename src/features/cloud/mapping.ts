import type { Memory } from '@/features/memories/store';
import { belongsTo } from '@/features/space/families';
import type { Announcement, CalendarEvent, Member, ShoppingItem, ShoppingList, Space, Task } from '@/features/types';

/**
 * What a family shares, in the shape stored in the cloud, and how cloud
 * changes merge back into this device. Pure: no Firebase here, so it's
 * fully unit-tested (see __tests__/mapping.test.ts).
 *
 * On this device "me" is always the id "me"; in the cloud it's the account
 * id (uid), so the same task is "mine" on my phone and "Alex's" on yours.
 */

export type CloudKind = 'task' | 'event' | 'list' | 'listItem' | 'memory' | 'announcement' | 'person';
export type CloudItem = { id: string; kind: CloudKind; data: Record<string, unknown> };

export type LocalState = {
  tasks: Task[];
  events: CalendarEvent[];
  lists: ShoppingList[];
  items: ShoppingItem[];
  memories: Memory[];
  spaces: Space[];
};

const ME = 'me';
const PERSON_KEYS = ['assigneeId', 'personId', 'addedBy', 'authorId'] as const;
/** Kept on this device only. */
const LOCAL_ONLY = new Set(['spaceId', 'isDemo', 'photoId', 'visibility']);

function swapIds(data: Record<string, unknown>, from: string, to: string): Record<string, unknown> {
  const out = { ...data };
  for (const k of PERSON_KEYS) if (out[k] === from) out[k] = to;
  if (Array.isArray(out.participantIds)) out.participantIds = (out.participantIds as string[]).map((x) => (x === from ? to : x));
  return out;
}

/** Firestore can't store `undefined`; drop it (deeply). */
export function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = clean(v);
    return out;
  }
  return value;
}

export function toCloud(kind: CloudKind, item: { id: string } & object, uid: string): CloudItem {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) if (!LOCAL_ONLY.has(k) && k !== 'id') data[k] = v;
  return { id: item.id, kind, data: clean(swapIds(data, ME, uid)) as Record<string, unknown> };
}

export function fromCloud<T>(item: CloudItem, uid: string, spaceId: string): T {
  const data = swapIds(item.data, uid, ME);
  const shared =
    item.kind === 'announcement' || item.kind === 'person' || item.kind === 'listItem' ? {} : { visibility: 'shared', spaceId };
  return { ...data, ...shared, id: item.id } as T;
}

/** Everything a family shares, keyed by id. */
export function collectShared(state: LocalState, spaceId: string, uid: string): Map<string, CloudItem> {
  const { spaces } = state;
  const space = spaces.find((s) => s.id === spaceId);
  const out = new Map<string, CloudItem>();
  const put = (c: CloudItem) => out.set(c.id, c);
  const mine = <T extends { visibility: Task['visibility']; spaceId?: string; isDemo?: boolean }>(x: T) =>
    !x.isDemo && belongsTo(x, spaceId, spaces);
  state.tasks.filter(mine).forEach((t) => put(toCloud('task', t, uid)));
  state.events.filter((e) => mine(e) && !e.taskId).forEach((e) => put(toCloud('event', e, uid)));
  const lists = state.lists.filter(mine);
  lists.forEach((l) => put(toCloud('list', l, uid)));
  const listIds = new Set(lists.map((l) => l.id));
  state.items.filter((i) => listIds.has(i.listId)).forEach((i) => put(toCloud('listItem', i, uid)));
  state.memories.filter(mine).forEach((m) => put(toCloud('memory', m, uid)));
  space?.announcements.forEach((a) => put(toCloud('announcement', a, uid)));
  space?.members.filter((m) => m.kind === 'person' && !m.isMe).forEach((m) => put(toCloud('person', m, uid)));
  return out;
}

/** A stable fingerprint of an item's content, to notice changes. */
export function fingerprint(c: CloudItem): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
          )
        : v;
  return `${c.kind}:${JSON.stringify(sort(c.data))}`;
}

/** What to send: new or changed items, and items removed here since the last sync. */
export function diffUpload(current: Map<string, CloudItem>, synced: Map<string, string>): { put: CloudItem[]; remove: string[] } {
  const put: CloudItem[] = [];
  for (const [id, c] of current) if (synced.get(id) !== fingerprint(c)) put.push(c);
  const remove = [...synced.keys()].filter((id) => !current.has(id));
  return { put, remove };
}

/**
 * Merge the cloud's copy of a family into this device's copy.
 * - A local edit not yet uploaded (it differs from what was last synced) wins for now.
 * - Something new here that hasn't been uploaded yet stays.
 * - Something synced before but now gone from the cloud was removed elsewhere: it goes.
 * Returns the family's items as they should be, and the new sync fingerprints.
 */
export function mergeRemote(
  local: Map<string, CloudItem>,
  remote: Map<string, CloudItem>,
  synced: Map<string, string>,
): { items: Map<string, CloudItem>; synced: Map<string, string> } {
  const items = new Map<string, CloudItem>();
  const nextSynced = new Map<string, string>();
  for (const [id, r] of remote) {
    const l = local.get(id);
    const dirty = !!l && synced.get(id) !== fingerprint(l) && fingerprint(l) !== fingerprint(r);
    items.set(id, dirty ? l! : r);
    nextSynced.set(id, fingerprint(r));
  }
  for (const [id, l] of local) {
    if (remote.has(id)) continue;
    if (!synced.has(id)) items.set(id, l); // new here, not uploaded yet
  }
  return { items, synced: nextSynced };
}

/** Put a family's merged items back into the local stores, leaving everything else untouched. */
export function applyFamily(state: LocalState, spaceId: string, family: Map<string, CloudItem>, uid: string): LocalState {
  const { spaces } = state;
  const of = (kind: CloudKind) => [...family.values()].filter((c) => c.kind === kind);
  const notFamily = <T extends { visibility: Task['visibility']; spaceId?: string; isDemo?: boolean }>(x: T) =>
    x.isDemo || !belongsTo(x, spaceId, spaces);
  const photoOf = new Map(state.memories.map((m) => [m.id, m.photoId]));

  const lists = [...state.lists.filter(notFamily), ...of('list').map((c) => fromCloud<ShoppingList>(c, uid, spaceId))];
  const familyListIds = new Set(state.lists.filter((l) => !notFamily(l)).map((l) => l.id));
  for (const c of of('list')) familyListIds.add(c.id);

  return {
    ...state,
    tasks: [...state.tasks.filter(notFamily), ...of('task').map((c) => fromCloud<Task>(c, uid, spaceId))],
    events: [
      ...state.events.filter((e) => notFamily(e) || !!e.taskId),
      ...of('event').map((c) => fromCloud<CalendarEvent>(c, uid, spaceId)),
    ],
    lists,
    items: [
      ...state.items.filter((i) => !familyListIds.has(i.listId)),
      ...of('listItem').map((c) => fromCloud<ShoppingItem>(c, uid, spaceId)),
    ],
    memories: [
      ...state.memories.filter(notFamily),
      ...of('memory').map((c) => {
        const m = fromCloud<Memory>(c, uid, spaceId);
        return photoOf.get(m.id) ? { ...m, photoId: photoOf.get(m.id) } : m;
      }),
    ],
    spaces: spaces.map((s) =>
      s.id !== spaceId
        ? s
        : {
            ...s,
            announcements: of('announcement').map((c) => fromCloud<Announcement>(c, uid, spaceId)),
            members: [
              ...s.members.filter((m) => m.kind !== 'person' || m.isMe),
              ...of('person').map((c) => fromCloud<Member>(c, uid, spaceId)),
            ],
          },
    ),
  };
}

/** Account members from the cloud, with "me" for this account. People without accounts are kept. */
export function mergeAccounts(
  space: Space,
  accounts: { uid: string; name: string; color: Member['color']; role: Member['role'] }[],
  uid: string,
): Member[] {
  const people = space.members.filter((m) => m.kind === 'person' && !m.isMe);
  const me = space.members.find((m) => m.isMe);
  const fromCloudMembers: Member[] = accounts.map((a) =>
    a.uid === uid
      ? { ...(me ?? { id: ME, name: a.name, color: a.color }), id: ME, isMe: true, role: a.role, kind: 'account' }
      : { id: a.uid, name: a.name, color: a.color, role: a.role, kind: 'account' },
  );
  if (!fromCloudMembers.some((m) => m.isMe) && me) fromCloudMembers.unshift(me);
  return [...fromCloudMembers, ...people];
}

/** Invite codes: 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L). */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function inviteCode(random: (n: number) => Uint8Array): string {
  return [...random(10)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const formatCode = (code: string) => `${code.slice(0, 5)}-${code.slice(5)}`;
export const parseCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');
