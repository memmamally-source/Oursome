import type { Space } from '@/features/types';

import { journalPages, pageIndexOf, timelineByYear, visibleMemories } from '../logic';
import type { Memory } from '../store';

const m = (id: string, date: string, extra: Partial<Memory> = {}): Memory => ({
  id,
  title: id,
  date,
  kind: 'memory',
  visibility: 'private',
  authorId: 'me',
  createdAt: `${date}T10:00:00Z`,
  ...extra,
});

const spaces = [{ id: 'home' }, { id: 'parents' }] as Space[];

describe('journal', () => {
  it('shows private pages and only the viewed family’s shared ones', () => {
    const all = [
      m('a', '2026-01-01'),
      m('b', '2026-01-02', { visibility: 'shared', spaceId: 'home' }),
      m('c', '2026-01-03', { visibility: 'shared', spaceId: 'parents' }),
    ];
    expect(visibleMemories(all, 'home', spaces).map((x) => x.id)).toEqual(['a', 'b']);
    expect(visibleMemories(all, undefined, []).map((x) => x.id)).toEqual(['a']);
  });

  it('builds a book: cover, memories oldest first, an end page, padded for spreads', () => {
    const pages = journalPages([m('new', '2026-05-01'), m('old', '2025-02-01')], false);
    expect(pages.map((p) => (p.kind === 'memory' ? p.memory.id : p.kind))).toEqual(['cover', 'old', 'new', 'end']);
    expect(journalPages([m('one', '2026-01-01')], true).map((p) => p.kind)).toEqual(['cover', 'memory', 'end', 'blank']);
  });

  it('opens on a memory, aligned to the spread', () => {
    const pages = journalPages([m('a', '2026-01-01'), m('b', '2026-01-02'), m('c', '2026-01-03')], true);
    expect(pageIndexOf(pages, 'b', true)).toBe(2);
    expect(pageIndexOf(pages, 'b', false)).toBe(2);
    expect(pageIndexOf(pages, 'a', true)).toBe(0);
    expect(pageIndexOf(pages, 'missing', true)).toBe(0);
  });

  it('groups the timeline by year, newest first', () => {
    const groups = timelineByYear([m('a', '2025-03-01'), m('b', '2026-01-01'), m('c', '2025-12-01')]);
    expect(groups.map((g) => [g.year, g.items.map((x) => x.id)])).toEqual([
      ['2026', ['b']],
      ['2025', ['c', 'a']],
    ]);
  });
});
