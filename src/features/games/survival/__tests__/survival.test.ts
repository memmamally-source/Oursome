import { ALL_CONCEPTS, ALL_ITEMS } from '@/content';
import { ContentRepo, REVIEWER_PREVIEW } from '@/content/repo';
import { seeded } from '@/engine/random';
import { answerSurvival, initialSurvival, isOver, levelFor, pickNext, pointsFor, type SurvivalItem } from '@/features/games/survival/logic';
import { mysteryScore, dailyCase } from '@/features/games/mystery/logic';
import { factOrFictionRound, reviewItems } from '@/features/games/quiz/logic';

const repo = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, REVIEWER_PREVIEW);
const pool: SurvivalItem[] = [...repo.itemsOf('mcq'), ...repo.itemsOf('tf')];

describe('Medical Survival', () => {
  it('ends after three wrong answers', () => {
    let s = initialSurvival();
    const rnd = seeded(1);
    for (let i = 0; i < 3; i++) s = answerSurvival(s, pickNext(pool, s, rnd)!, false, null);
    expect(s.lives).toBe(0);
    expect(isOver(s, pool)).toBe(true);
  });

  it('raises difficulty as the player succeeds and never repeats an item', () => {
    let s = initialSurvival();
    const rnd = seeded(2);
    for (let i = 0; i < 9; i++) s = answerSurvival(s, pickNext(pool, s, rnd)!, true, null);
    expect(s.level).toBe(levelFor(9));
    expect(s.level).toBeGreaterThan(1);
    expect(new Set(s.used).size).toBe(s.used.length);
  });

  it('rewards accuracy over speed', () => {
    expect(pointsFor(3, 0, 1)).toBeLessThanOrEqual(pointsFor(3, 0, null) * 1.2);
    expect(pointsFor(5, 0, null)).toBeGreaterThan(pointsFor(1, 0, 1));
  });
});

describe('Mystery Patient', () => {
  it('rewards efficient correct reasoning, with a floor', () => {
    expect(mysteryScore(true, 1)).toBe(100);
    expect(mysteryScore(true, 3)).toBe(70);
    expect(mysteryScore(true, 9)).toBe(30);
    expect(mysteryScore(false, 1)).toBe(0);
  });

  it('gives everyone the same daily case', () => {
    const cases = repo.itemsOf('case');
    expect(dailyCase(cases, '2026-11-05')!.id).toBe(dailyCase([...cases].reverse(), '2026-11-05')!.id);
  });
});

describe('review and Fact or Fiction selection', () => {
  it('asks a concept a different way from last time where possible', () => {
    const log = [{ id: 'x', at: 1, type: 'answer_submitted' as const, gameId: 'survival' as const, itemId: 'g6pd:mcq1', conceptIds: ['g6pd'], correct: false, response: '', expected: '', prompt: '', hintsUsed: 0, latencyMs: 0, difficulty: 3 }];
    for (let i = 0; i < 10; i++) {
      const [item] = reviewItems(repo, ['g6pd'], log, seeded(i));
      expect(item!.id).not.toBe('g6pd:mcq1');
      expect(item!.kind).toBe('tf');
    }
  });

  it('mixes true and false statements', () => {
    const r = factOrFictionRound(repo, seeded(5), 10);
    expect(r).toHaveLength(10);
    expect(r.some((i) => i.isTrue)).toBe(true);
    expect(r.some((i) => !i.isTrue)).toBe(true);
  });
});
