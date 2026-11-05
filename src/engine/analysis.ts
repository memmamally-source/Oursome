/**
 * Four-level performance analysis: discipline → organ system → topic → concept, plus the separate
 * learning metrics (accuracy, mastery, retention, coverage, improvement). Pure: takes the stored
 * records and the content repository.
 */
import type { ContentRepo } from '@/content/repo';
import type { Concept, DisciplineId, SystemId } from '@/content/schema';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { estimate, weaknessScore, type ConceptRecord, type Estimate, type Outcome } from './mastery';

export type Level = 'discipline' | 'system' | 'topic' | 'concept';

export interface Node {
  level: Level;
  id: string;
  title: string;
  estimate: Estimate;
  conceptIds: string[];
}

export type Records = Record<string, ConceptRecord>;

function node(level: Level, id: string, title: string, concepts: Concept[], recs: Records, now: number): Node {
  return { level, id, title, conceptIds: concepts.map((c) => c.id), estimate: estimate(concepts.map((c) => recs[c.id]), now) };
}

const disciplinesOf = (c: Concept): DisciplineId[] => [c.discipline, ...(c.alsoDisciplines ?? [])];
const systemsOf = (c: Concept): SystemId[] => [c.system, ...(c.alsoSystems ?? [])];

export function byDiscipline(repo: ContentRepo, recs: Records, now: number): Node[] {
  return (Object.keys(DISCIPLINES) as DisciplineId[])
    .map((d) => node('discipline', d, DISCIPLINES[d].title, repo.concepts.filter((c) => disciplinesOf(c).includes(d)), recs, now))
    .filter((n) => n.conceptIds.length);
}

export function bySystem(repo: ContentRepo, recs: Records, now: number): Node[] {
  return (Object.keys(SYSTEMS) as SystemId[])
    .map((s) => node('system', s, SYSTEMS[s].title, repo.concepts.filter((c) => systemsOf(c).includes(s)), recs, now))
    .filter((n) => n.conceptIds.length);
}

export function byTopic(repo: ContentRepo, recs: Records, now: number, filter?: (c: Concept) => boolean): Node[] {
  const topics = new Map<string, Concept[]>();
  for (const c of repo.concepts) {
    if (filter && !filter(c)) continue;
    topics.set(c.topic, [...(topics.get(c.topic) ?? []), c]);
  }
  return [...topics.entries()].map(([t, cs]) => node('topic', t, repo.topicTitle(t), cs, recs, now));
}

export function byConcept(repo: ContentRepo, recs: Records, now: number, filter?: (c: Concept) => boolean): Node[] {
  return repo.concepts.filter((c) => !filter || filter(c)).map((c) => node('concept', c.id, c.title, [c], recs, now));
}

/**
 * Cross-section, e.g. discipline within a system ("Cardiovascular → Pharmacology").
 */
export function disciplineWithinSystem(repo: ContentRepo, recs: Records, now: number, system: SystemId): Node[] {
  const inSystem = repo.concepts.filter((c) => systemsOf(c).includes(system));
  return (Object.keys(DISCIPLINES) as DisciplineId[])
    .map((d) => node('discipline', d, DISCIPLINES[d].title, inSystem.filter((c) => disciplinesOf(c).includes(d)), recs, now))
    .filter((n) => n.conceptIds.length);
}

/**
 * Priority weaknesses: the MOST SPECIFIC weak nodes. A topic is reported rather than its system
 * when the topic is clearly weaker, so the advice is "antiarrhythmics", not "revise cardiology".
 */
export function priorityWeaknesses(repo: ContentRepo, recs: Records, now: number, limit = 3): Node[] {
  const scored = [...byTopic(repo, recs, now), ...byConcept(repo, recs, now)]
    .map((n) => ({ n, s: weaknessScore(n.estimate) }))
    .filter((x): x is { n: Node; s: number } => x.s !== null && (x.n.estimate.mastery ?? 1) < 0.7);
  scored.sort((a, b) => b.s - a.s);
  const picked: Node[] = [];
  for (const { n } of scored) {
    // Skip a concept if its topic is already listed, and vice versa: avoid duplicate advice.
    const topicOf = n.level === 'concept' ? repo.concept(n.id)?.topic : n.id;
    if (picked.some((p) => (p.level === 'concept' ? repo.concept(p.id)?.topic : p.id) === topicOf)) continue;
    picked.push(n);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function strongest(nodes: Node[]): Node | undefined {
  return nodes
    .filter((n) => n.estimate.status === 'strong' || (n.estimate.attempts >= 5 && (n.estimate.accuracy ?? 0) >= 0.6))
    .sort((a, b) => (b.estimate.mastery ?? 0) - (a.estimate.mastery ?? 0))[0];
}

// ——— Separate learning metrics ———

/** Retention: accuracy on concepts revisited ≥ 1 day after the previous attempt. */
export function retention(recs: Records): { attempts: number; correct: number; rate: number | null } {
  let attempts = 0;
  let correct = 0;
  for (const r of Object.values(recs)) {
    const xs: Outcome[] = r.recent;
    for (let i = 1; i < xs.length; i++) {
      if (xs[i]!.at - xs[i - 1]!.at >= 86_400_000) {
        attempts++;
        if (xs[i]!.correct) correct++;
      }
    }
  }
  return { attempts, correct, rate: attempts ? correct / attempts : null };
}

/** Syllabus coverage: share of the package's concepts encountered at least once. */
export function coverage(repo: ContentRepo, recs: Records, filter?: (c: Concept) => boolean): { seen: number; total: number } {
  const cs = repo.concepts.filter((c) => !filter || filter(c));
  return { seen: cs.filter((c) => (recs[c.id]?.attempts ?? 0) > 0).length, total: cs.length };
}

/** Improvement: accuracy in the last 7 days vs the 7 days before (null when either window is thin). */
export function improvement(recs: Records, now: number): { recent: number; previous: number; delta: number } | null {
  const WEEK = 7 * 86_400_000;
  const win = (from: number, to: number) => {
    let n = 0;
    let k = 0;
    for (const r of Object.values(recs))
      for (const o of r.recent)
        if (o.at >= from && o.at < to) {
          n++;
          if (o.correct) k++;
        }
    return n >= 10 ? k / n : null;
  };
  const recent = win(now - WEEK, now + 1);
  const previous = win(now - 2 * WEEK, now - WEEK);
  return recent === null || previous === null ? null : { recent, previous, delta: recent - previous };
}
