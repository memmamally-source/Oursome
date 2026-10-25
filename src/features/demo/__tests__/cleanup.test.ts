import type { CalendarEvent, ShoppingItem, ShoppingList, Space, Task } from '@/features/types';

import { hasSampleContent, withoutSampleContent, type SampleState } from '../cleanup';
import { buildDemo } from '../legacySample.fixture';

const demo = buildDemo('Alex', new Date(2026, 9, 25, 9));
const mine = {
  task: { id: 't_mine', title: 'Fix the gate', categoryId: 'home', priority: 'medium', subtasks: [], order: 1, visibility: 'private', createdAt: '' } as Task,
  event: { id: 'e_mine', title: 'Dentist', start: '2026-10-27T10:00', end: '2026-10-27T11:00', allDay: false, timeZone: 'UTC', calendarId: 'cal_personal', visibility: 'private', createdAt: '' } as CalendarEvent,
  list: { id: 'l_mine', name: 'Hardware', color: 'mint', icon: 'basket-outline', visibility: 'private', createdAt: '' } as ShoppingList,
};
const item = (id: string, listId: string, name: string): ShoppingItem => ({ id, listId, name, category: 'other', purchased: false, createdAt: '' });

const withDemo = (extra: Partial<SampleState> = {}): SampleState => ({
  tasks: [...demo.tasks, mine.task],
  events: [...demo.events, mine.event],
  calendars: [...demo.calendars],
  lists: [...demo.lists, mine.list],
  items: [...demo.items, item('i_mine', 'l_mine', 'Hinges')],
  spaces: [demo.space],
  ...extra,
});

describe('removing the old sample content', () => {
  it('knows when an account still has it', () => {
    expect(hasSampleContent(withDemo())).toBe(true);
    expect(hasSampleContent(withoutSampleContent(withDemo()))).toBe(false);
  });

  it('removes every sample task, event, list and the sample household, keeping the person’s own things', () => {
    const out = withoutSampleContent(withDemo());
    expect(out.tasks.map((t) => t.id)).toEqual(['t_mine']);
    expect(out.events.map((e) => e.id)).toEqual(['e_mine']);
    expect(out.lists.map((l) => l.id)).toEqual(['l_mine']);
    expect(out.items.map((i) => i.id)).toEqual(['i_mine']);
    expect(out.calendars.map((c) => c.id)).toEqual(['cal_personal']);
    expect(out.spaces).toEqual([]);
  });

  it('keeps a sample list the person added to, without the sample items', () => {
    const out = withoutSampleContent(withDemo({ items: [...demo.items, item('i_own', 'demo_l_groceries', 'Oat milk')] }));
    expect(out.lists.find((l) => l.id === 'demo_l_groceries')).toMatchObject({ isDemo: undefined });
    expect(out.items.filter((i) => i.listId === 'demo_l_groceries').map((i) => i.name)).toEqual(['Oat milk']);
  });

  it('keeps the sample household if the person made it theirs, minus the sample member and notes', () => {
    const space: Space = { ...demo.space, members: [...demo.space.members, { id: 'p_ruf', name: 'Rufaida', color: 'mint', role: 'member', kind: 'person' }] };
    const out = withoutSampleContent(withDemo({ spaces: [space] }));
    expect(out.spaces).toHaveLength(1);
    expect(out.spaces[0].isDemo).toBeUndefined();
    expect(out.spaces[0].members.map((m) => m.name)).toEqual(['Alex', 'Rufaida']);
    expect(out.spaces[0].announcements).toEqual([]);
  });

  it('keeps a sample calendar that holds the person’s own events', () => {
    const own = { ...mine.event, id: 'e_kids', calendarId: 'demo_cal_kids' };
    const out = withoutSampleContent(withDemo({ events: [...demo.events, own] }));
    expect(out.calendars.map((c) => c.id)).toContain('demo_cal_kids');
  });
});
