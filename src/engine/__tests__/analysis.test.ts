import { ALL_CONCEPTS, ALL_ITEMS } from '@/content';
import { ContentRepo, REVIEWER_PREVIEW } from '@/content/repo';
import { byDiscipline, coverage, disciplineWithinSystem, priorityWeaknesses, type Records } from '@/engine/analysis';
import { recordOutcome, type ConceptRecord } from '@/engine/mastery';
import { buildPlan } from '@/engine/plan';

const repo = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, REVIEWER_PREVIEW);
const now = Date.UTC(2026, 10, 5);

function rec(correct: number, wrong: number): ConceptRecord {
  let r: ConceptRecord | undefined;
  const xs = [...Array(correct).fill(true), ...Array(wrong).fill(false)];
  xs.forEach((c, i) => (r = recordOutcome(r, { at: now - (i + 1) * 3_600_000, correct: c, difficulty: 3 })));
  return r!;
}

describe('weak-area analysis', () => {
  // Strong cardiovascular physiology, weak antiarrhythmics: the brief's worked example.
  const records: Records = {
    'frank-starling': rec(9, 1),
    'cardiac-ap': rec(9, 1),
    'acei-bradykinin': rec(8, 1),
    'class3-qt': rec(2, 6),
    'class1c-flecainide': rec(1, 4),
  };

  it('names antiarrhythmics, not "cardiology", as the priority weakness', () => {
    const top = priorityWeaknesses(repo, records, now, 1)[0]!;
    expect(top.level === 'topic' ? top.id : repo.concept(top.id)!.topic).toBe('cv-antiarrhythmics');
  });

  it('breaks a system down by discipline', () => {
    const cv = disciplineWithinSystem(repo, records, now, 'cardiovascular');
    const phys = cv.find((n) => n.id === 'physiology')!.estimate.accuracy!;
    const pharm = cv.find((n) => n.id === 'pharmacology')!.estimate.accuracy!;
    expect(phys).toBeGreaterThan(pharm);
  });

  it('reports insufficient data instead of guessing', () => {
    const nodes = byDiscipline(repo, { 'g6pd': rec(1, 0) }, now);
    expect(nodes.find((n) => n.id === 'biochemistry')!.estimate.status).toBe('insufficient');
  });

  it('measures coverage separately', () => {
    expect(coverage(repo, records)).toEqual({ seen: 5, total: repo.concepts.length });
  });

  it('builds a plan from real data that targets the weakness and fits the time', () => {
    const plan = buildPlan({ repo, records, srs: {}, dailyDone: new Set(), minutes: 15, now });
    expect(plan.reduce((t, b) => t + b.minutes, 0)).toBe(15);
    expect(plan.some((b) => b.reason.includes('Antiarrhythmics') || b.focus?.concept === 'class3-qt' || b.focus?.concept === 'class1c-flecainide')).toBe(true);
  });
});
