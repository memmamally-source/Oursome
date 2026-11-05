/**
 * Medical content schema. Content is data, separate from game logic: every game reads the same
 * concepts and items, and every item links back to one or more concepts so analytics can roll up
 * performance to concept → topic → organ system → discipline.
 *
 * See CONTENT_SCHEMA.md for the field-by-field description.
 */
import type { PackageId } from '@/config/packages';

export type DisciplineId =
  | 'anatomy'
  | 'embryology'
  | 'physiology'
  | 'biochemistry'
  | 'genetics'
  | 'cell-biology'
  | 'histology'
  | 'pathology'
  | 'pharmacology'
  | 'microbiology'
  | 'immunology'
  | 'behavioral'
  | 'biostatistics'
  | 'ethics'
  | 'nutrition';

export type SystemId =
  | 'general'
  | 'blood-immune'
  | 'nervous-behavioral'
  | 'musculoskeletal-skin'
  | 'cardiovascular'
  | 'respiratory'
  | 'renal'
  | 'gastrointestinal'
  | 'reproductive'
  | 'endocrine'
  | 'multisystem'
  | 'biostats-epi'
  | 'social-sciences';

/** 1 = recall of a core fact … 5 = multi-step application. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Editorial lifecycle. Only `published` reaches learners in a production build. Everything authored
 * so far is `draft` with provenance `ai-drafted`: it has NOT been medically reviewed.
 */
export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'retired';

export interface ReviewInfo {
  status: ReviewStatus;
  provenance: 'ai-drafted' | 'human-authored' | 'imported';
  reviewedBy?: string;
  reviewedAt?: string; // ISO date
  notes?: string;
}

export interface Topic {
  id: string;
  title: string;
  system: SystemId;
  discipline: DisciplineId;
}

/** A reference to an entry in the source register (`sources.ts`), with an optional locator. */
export interface Citation {
  sourceId: string;
  locator?: string;
}

export interface Concept {
  id: string;
  title: string;
  packages: PackageId[];
  discipline: DisciplineId;
  /** Additional disciplines the concept also belongs to (multi-tagging). */
  alsoDisciplines?: DisciplineId[];
  system: SystemId;
  alsoSystems?: SystemId[];
  topic: string; // Topic.id
  difficulty: Difficulty;
  objectives: string[];
  facts: string[];
  mechanism: string;
  associations: string[];
  misconception: string;
  /** 10–20 second read. */
  quick: string;
  /** Structured deeper explanation (paragraphs). */
  detailed: string[];
  takeaway: string;
  related: string[]; // Concept ids
  citations: Citation[];
  review: ReviewInfo;
  version: number;
  updatedAt: string;
}

interface ItemBase {
  id: string;
  conceptIds: string[];
  difficulty: Difficulty;
  review: ReviewInfo;
  version: number;
}

export interface McqOption {
  id: string;
  text: string;
  /** Why this option is not the best answer (required for every distractor). */
  whyWrong?: string;
}

/** Single-best-answer question: used by Survival, Review and (later) Step 1 Challenge. */
export interface McqItem extends ItemBase {
  kind: 'mcq';
  stem: string;
  options: McqOption[];
  answerId: string;
  mini: string;
  mechanism: string;
  takeaway: string;
  estSeconds: number;
}

/** Fact or Fiction statement. */
export interface TrueFalseItem extends ItemBase {
  kind: 'tf';
  statement: string;
  isTrue: boolean;
  /** For false statements, the corrected fact. For true ones, a one-line reinforcement. */
  correction: string;
  mini: string;
}

/** Crossword entry: answer is A–Z only, stored upper-case. */
export interface ClueItem extends ItemBase {
  kind: 'clue';
  answer: string;
  /** Shown to the solver (no enumeration; the grid gives the length). */
  clue: string;
  mini: string;
}

/** A Connections group: a defensible category plus 4+ candidate members. Puzzles pick 4 of them. */
export interface ConnectionGroup extends ItemBase {
  kind: 'group';
  label: string;
  members: string[];
  explanation: string;
  /** 1 = most obvious group … 4 = trickiest. Drives colour/order. */
  tier: 1 | 2 | 3 | 4;
}

export interface CaseStage {
  label: 'Presentation' | 'History' | 'Examination' | 'Laboratory' | 'Imaging & tests' | 'Further clue';
  text: string;
}

/** Mystery Patient case: progressive reveal, then a mechanism-focused single-best-answer question. */
export interface CaseItem extends ItemBase {
  kind: 'case';
  title: string;
  stages: CaseStage[];
  question: string;
  options: McqOption[];
  answerId: string;
  explanation: string;
  mechanism: string;
  takeaway: string;
  differentials: { name: string; why: string }[];
}

export type GameItem = McqItem | TrueFalseItem | ClueItem | ConnectionGroup | CaseItem;
