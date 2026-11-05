import { canHoldLock, creditableMs, creditDay, emptyDay, formatDuration } from '@/engine/studyTime';

const base = { now: 100_000, lastTick: 95_000, lastInteraction: 99_000, visible: true, hasContext: true, holdsLock: true };

describe('active study time', () => {
  it('credits time between ticks while active', () => {
    expect(creditableMs(base)).toBe(5_000);
  });

  it('never credits hidden, idle, context-free or non-leader tabs', () => {
    expect(creditableMs({ ...base, visible: false })).toBe(0);
    expect(creditableMs({ ...base, hasContext: false })).toBe(0);
    expect(creditableMs({ ...base, holdsLock: false })).toBe(0);
    expect(creditableMs({ ...base, lastInteraction: 0 })).toBe(0);
    expect(creditableMs({ ...base, lastTick: null })).toBe(0);
  });

  it('caps a single tick so sleep or throttling cannot add a large block', () => {
    expect(creditableMs({ ...base, lastTick: 0, lastInteraction: 100_000 })).toBe(10_000);
  });

  it('only one tab holds the lock unless it goes stale', () => {
    expect(canHoldLock(null, 'a', 0)).toBe(true);
    expect(canHoldLock({ tabId: 'b', at: 1000 }, 'a', 5000)).toBe(false);
    expect(canHoldLock({ tabId: 'b', at: 1000 }, 'a', 20_000)).toBe(true);
    expect(canHoldLock({ tabId: 'a', at: 1000 }, 'a', 2000)).toBe(true);
  });

  it('splits time across the disciplines and systems of the concepts studied', () => {
    const classify = (id: string) => (id === 'x' ? { discipline: 'pharmacology', system: 'cardiovascular' } : { discipline: 'pathology', system: 'renal' });
    const d = creditDay(emptyDay(), 10_000, { activity: 'play', gameId: 'survival', conceptIds: ['x', 'y'] }, classify);
    expect(d.total).toBe(10_000);
    expect(d.byGame.survival).toBe(10_000);
    expect(d.byDiscipline).toEqual({ pharmacology: 5_000, pathology: 5_000 });
    expect(d.bySystem).toEqual({ cardiovascular: 5_000, renal: 5_000 });
    expect(d.byActivity.play).toBe(10_000);
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(30_000)).toBe('<1 min');
    expect(formatDuration(42 * 60_000)).toBe('42 min');
    expect(formatDuration(380 * 60_000)).toBe('6 h 20 min');
  });
});
