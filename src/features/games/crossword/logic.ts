import type { ContentRepo, ItemQuery } from '@/content/repo';
import type { ClueItem } from '@/content/schema';
import { seeded, shuffle } from '@/engine/random';
import { cellsOf, generateCrossword, type Grid, type Placed } from './generator';

export type CrosswordKind = 'mini' | 'standard' | 'subject' | 'advanced';

export const CROSSWORD_SIZES: Record<CrosswordKind, { target: number; maxSize: number; label: string }> = {
  mini: { target: 6, maxSize: 9, label: 'Daily Medical Mini' },
  standard: { target: 12, maxSize: 13, label: 'Daily Standard' },
  subject: { target: 10, maxSize: 13, label: 'Subject crossword' },
  advanced: { target: 14, maxSize: 15, label: 'Advanced crossword' },
};

export interface Puzzle {
  grid: Grid;
  items: Map<string, ClueItem>;
  title: string;
}

export function buildCrossword(repo: ContentRepo, kind: CrosswordKind, seed: string, q: ItemQuery = {}): Puzzle | null {
  let clues = repo.itemsOf('clue', q);
  if (kind === 'advanced') clues = clues.filter((c) => c.difficulty >= 3);
  if (kind === 'mini') clues = clues.filter((c) => c.answer.length <= 9);
  const rnd = seeded(seed);
  const pool = shuffle(clues, rnd);
  const size = CROSSWORD_SIZES[kind];
  const grid = generateCrossword(
    pool.map((c) => ({ id: c.id, answer: c.answer, clue: c.clue })),
    rnd,
    size,
  );
  if (!grid) return null;
  return { grid, items: new Map(pool.map((c) => [c.id, c])), title: size.label };
}

export type Fill = (string | null)[][];

export function emptyFill(g: Grid): Fill {
  return g.letters.map((row) => row.map((l) => (l ? '' : null)));
}

export function entryComplete(e: Placed, fill: Fill): boolean {
  return cellsOf(e).every(([r, c]) => !!fill[r]?.[c]);
}

export function entryCorrect(e: Placed, fill: Fill): boolean {
  return cellsOf(e).every(([r, c], i) => fill[r]?.[c] === e.answer[i]);
}

export function gridSolved(g: Grid, fill: Fill): boolean {
  return g.entries.every((e) => entryCorrect(e, fill));
}

/**
 * Score: 100 per word solved without help, 50 if letters in it were revealed, 0 if wrong or
 * revealed entirely. Time is shown but does not change the score (accuracy over speed).
 */
export function scoreCrossword(g: Grid, fill: Fill, revealed: Set<string>): { score: number; perEntry: Map<string, { correct: boolean; hinted: boolean }> } {
  const perEntry = new Map<string, { correct: boolean; hinted: boolean }>();
  let score = 0;
  for (const e of g.entries) {
    const cells = cellsOf(e);
    const hintedCells = cells.filter(([r, c]) => revealed.has(`${r},${c}`)).length;
    const correct = entryCorrect(e, fill) && hintedCells < cells.length;
    perEntry.set(e.id, { correct, hinted: hintedCells > 0 });
    if (correct) score += hintedCells ? 50 : 100;
  }
  return { score, perEntry };
}
