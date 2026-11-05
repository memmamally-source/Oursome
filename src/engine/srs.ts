/**
 * Spaced repetition at the CONCEPT level using the FSRS-4.5 model (Ye et al., open-spaced-repetition;
 * default published weights). We schedule concepts, not individual questions, and the review
 * session asks a different item for the concept where possible, so learners recall the idea rather
 * than memorising one question.
 *
 * Ratings: 1 Again (wrong), 2 Hard (right with a hint or slow), 3 Good (right), 4 Easy.
 */
export type Rating = 1 | 2 | 3 | 4;

export const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246,
  1.587, 0.2272, 2.8755,
] as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;
export const DESIRED_RETENTION = 0.9;
const DAY = 86_400_000;
const w = (i: number) => W[i]!;

export interface Card {
  stability: number; // days until R falls to 90%
  difficulty: number; // 1–10
  due: number; // epoch ms
  lastReview: number; // epoch ms
  reps: number;
  lapses: number;
}

const clampD = (d: number) => Math.min(10, Math.max(1, d));

export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

export function intervalDays(stability: number, retention = DESIRED_RETENTION): number {
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return Math.min(365, Math.max(1, Math.round(days)));
}

const initDifficulty = (g: Rating) => clampD(w(4) - Math.exp(w(5) * (g - 1)) + 1);

export function newCard(rating: Rating, now: number): Card {
  const stability = Math.max(0.1, w(rating - 1));
  const card: Card = { stability, difficulty: initDifficulty(rating), lastReview: now, reps: 1, lapses: rating === 1 ? 1 : 0, due: 0 };
  // A first miss comes back tomorrow; otherwise follow the model.
  card.due = now + (rating === 1 ? DAY : intervalDays(stability) * DAY);
  return card;
}

export function review(card: Card, rating: Rating, now: number): Card {
  const elapsed = Math.max(0, (now - card.lastReview) / DAY);
  const r = retrievability(elapsed, card.stability);
  const d = card.difficulty;
  const nextD = clampD(w(7) * initDifficulty(4) + (1 - w(7)) * (d - w(6) * (rating - 3)));
  let s: number;
  if (rating === 1) {
    s = w(11) * Math.pow(d, -w(12)) * (Math.pow(card.stability + 1, w(13)) - 1) * Math.exp(w(14) * (1 - r));
    s = Math.min(s, card.stability);
  } else {
    const hard = rating === 2 ? w(15) : 1;
    const easy = rating === 4 ? w(16) : 1;
    s = card.stability * (Math.exp(w(8)) * (11 - d) * Math.pow(card.stability, -w(9)) * (Math.exp(w(10) * (1 - r)) - 1) * hard * easy + 1);
  }
  s = Math.max(0.1, s);
  return {
    stability: s,
    difficulty: nextD,
    lastReview: now,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === 1 ? 1 : 0),
    due: now + (rating === 1 ? DAY : intervalDays(s) * DAY),
  };
}

/**
 * Apply an attempt outcome. Correct answers before the due date do not advance the schedule (that
 * would reward cramming); a wrong answer always counts as a lapse.
 */
export function applyAttempt(card: Card | undefined, rating: Rating, now: number): Card {
  if (!card) return newCard(rating, now);
  if (rating !== 1 && now < card.due) return card;
  return review(card, rating, now);
}

export function isDue(card: Card, now: number): boolean {
  return card.due <= now;
}
