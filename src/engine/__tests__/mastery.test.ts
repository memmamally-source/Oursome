import { estimate, recordOutcome, weaknessScore, type ConceptRecord } from '@/engine/mastery';

const now = Date.UTC(2026, 5, 1);
const rec = (outcomes: [boolean, number?][], spacing = 3_600_000): ConceptRecord => {
  let r: ConceptRecord | undefined;
  outcomes.forEach(([correct, d = 3], i) => (r = recordOutcome(r, { at: now - (outcomes.length - i) * spacing, correct, difficulty: d })));
  return r!;
};

describe('mastery', () => {
  it('reports not studied and insufficient information honestly', () => {
    expect(estimate([undefined], now).status).toBe('not_studied');
    expect(estimate([rec([[true]])], now).status).toBe('insufficient');
    expect(estimate([rec([[true], [true]])], now).status).toBe('insufficient');
  });

  it('one correct answer is never mastery', () => {
    const e = estimate([rec([[true, 5]])], now);
    expect(e.status).not.toBe('strong');
    expect(weaknessScore(e)).toBeNull();
  });

  it('consistent correct answers become strong; consistent errors need revision', () => {
    expect(estimate([rec(Array(8).fill([true]))], now).status).toBe('strong');
    expect(estimate([rec(Array(5).fill([false]))], now).status).toBe('needs_revision');
  });

  it('detects improvement', () => {
    const e = estimate([rec([[false], [false], [false], [false], [true], [true], [true], [true]])], now);
    expect(e.status).toBe('improving');
  });

  it('weights difficulty: missing easy items is worse than missing hard ones', () => {
    const easyMiss = estimate([rec([[false, 1], [false, 1], [true, 3], [true, 3]])], now).mastery!;
    const hardMiss = estimate([rec([[false, 5], [false, 5], [true, 3], [true, 3]])], now).mastery!;
    expect(easyMiss).toBeLessThan(hardMiss);
  });

  it('keeps raw accuracy separate from mastery', () => {
    const e = estimate([rec([[true], [true], [false]])], now);
    expect(e.accuracy).toBeCloseTo(2 / 3);
    expect(e.mastery).not.toBeCloseTo(2 / 3, 3);
  });
});
