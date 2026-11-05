import { applyAttempt, intervalDays, newCard, retrievability, review } from '@/engine/srs';

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);

describe('FSRS scheduling', () => {
  it('retrievability is 90% after exactly one stability interval', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
  });

  it('interval at 90% retention equals stability (rounded, min 1 day)', () => {
    expect(intervalDays(10)).toBe(10);
    expect(intervalDays(0.2)).toBe(1);
  });

  it('a wrong first answer comes back the next day', () => {
    const c = newCard(1, t0);
    expect(c.due).toBe(t0 + DAY);
    expect(c.lapses).toBe(1);
  });

  it('successful reviews push intervals out; a lapse pulls them in', () => {
    let c = newCard(3, t0);
    const first = c.due - t0;
    c = review(c, 3, c.due);
    const second = c.due - c.lastReview;
    expect(second).toBeGreaterThan(first);
    const lapsed = review(c, 1, c.due);
    expect(lapsed.stability).toBeLessThan(c.stability);
    expect(lapsed.due - lapsed.lastReview).toBe(DAY);
  });

  it('Easy grows stability more than Hard', () => {
    const c = newCard(3, t0);
    expect(review(c, 4, c.due).stability).toBeGreaterThan(review(c, 2, c.due).stability);
  });

  it('correct answers before the due date do not advance the schedule (no cramming)', () => {
    const c = newCard(3, t0);
    expect(applyAttempt(c, 3, t0 + 1000)).toBe(c);
    expect(applyAttempt(c, 1, t0 + 1000).lapses).toBe(1);
  });
});
