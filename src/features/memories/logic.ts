import { belongsTo } from '@/features/space/families';
import type { Space } from '@/features/types';

import type { Memory } from './store';

/** What one person sees in a family's journal: their own private pages plus that family's shared ones. */
export function visibleMemories(memories: Memory[], familyId: string | undefined, spaces: Space[]): Memory[] {
  return memories.filter((m) => m.visibility === 'private' || (!!familyId && belongsTo(m, familyId, spaces)));
}

/** Journal order: oldest first, like turning the pages of a book. */
export function journalOrder(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** Timeline: newest first, grouped by year. */
export function timelineByYear(memories: Memory[]): { year: string; items: Memory[] }[] {
  const sorted = [...memories].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const out: { year: string; items: Memory[] }[] = [];
  for (const m of sorted) {
    const year = m.date.slice(0, 4);
    const group = out[out.length - 1];
    if (group?.year === year) group.items.push(m);
    else out.push({ year, items: [m] });
  }
  return out;
}

export type JournalPage = { kind: 'cover' } | { kind: 'memory'; memory: Memory } | { kind: 'end' } | { kind: 'blank' };

/**
 * The book's pages: a cover, the memories oldest first, and a last page
 * inviting the next one. A two-page spread is padded to an even count.
 */
export function journalPages(memories: Memory[], spread: boolean): JournalPage[] {
  const pages: JournalPage[] = [
    { kind: 'cover' },
    ...journalOrder(memories).map((memory) => ({ kind: 'memory' as const, memory })),
    { kind: 'end' },
  ];
  if (spread && pages.length % 2) pages.push({ kind: 'blank' });
  return pages;
}

/** The first visible page index that shows a memory (aligned to the spread). */
export function pageIndexOf(pages: JournalPage[], memoryId: string | undefined, spread: boolean): number {
  const i = memoryId ? pages.findIndex((p) => p.kind === 'memory' && p.memory.id === memoryId) : -1;
  if (i < 0) return 0;
  return spread ? i - (i % 2) : i;
}
