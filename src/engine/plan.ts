/**
 * Recommendations and personalised study plans (pure). Uses real learning data only: due
 * concepts, priority weaknesses, unfinished daily puzzles and unexplored topics. Learners can
 * always ignore the plan and pick any game.
 */
import type { ContentRepo, ItemQuery } from '@/content/repo';
import { GAMES, type GameId } from '@/features/games/registry';
import { priorityWeaknesses, type Records } from './analysis';
import { dateKey } from './random';
import type { Card } from './srs';

export interface PlanBlock {
  gameId: GameId;
  minutes: number;
  reason: string;
  /** Focus passed to the game as a route query. */
  focus?: { topic?: string; concept?: string };
  /** Opens today's daily puzzle. */
  daily?: boolean;
}

export interface PlanInput {
  repo: ContentRepo;
  records: Records;
  srs: Record<string, Card>;
  dailyDone: Set<string>; // `${date}:${gameId}`
  minutes: number;
  now: number;
}

export function dueConcepts(srs: Record<string, Card>, repo: ContentRepo, now: number): string[] {
  return Object.entries(srs)
    .filter(([id, c]) => c.due <= now && repo.concept(id))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** Playable games that have content for a focus (topic or concept). */
export function gamesFor(repo: ContentRepo, q: ItemQuery): GameId[] {
  const out: GameId[] = [];
  for (const g of GAMES) {
    if (g.status !== 'playable' || g.id === 'review') continue;
    const n = g.uses.reduce((t, k) => t + repo.itemsOf(k, q).length, 0);
    // Connections needs whole groups; crossword needs several clues.
    const enough = g.id === 'connections' ? n >= 1 : g.id === 'crossword' ? n >= 3 : n >= 1;
    if (enough) out.push(g.id);
  }
  return out;
}

const minutesOf = (id: GameId) => GAMES.find((g) => g.id === id)?.minutes ?? 3;

export function buildPlan({ repo, records, srs, dailyDone, minutes, now }: PlanInput): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  let left = minutes;
  const push = (b: PlanBlock) => {
    if (left <= 0) return;
    const m = Math.min(b.minutes, left);
    blocks.push({ ...b, minutes: m });
    left -= m;
  };

  const due = dueConcepts(srs, repo, now);
  if (due.length) push({ gameId: 'review', minutes: Math.min(5, Math.max(2, Math.ceil(due.length / 3))), reason: `${due.length} concept${due.length === 1 ? '' : 's'} due for review` });

  for (const w of priorityWeaknesses(repo, records, now, 2)) {
    const q: ItemQuery = w.level === 'concept' ? { conceptIds: [w.id] } : { topic: w.id };
    const options = gamesFor(repo, q).filter((g) => !blocks.some((b) => b.gameId === g));
    const pick = options.find((g) => g === 'survival') ?? options[0];
    if (pick) push({ gameId: pick, minutes: minutesOf(pick), reason: `Weak area: ${w.title}`, focus: w.level === 'concept' ? { concept: w.id } : { topic: w.id } });
  }

  const today = dateKey(now);
  for (const g of GAMES.filter((x) => x.daily && x.status === 'playable')) {
    if (left <= 0) break;
    if (dailyDone.has(`${today}:${g.id}`) || blocks.some((b) => b.gameId === g.id)) continue;
    push({ gameId: g.id, minutes: g.minutes, reason: `Today’s daily ${g.title}`, daily: true });
  }

  // Fill with an unexplored topic so coverage grows.
  if (left > 0) {
    const unseen = repo.concepts.find((c) => !records[c.id]);
    if (unseen) push({ gameId: 'survival', minutes: Math.min(left, 4), reason: `New topic: ${repo.topicTitle(unseen.topic)}`, focus: { topic: unseen.topic } });
  }
  if (left > 0) push({ gameId: 'fact-fiction', minutes: left, reason: 'Quick mixed recall' });
  return blocks;
}

/** The single best next activity for the Home screen. */
export function nextActivity(input: Omit<PlanInput, 'minutes'>): PlanBlock | undefined {
  return buildPlan({ ...input, minutes: 5 })[0];
}
