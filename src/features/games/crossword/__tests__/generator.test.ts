import { ALL_CONCEPTS, ALL_ITEMS } from '@/content';
import { ContentRepo, REVIEWER_PREVIEW } from '@/content/repo';
import { seeded } from '@/engine/random';
import { buildCrossword, emptyFill, gridSolved, scoreCrossword } from '@/features/games/crossword/logic';
import { cellsOf, generateCrossword, validateGrid } from '@/features/games/crossword/generator';

const repo = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, REVIEWER_PREVIEW);

describe('crossword generator', () => {
  it('produces valid grids for many seeds and every size', () => {
    for (const kind of ['mini', 'standard', 'advanced'] as const) {
      for (let i = 0; i < 15; i++) {
        const p = buildCrossword(repo, kind, `seed-${kind}-${i}`);
        expect(p).not.toBeNull();
        expect(validateGrid(p!.grid)).toEqual([]);
        expect(p!.grid.entries.length).toBeGreaterThanOrEqual(kind === 'mini' ? 4 : 8);
      }
    }
  });

  it('respects the size limit', () => {
    const p = buildCrossword(repo, 'mini', 'size')!;
    expect(p.grid.width).toBeLessThanOrEqual(9);
    expect(p.grid.height).toBeLessThanOrEqual(9);
  });

  it('is deterministic for a daily seed', () => {
    const a = buildCrossword(repo, 'mini', 'step1:2026-11-05:mini')!;
    const b = buildCrossword(repo, 'mini', 'step1:2026-11-05:mini')!;
    expect(a.grid.entries.map((e) => e.answer)).toEqual(b.grid.entries.map((e) => e.answer));
  });

  it('builds subject crosswords from a topic filter', () => {
    const p = buildCrossword(repo, 'subject', 's', { system: 'blood-immune' })!;
    for (const e of p.grid.entries) expect(repo.conceptsWhere({ system: 'blood-immune' }).map((c) => c.id)).toContain(p.items.get(e.id)!.conceptIds[0]);
  });

  it('rejects touching words that would create unclued runs', () => {
    const g = generateCrossword(
      [{ id: 'a', answer: 'CAT', clue: '' }, { id: 'b', answer: 'CAR', clue: '' }, { id: 'c', answer: 'TAR', clue: '' }],
      seeded(1),
      { target: 3, maxSize: 9 },
    )!;
    expect(validateGrid(g)).toEqual([]);
  });

  it('scores solved words and reduces credit for revealed letters', () => {
    const p = buildCrossword(repo, 'mini', 'score')!;
    const fill = emptyFill(p.grid);
    for (const e of p.grid.entries) cellsOf(e).forEach(([r, c], i) => (fill[r]![c] = e.answer[i]!));
    expect(gridSolved(p.grid, fill)).toBe(true);
    const full = scoreCrossword(p.grid, fill, new Set()).score;
    expect(full).toBe(p.grid.entries.length * 100);
    const [r, c] = cellsOf(p.grid.entries[0]!)[0]!;
    expect(scoreCrossword(p.grid, fill, new Set([`${r},${c}`])).score).toBeLessThan(full);
  });
});
