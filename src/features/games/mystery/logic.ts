/**
 * Mystery Patient scoring: reward correct reasoning first, efficient use of clues second.
 * A correct answer scores 100 with only the presentation, minus 15 per extra clue, never below 30.
 * A wrong answer scores 0, then the full case and explanation are shown.
 */
import type { CaseItem } from '@/content/schema';
import { dateKey, seeded } from '@/engine/random';

export function mysteryScore(correct: boolean, revealed: number): number {
  if (!correct) return 0;
  return Math.max(30, 100 - 15 * (revealed - 1));
}

export function dailyCase(cases: CaseItem[], date = dateKey(), pkg = 'step1'): CaseItem | undefined {
  if (!cases.length) return undefined;
  const sorted = [...cases].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[Math.floor(seeded(`${pkg}:${date}:mystery`)() * sorted.length)];
}
