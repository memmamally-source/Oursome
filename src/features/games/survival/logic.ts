/**
 * Medical Survival: three lives, difficulty rises every three correct answers. Accuracy drives
 * the score; the optional timer adds at most a 20% bonus and never costs points.
 */
import type { McqItem, TrueFalseItem } from '@/content/schema';

export type SurvivalItem = McqItem | TrueFalseItem;

export interface SurvivalState {
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  used: string[];
  level: number; // 1–5 target difficulty
}

export const START_LIVES = 3;

export const initialSurvival = (): SurvivalState => ({ lives: START_LIVES, score: 0, streak: 0, bestStreak: 0, correct: 0, answered: 0, used: [], level: 1 });

export function levelFor(correct: number): number {
  return Math.min(5, 1 + Math.floor(correct / 3));
}

/** Next unused item closest to the target difficulty (ties broken by `rnd`). */
export function pickNext(pool: SurvivalItem[], s: SurvivalState, rnd: () => number): SurvivalItem | null {
  const unused = pool.filter((i) => !s.used.includes(i.id));
  if (!unused.length) return null;
  let best: SurvivalItem[] = [];
  let bestGap = Infinity;
  for (const i of unused) {
    const gap = Math.abs(i.difficulty - s.level);
    if (gap < bestGap) {
      bestGap = gap;
      best = [i];
    } else if (gap === bestGap) best.push(i);
  }
  return best[Math.floor(rnd() * best.length)]!;
}

export function pointsFor(difficulty: number, streak: number, timeFraction: number | null): number {
  const base = 100 * difficulty;
  const streakBonus = Math.min(0.5, 0.1 * streak);
  const timeBonus = timeFraction === null ? 0 : 0.2 * Math.max(0, Math.min(1, timeFraction));
  return Math.round(base * (1 + streakBonus + timeBonus));
}

/** `timeFraction`: share of the time limit remaining, or null when untimed. */
export function answerSurvival(s: SurvivalState, item: SurvivalItem, correct: boolean, timeFraction: number | null): SurvivalState {
  const used = [...s.used, item.id];
  if (!correct) return { ...s, used, lives: s.lives - 1, streak: 0, answered: s.answered + 1 };
  const nextCorrect = s.correct + 1;
  const streak = s.streak + 1;
  return {
    ...s,
    used,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    correct: nextCorrect,
    answered: s.answered + 1,
    score: s.score + pointsFor(item.difficulty, s.streak, timeFraction),
    level: levelFor(nextCorrect),
  };
}

export function isOver(s: SurvivalState, pool: SurvivalItem[]): boolean {
  return s.lives <= 0 || pool.every((i) => s.used.includes(i.id));
}
