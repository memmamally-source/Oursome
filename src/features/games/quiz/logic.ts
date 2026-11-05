/** Item selection for Fact or Fiction and Spaced Review. */
import type { ContentRepo } from '@/content/repo';
import type { McqItem, TrueFalseItem } from '@/content/schema';
import type { LearningEvent } from '@/engine/events';
import { shuffle } from '@/engine/random';

export type QuizItem = McqItem | TrueFalseItem;

/** Most recent item answered for each concept. */
export function lastItemByConcept(log: LearningEvent[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of log) if (e.type === 'answer_submitted') for (const c of e.conceptIds) out.set(c, e.itemId);
  return out;
}

/**
 * One item per due concept. Prefers a different item (and a different format) from the one last
 * answered, so review tests recall of the concept rather than of a single question.
 */
export function reviewItems(repo: ContentRepo, conceptIds: string[], log: LearningEvent[], rnd: () => number, max = 10): QuizItem[] {
  const last = lastItemByConcept(log);
  const out: QuizItem[] = [];
  for (const cid of conceptIds.slice(0, max)) {
    const options: QuizItem[] = [...repo.itemsOf('mcq', { conceptIds: [cid] }), ...repo.itemsOf('tf', { conceptIds: [cid] })];
    if (!options.length) continue;
    const prevId = last.get(cid);
    const prevKind = options.find((o) => o.id === prevId)?.kind;
    const ranked = shuffle(options, rnd).sort((a, b) => score(a) - score(b));
    function score(i: QuizItem) {
      return (i.id === prevId ? 2 : 0) + (i.kind === prevKind ? 1 : 0);
    }
    out.push(ranked[0]!);
  }
  return out;
}

export function factOrFictionRound(repo: ContentRepo, rnd: () => number, n = 10, q = {}): TrueFalseItem[] {
  const pool = repo.itemsOf('tf', q);
  // Aim for a mix of true and false statements.
  const t = shuffle(pool.filter((i) => i.isTrue), rnd);
  const f = shuffle(pool.filter((i) => !i.isTrue), rnd);
  const half = Math.floor(n / 2);
  return shuffle([...t.slice(0, Math.max(half, n - f.length)), ...f.slice(0, Math.max(n - half, n - t.length))].slice(0, n), rnd);
}
