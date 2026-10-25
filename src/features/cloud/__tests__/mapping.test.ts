import type { Memory } from '@/features/memories/store';
import type { CalendarEvent, ShoppingItem, ShoppingList, Space, Task } from '@/features/types';

import {
  applyFamily,
  collectShared,
  diffUpload,
  fingerprint,
  formatCode,
  fromCloud,
  inviteCode,
  mergeAccounts,
  mergeRemote,
  parseCode,
  toCloud,
  type CloudItem,
  type LocalState,
} from '../mapping';

const UID = 'uid_alex';
const space: Space = {
  id: 'home',
  name: 'The Riveras',
  members: [
    { id: 'me', name: 'Alex', color: 'coral', role: 'admin', isMe: true, kind: 'account' },
    { id: 'p_sam', name: 'Sam', color: 'mint', role: 'member', kind: 'person', relationship: 'son' },
  ],
  announcements: [{ id: 'a1', text: 'Bins on Tuesday', authorId: 'me', createdAt: '2026-10-01' }],
  createdAt: '2026-01-01',
};
const other: Space = { ...space, id: 'parents', name: 'Mum & Dad', announcements: [], members: [space.members[0]] };

const task = (p: Partial<Task>): Task =>
  ({
    id: 't',
    title: 'Task',
    categoryId: 'home',
    priority: 'medium',
    subtasks: [],
    order: 0,
    visibility: 'shared',
    spaceId: 'home',
    createdAt: '',
    ...p,
  }) as Task;

const state = (): LocalState => ({
  tasks: [
    task({ id: 't1', title: 'Pay the electricity bill', assigneeId: 'me' }),
    task({ id: 't2', title: 'Private thing', visibility: 'private', spaceId: undefined }),
    task({ id: 't3', title: 'For Mum & Dad', spaceId: 'parents' }),
    task({ id: 't4', title: 'Sample', isDemo: true }),
  ],
  events: [
    {
      id: 'e1',
      title: 'Dinner',
      start: '2026-10-30T19:00',
      end: '2026-10-30T21:00',
      allDay: false,
      timeZone: 'UTC',
      calendarId: 'cal_home',
      visibility: 'shared',
      spaceId: 'home',
      participantIds: ['me', 'p_sam'],
      location: undefined,
      createdAt: '',
    } as CalendarEvent,
  ],
  lists: [
    {
      id: 'l1',
      name: 'Groceries',
      color: 'mint',
      icon: 'basket-outline',
      visibility: 'shared',
      spaceId: 'home',
      createdAt: '',
    } as ShoppingList,
  ],
  items: [
    { id: 'i1', listId: 'l1', name: 'Milk', category: 'dairy', purchased: false, addedBy: 'me', createdAt: '' } as ShoppingItem,
    { id: 'i2', listId: 'other', name: 'Private', category: 'other', purchased: false, createdAt: '' } as ShoppingItem,
  ],
  memories: [
    {
      id: 'm1',
      title: 'Picnic',
      date: '2026-10-01',
      kind: 'memory',
      visibility: 'shared',
      spaceId: 'home',
      photoId: 'p_local',
      authorId: 'me',
      createdAt: '',
    } as Memory,
    { id: 'm2', title: 'Just mine', date: '2026-10-02', kind: 'note', visibility: 'private', authorId: 'me', createdAt: '' } as Memory,
  ],
  spaces: [space, other],
});

describe('what a family shares', () => {
  it('collects only that family’s shared things, never private or sample items', () => {
    const ids = [...collectShared(state(), 'home', UID).keys()].sort();
    expect(ids).toEqual(['a1', 'e1', 'i1', 'l1', 'm1', 'p_sam', 't1']);
  });

  it('stores “me” as the account id, drops device-only fields and undefined values', () => {
    const shared = collectShared(state(), 'home', UID);
    expect(shared.get('t1')!.data).toMatchObject({ title: 'Pay the electricity bill', assigneeId: UID });
    expect(shared.get('t1')!.data).not.toHaveProperty('spaceId');
    expect(shared.get('t1')!.data).not.toHaveProperty('visibility');
    expect(shared.get('e1')!.data.participantIds).toEqual([UID, 'p_sam']);
    expect(shared.get('e1')!.data).not.toHaveProperty('location');
    expect(shared.get('m1')!.data).not.toHaveProperty('photoId');
    expect(shared.get('i1')!.data.addedBy).toBe(UID);
  });

  it('reads back with “me” for this account and someone else’s id for theirs', () => {
    const c = toCloud('task', task({ id: 't9', assigneeId: 'me' }), UID);
    expect(fromCloud<Task>(c, UID, 'home')).toMatchObject({ id: 't9', assigneeId: 'me', visibility: 'shared', spaceId: 'home' });
    // On Sam's partner's device, Alex's task is assigned to Alex's account.
    expect(fromCloud<Task>(c, 'uid_jordan', 'their_home').assigneeId).toBe(UID);
  });
});

describe('sync', () => {
  const item = (id: string, title: string): CloudItem => ({ id, kind: 'task', data: { title } });

  it('uploads new and changed things, and removals', () => {
    const current = new Map([
      ['a', item('a', 'Same')],
      ['b', item('b', 'Changed')],
      ['c', item('c', 'New')],
    ]);
    const synced = new Map([
      ['a', fingerprint(item('a', 'Same'))],
      ['b', fingerprint(item('b', 'Before'))],
      ['gone', fingerprint(item('gone', 'Deleted here'))],
    ]);
    const { put, remove } = diffUpload(current, synced);
    expect(put.map((p) => p.id)).toEqual(['b', 'c']);
    expect(remove).toEqual(['gone']);
  });

  it('fingerprints ignore key order', () => {
    expect(fingerprint({ id: 'x', kind: 'task', data: { a: 1, b: 2 } })).toBe(fingerprint({ id: 'x', kind: 'task', data: { b: 2, a: 1 } }));
  });

  it('merges: remote changes arrive, unsent local edits and new items stay, remote deletions apply', () => {
    const synced = new Map([
      ['changedThere', fingerprint(item('changedThere', 'v1'))],
      ['editedHere', fingerprint(item('editedHere', 'v1'))],
      ['deletedThere', fingerprint(item('deletedThere', 'v1'))],
    ]);
    const local = new Map([
      ['changedThere', item('changedThere', 'v1')],
      ['editedHere', item('editedHere', 'v2 (mine)')],
      ['deletedThere', item('deletedThere', 'v1')],
      ['newHere', item('newHere', 'not sent yet')],
    ]);
    const remote = new Map([
      ['changedThere', item('changedThere', 'v2 (theirs)')],
      ['editedHere', item('editedHere', 'v1')],
      ['newThere', item('newThere', 'from Jordan')],
    ]);
    const { items, synced: next } = mergeRemote(local, remote, synced);
    expect(Object.fromEntries([...items].map(([id, c]) => [id, c.data.title]))).toEqual({
      changedThere: 'v2 (theirs)',
      editedHere: 'v2 (mine)',
      newThere: 'from Jordan',
      newHere: 'not sent yet',
    });
    expect([...next.keys()].sort()).toEqual(['changedThere', 'editedHere', 'newThere']);
    // The unsent edit still differs from what's synced, so the next upload sends it.
    expect(
      diffUpload(items, next)
        .put.map((p) => p.id)
        .sort(),
    ).toEqual(['editedHere', 'newHere']);
  });

  it('applies a family back to the stores without touching anything else, keeping local photos', () => {
    const s = state();
    const family = collectShared(s, 'home', UID);
    family.set('t1', { ...family.get('t1')!, data: { ...family.get('t1')!.data, title: 'Pay the bill (edited by Jordan)' } });
    family.set('t_new', toCloud('task', task({ id: 't_new', title: 'From Jordan', assigneeId: 'uid_jordan' }), 'uid_jordan'));
    family.delete('i1');
    const next = applyFamily(s, 'home', family, UID);
    expect(next.tasks.map((t) => t.title).sort()).toEqual([
      'For Mum & Dad',
      'From Jordan',
      'Pay the bill (edited by Jordan)',
      'Private thing',
      'Sample',
    ]);
    expect(next.items.map((i) => i.id)).toEqual(['i2']);
    expect(next.memories.find((m) => m.id === 'm1')!.photoId).toBe('p_local');
    expect(next.memories.find((m) => m.id === 'm2')).toBeDefined();
    expect(next.spaces.find((x) => x.id === 'home')!.announcements).toHaveLength(1);
    expect(next.spaces.find((x) => x.id === 'parents')).toEqual(other);
  });
});

describe('members and invites', () => {
  it('shows account members with “me” for this account, keeping people without accounts', () => {
    const members = mergeAccounts(
      space,
      [
        { uid: UID, name: 'Alex', color: 'coral', role: 'admin' },
        { uid: 'uid_jordan', name: 'Jordan', color: 'sky', role: 'member' },
      ],
      UID,
    );
    expect(members.map((m) => [m.id, m.name, !!m.isMe])).toEqual([
      ['me', 'Alex', true],
      ['uid_jordan', 'Jordan', false],
      ['p_sam', 'Sam', false],
    ]);
  });

  it('makes readable, unambiguous codes', () => {
    const code = inviteCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(code).toHaveLength(10);
    expect(code).not.toMatch(/[01OIL]/);
    expect(formatCode('ABCDE23456')).toBe('ABCDE-23456');
    expect(parseCode(' abcde-23456 ')).toBe('ABCDE23456');
  });
});
