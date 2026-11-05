/**
 * Concept mastery and weak-area analysis (pure).
 *
 * Each attempt adds evidence to a Beta(α, β) estimate of the chance of answering that concept
 * correctly. Evidence is weighted by question difficulty (a correct hard answer is stronger
 * evidence of mastery; a wrong easy answer stronger evidence of a gap) and decays with a 45-day
 * half-life so old performance matters less. Statuses need a minimum amount of evidence: one
 * correct answer never makes a concept "strong".
 */

export interface Outcome {
  at: number;
  correct: boolean;
  difficulty: number; // 1–5
}

export interface ConceptRecord {
  attempts: number;
  correct: number;
  firstSeen: number;
  lastSeen: number;
  /** Most recent outcomes, oldest first, capped. */
  recent: Outcome[];
}

export const RECENT_CAP = 30;
const HALF_LIFE_DAYS = 45;
const DAY = 86_400_000;

export type MasteryStatus = 'not_studied' | 'insufficient' | 'needs_revision' | 'developing' | 'improving' | 'strong';

export const STATUS_LABEL: Record<MasteryStatus, string> = {
  not_studied: 'Not yet studied',
  insufficient: 'Insufficient information',
  needs_revision: 'Needs revision',
  developing: 'Developing',
  improving: 'Improving',
  strong: 'Strong',
};

export interface Estimate {
  attempts: number;
  correct: number;
  /** Raw accuracy (correct / attempts). Not the same as mastery. */
  accuracy: number | null;
  /** Posterior mean of P(correct) with difficulty and recency weighting. */
  mastery: number | null;
  /** Effective evidence weight. */
  evidence: number;
  alpha: number;
  beta: number;
  status: MasteryStatus;
}

export function recordOutcome(rec: ConceptRecord | undefined, o: Outcome): ConceptRecord {
  const base: ConceptRecord = rec ?? { attempts: 0, correct: 0, firstSeen: o.at, lastSeen: o.at, recent: [] };
  const recent = [...base.recent, o].slice(-RECENT_CAP);
  return {
    attempts: base.attempts + 1,
    correct: base.correct + (o.correct ? 1 : 0),
    firstSeen: Math.min(base.firstSeen, o.at),
    lastSeen: Math.max(base.lastSeen, o.at),
    recent,
  };
}

/** Evidence contributed by one outcome. */
export function evidenceOf(o: Outcome, now: number): { a: number; b: number } {
  const age = Math.max(0, (now - o.at) / DAY);
  const decay = Math.pow(0.5, age / HALF_LIFE_DAYS);
  const d = Math.min(5, Math.max(1, o.difficulty));
  return o.correct ? { a: (0.6 + 0.1 * d) * decay, b: 0 } : { a: 0, b: (0.6 + 0.1 * (6 - d)) * decay };
}

const MIN_EVIDENCE = 2.5;
const MIN_ATTEMPTS = 3;

export function statusFrom(alpha: number, beta: number, attempts: number, trend: number | null): MasteryStatus {
  if (attempts === 0) return 'not_studied';
  const evidence = alpha + beta - 2;
  if (attempts < MIN_ATTEMPTS || evidence < MIN_EVIDENCE) return 'insufficient';
  const mean = alpha / (alpha + beta);
  const sd = Math.sqrt((alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)));
  if (mean - 0.84 * sd >= 0.7 && mean >= 0.8) return 'strong';
  if (trend !== null && trend >= 0.25) return 'improving';
  if (mean < 0.6) return 'needs_revision';
  return 'developing';
}

/** Recent-half accuracy minus earlier-half accuracy, or null with < 6 outcomes. */
export function trendOf(recent: Outcome[]): number | null {
  if (recent.length < 6) return null;
  const mid = Math.floor(recent.length / 2);
  const acc = (xs: Outcome[]) => xs.filter((x) => x.correct).length / xs.length;
  return acc(recent.slice(mid)) - acc(recent.slice(0, mid));
}

export function estimate(recs: (ConceptRecord | undefined)[], now: number): Estimate {
  let alpha = 1;
  let beta = 1;
  let attempts = 0;
  let correct = 0;
  const recent: Outcome[] = [];
  for (const r of recs) {
    if (!r) continue;
    attempts += r.attempts;
    correct += r.correct;
    for (const o of r.recent) {
      const e = evidenceOf(o, now);
      alpha += e.a;
      beta += e.b;
      recent.push(o);
    }
  }
  recent.sort((x, y) => x.at - y.at);
  const status = statusFrom(alpha, beta, attempts, trendOf(recent.slice(-RECENT_CAP)));
  return {
    attempts,
    correct,
    accuracy: attempts ? correct / attempts : null,
    mastery: attempts ? alpha / (alpha + beta) : null,
    evidence: alpha + beta - 2,
    alpha,
    beta,
    status,
  };
}

/** Priority for revision: higher = weaker with more confidence. Null when evidence is too thin. */
export function weaknessScore(e: Estimate): number | null {
  if (e.status === 'not_studied' || e.status === 'insufficient' || e.mastery === null) return null;
  const confidence = Math.min(1, e.evidence / 6);
  return (1 - e.mastery) * confidence;
}
