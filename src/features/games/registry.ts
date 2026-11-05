/**
 * The 12-game library. `status` is honest: only `playable` games have working mechanics. Planned
 * games are shown as "In development" and cannot be opened.
 */
export type GameId =
  | 'crossword'
  | 'connections'
  | 'mystery'
  | 'survival'
  | 'mechanism'
  | 'micro-hunt'
  | 'pharm-match'
  | 'biostats'
  | 'genetics'
  | 'pathology'
  | 'fact-fiction'
  | 'challenge'
  | 'review';

export interface GameMeta {
  id: GameId;
  title: string;
  blurb: string;
  minutes: number;
  status: 'playable' | 'planned';
  /** Which experiences it suits. */
  modes: ('relax' | 'learn' | 'challenge')[];
  daily?: boolean;
  /** Content kinds the game consumes (for recommending it for a topic). */
  uses: ('mcq' | 'tf' | 'clue' | 'group' | 'case')[];
}

export const GAMES: GameMeta[] = [
  { id: 'crossword', title: 'Medical Crossword', blurb: 'Daily Mini and subject crosswords with original clues.', minutes: 4, status: 'playable', modes: ['relax', 'learn'], daily: true, uses: ['clue'] },
  { id: 'connections', title: 'Medical Connections', blurb: 'Sixteen terms, four hidden groups of four.', minutes: 4, status: 'playable', modes: ['relax', 'learn'], daily: true, uses: ['group'] },
  { id: 'mystery', title: 'Mystery Patient', blurb: 'Reveal the case clue by clue and name the mechanism.', minutes: 5, status: 'playable', modes: ['learn', 'challenge'], daily: true, uses: ['case'] },
  { id: 'survival', title: 'Medical Survival', blurb: 'Three lives. Rising difficulty. How far can you go?', minutes: 4, status: 'playable', modes: ['challenge', 'learn'], uses: ['mcq', 'tf'] },
  { id: 'fact-fiction', title: 'Fact or Fiction', blurb: 'Quick true-or-false calls with instant explanations.', minutes: 2, status: 'playable', modes: ['relax'], uses: ['tf'] },
  { id: 'review', title: 'Spaced Review', blurb: 'Concepts due today, asked a different way.', minutes: 3, status: 'playable', modes: ['learn'], uses: ['mcq', 'tf'] },
  { id: 'mechanism', title: 'Mechanism Lab', blurb: 'Rebuild pathways and cascades step by step.', minutes: 4, status: 'planned', modes: ['learn'], uses: [] },
  { id: 'micro-hunt', title: 'Microbiology Hunt', blurb: 'Identify the organism from progressive lab clues.', minutes: 4, status: 'planned', modes: ['relax', 'learn'], uses: [] },
  { id: 'pharm-match', title: 'Pharmacology Match', blurb: 'Match drugs to mechanisms, receptors and toxicities.', minutes: 3, status: 'planned', modes: ['relax', 'challenge'], uses: [] },
  { id: 'biostats', title: 'Biostatistics Blitz', blurb: 'Calculate, interpret and spot the bias.', minutes: 4, status: 'planned', modes: ['learn'], uses: [] },
  { id: 'genetics', title: 'Genetics Detective', blurb: 'Read pedigrees and find the mutation.', minutes: 4, status: 'planned', modes: ['learn'], uses: [] },
  { id: 'pathology', title: 'Pathology Spotlight', blurb: 'Recognise licensed histology and gross images.', minutes: 4, status: 'planned', modes: ['learn'], uses: [] },
  { id: 'challenge', title: 'Step 1 Challenge', blurb: 'Exam-style blocks with tutor and timed modes.', minutes: 10, status: 'planned', modes: ['learn', 'challenge'], uses: [] },
];

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
