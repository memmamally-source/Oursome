/**
 * Authoring helpers. A concept is written once with its items alongside it, then split into
 * normalised Concept and GameItem records with stable ids (`<conceptId>:mcq1`, `:tf1`, `:clue1`).
 * Never reorder an existing concept's items: ids are how learner history links to content.
 */
import type {
  ClueItem,
  Concept,
  Difficulty,
  GameItem,
  McqItem,
  ReviewInfo,
  TrueFalseItem,
} from './schema';

export const AI_DRAFT: ReviewInfo = { status: 'draft', provenance: 'ai-drafted' };
const AUTHORED = '2026-11-05';

type Opt = [id: string, text: string, whyWrong?: string];

export interface McqDraft {
  stem: string;
  options: Opt[];
  answer: string;
  mini: string;
  mechanism?: string;
  takeaway?: string;
  difficulty?: Difficulty;
  estSeconds?: number;
}

export interface TfDraft {
  statement: string;
  isTrue: boolean;
  correction: string;
  difficulty?: Difficulty;
}

export interface ClueDraft {
  answer: string;
  clue: string;
  difficulty?: Difficulty;
}

export type ConceptDraft = Omit<Concept, 'packages' | 'review' | 'version' | 'updatedAt' | 'citations'> & {
  citations?: Concept['citations'];
  mcq?: McqDraft[];
  tf?: TfDraft[];
  clues?: ClueDraft[];
};

export interface Bundle {
  concepts: Concept[];
  items: GameItem[];
}

export function defineConcepts(drafts: ConceptDraft[]): Bundle {
  const concepts: Concept[] = [];
  const items: GameItem[] = [];
  for (const d of drafts) {
    const { mcq = [], tf = [], clues = [], citations = [], ...rest } = d;
    concepts.push({
      ...rest,
      citations,
      packages: ['step1'],
      review: AI_DRAFT,
      version: 1,
      updatedAt: AUTHORED,
    });
    mcq.forEach((m, i) => {
      const item: McqItem = {
        kind: 'mcq',
        id: `${d.id}:mcq${i + 1}`,
        conceptIds: [d.id],
        difficulty: m.difficulty ?? d.difficulty,
        review: AI_DRAFT,
        version: 1,
        stem: m.stem,
        options: m.options.map(([id, text, whyWrong]) => ({ id, text, whyWrong })),
        answerId: m.answer,
        mini: m.mini,
        mechanism: m.mechanism ?? d.mechanism,
        takeaway: m.takeaway ?? d.takeaway,
        estSeconds: m.estSeconds ?? 45,
      };
      items.push(item);
    });
    tf.forEach((t, i) => {
      const item: TrueFalseItem = {
        kind: 'tf',
        id: `${d.id}:tf${i + 1}`,
        conceptIds: [d.id],
        difficulty: t.difficulty ?? d.difficulty,
        review: AI_DRAFT,
        version: 1,
        statement: t.statement,
        isTrue: t.isTrue,
        correction: t.correction,
        mini: d.quick,
      };
      items.push(item);
    });
    clues.forEach((c, i) => {
      const item: ClueItem = {
        kind: 'clue',
        id: `${d.id}:clue${i + 1}`,
        conceptIds: [d.id],
        difficulty: c.difficulty ?? d.difficulty,
        review: AI_DRAFT,
        version: 1,
        answer: c.answer.toUpperCase(),
        clue: c.clue,
        mini: d.quick,
      };
      items.push(item);
    });
  }
  return { concepts, items };
}
