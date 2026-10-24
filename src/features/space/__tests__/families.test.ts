import type { Space } from '@/features/types';

import { allPeople, belongsTo, familyOf, migrateSpaces } from '../families';

const home: Space = {
  id: 's_home',
  name: 'Our Home',
  members: [
    { id: 'me', name: 'Alex', color: 'coral', role: 'admin', isMe: true },
    { id: 'p_ru', name: 'Rufaida', color: 'sky', role: 'member', kind: 'person' },
  ],
  announcements: [],
  createdAt: '',
};
const parents: Space = {
  id: 's_par',
  name: 'Mum & Dad',
  members: [
    { id: 'me', name: 'Alex', color: 'coral', role: 'member', isMe: true },
    { id: 'p_mum', name: 'Mum', color: 'mint', role: 'admin', kind: 'person' },
  ],
  announcements: [],
  createdAt: '',
};

describe('families', () => {
  it('lists everyone once, the user first', () => {
    expect(allPeople([home, parents]).map((m) => m.id)).toEqual(['me', 'p_ru', 'p_mum']);
    expect(allPeople([])).toEqual([]);
  });

  it('finds the family a person belongs to (never by the user)', () => {
    expect(familyOf('p_mum', [home, parents])?.id).toBe('s_par');
    expect(familyOf('me', [home, parents])).toBeUndefined();
    expect(familyOf(undefined, [home])).toBeUndefined();
  });

  it('keeps older shared items with the first family; private items belong to none', () => {
    const spaces = [home, parents];
    expect(belongsTo({ visibility: 'shared' }, 's_home', spaces)).toBe(true);
    expect(belongsTo({ visibility: 'shared' }, 's_par', spaces)).toBe(false);
    expect(belongsTo({ visibility: 'shared', spaceId: 's_par' }, 's_par', spaces)).toBe(true);
    expect(belongsTo({ visibility: 'private', spaceId: 's_par' }, 's_par', spaces)).toBe(false);
  });

  it('upgrades saved one-household data without losing it', () => {
    expect(migrateSpaces({ space: home })).toEqual({ spaces: [home], activeId: 's_home' });
    expect(migrateSpaces({ space: null })).toEqual({ spaces: [], activeId: null });
    expect(migrateSpaces(undefined)).toEqual({ spaces: [], activeId: null });
    expect(migrateSpaces({ spaces: [home, parents], activeId: 's_par' }).activeId).toBe('s_par');
    expect(migrateSpaces({ spaces: [home], activeId: 'gone' }).activeId).toBe('s_home');
  });
});
