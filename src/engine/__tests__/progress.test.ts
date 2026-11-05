import type { LearningEvent } from '@/engine/events';
import { applyEvent, initialProgress, mistakeResolved } from '@/engine/progress';
import { timeSummary } from '@/engine/stats';
import { dateKey } from '@/engine/random';

const classify = () => ({ discipline: 'pharmacology', system: 'cardiovascular' });
const at = new Date(2026, 10, 5, 10).getTime();

const answer = (id: string, correct: boolean, t = at): LearningEvent => ({
  id,
  at: t,
  type: 'answer_submitted',
  gameId: 'survival',
  itemId: 'acei-bradykinin:mcq1',
  conceptIds: ['acei-bradykinin'],
  correct,
  response: correct ? 'Bradykinin' : 'Angiotensin II',
  expected: 'Bradykinin',
  prompt: 'Cough on ACE inhibitor?',
  hintsUsed: 0,
  latencyMs: 4000,
  difficulty: 2,
});

describe('progress reducer', () => {
  it('is idempotent: the same event id is applied once', () => {
    let s = initialProgress(at);
    s = applyEvent(s, answer('e1', false), classify);
    const again = applyEvent(s, answer('e1', false), classify);
    expect(again).toBe(s);
    expect(s.concepts['acei-bradykinin']!.attempts).toBe(1);
  });

  it('records mistakes, repeat counts and later corrections without deleting history', () => {
    let s = initialProgress(at);
    s = applyEvent(s, answer('e1', false), classify);
    s = applyEvent(s, answer('e2', false, at + 1000), classify);
    const m = s.mistakes['acei-bradykinin:mcq1']!;
    expect(m.count).toBe(2);
    expect(m.response).toBe('Angiotensin II');
    expect(mistakeResolved(m)).toBe(false);
    s = applyEvent(s, answer('e3', true, at + 2000), classify);
    expect(s.mistakes['acei-bradykinin:mcq1']!.history).toHaveLength(3);
    expect(mistakeResolved(s.mistakes['acei-bradykinin:mcq1']!)).toBe(true);
  });

  it('schedules the concept for review after an attempt', () => {
    const s = applyEvent(initialProgress(at), answer('e1', false), classify);
    expect(s.srs['acei-bradykinin']!.due).toBe(at + 86_400_000);
  });

  it('accumulates study time by day and keeps external time separate', () => {
    let s = initialProgress(at);
    s = applyEvent(s, { id: 't1', at, type: 'study_time', ms: 120_000, context: { activity: 'play', gameId: 'survival', conceptIds: ['x'] } }, classify);
    s = { ...s, external: [{ id: 'x', date: dateKey(at), resource: 'UWorld', minutes: 60 }] };
    const sum = timeSummary(s, at);
    expect(sum.today).toBe(120_000);
    expect(sum.externalToday).toBe(3_600_000);
    expect(sum.streak).toBe(1);
  });

  it('records each daily puzzle once', () => {
    let s = initialProgress(at);
    const done = (id: string, score: number): LearningEvent => ({ id, at, type: 'game_completed', gameId: 'connections', score, correct: 4, total: 4, daily: '2026-11-05:connections' });
    s = applyEvent(s, done('d1', 300), classify);
    s = applyEvent(s, done('d2', 400), classify);
    expect(s.daily['2026-11-05:connections']!.score).toBe(300);
    expect(s.games.connections!.best).toBe(400);
  });
});

describe('streaks', () => {
  it('do not break until a whole day is missed', () => {
    const day = () => ({ total: 120_000, byGame: {}, byDiscipline: {}, bySystem: {}, byActivity: {} });
    const now = new Date(2026, 10, 5, 8).getTime();
    const s = { days: { '2026-11-03': day(), '2026-11-04': day() }, external: [] };
    expect(timeSummary(s, now).streak).toBe(2); // nothing yet today, streak still alive
  });
});
