/**
 * Content repository: the only way screens and games read medical content.
 * Publication policy: a production build shows only `published` content unless it is explicitly a
 * reviewer preview (VITE_ALLOW_UNREVIEWED=true). Development and tests include drafts.
 */
import type { PackageId } from '@/config/packages';
import type {
  CaseItem,
  ClueItem,
  Concept,
  ConnectionGroup,
  DisciplineId,
  GameItem,
  McqItem,
  ReviewStatus,
  SystemId,
  TrueFalseItem,
} from './schema';
import { getTopic } from './taxonomy';

export interface ContentPolicy {
  /** Statuses visible to learners. */
  visible: ReviewStatus[];
}

export const PUBLISHED_ONLY: ContentPolicy = { visible: ['published'] };
export const REVIEWER_PREVIEW: ContentPolicy = { visible: ['draft', 'in_review', 'approved', 'published'] };

export interface Classification {
  discipline: DisciplineId;
  system: SystemId;
  topic: string;
}

type KindMap = { mcq: McqItem; tf: TrueFalseItem; clue: ClueItem; group: ConnectionGroup; case: CaseItem };

export interface ItemQuery {
  conceptIds?: string[];
  topic?: string;
  discipline?: DisciplineId;
  system?: SystemId;
}

export class ContentRepo {
  private conceptMap: Map<string, Concept>;
  readonly concepts: Concept[];
  readonly items: GameItem[];

  constructor(allConcepts: Concept[], allItems: GameItem[], readonly policy: ContentPolicy, readonly pkg: PackageId = 'step1') {
    const ok = (s: ReviewStatus) => policy.visible.includes(s);
    this.concepts = allConcepts.filter((c) => c.packages.includes(pkg) && ok(c.review.status));
    this.conceptMap = new Map(this.concepts.map((c) => [c.id, c]));
    // An item is visible only if it and every concept it links to are visible.
    this.items = allItems.filter((i) => ok(i.review.status) && i.conceptIds.every((id) => this.conceptMap.has(id)));
  }

  get isPreview(): boolean {
    return this.policy.visible.some((s) => s !== 'published');
  }

  concept(id: string): Concept | undefined {
    return this.conceptMap.get(id);
  }

  item(id: string): GameItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Classification of an item = its first (primary) concept's tags. */
  classify(item: Pick<GameItem, 'conceptIds'>): Classification | undefined {
    const c = item.conceptIds[0] ? this.conceptMap.get(item.conceptIds[0]) : undefined;
    return c ? { discipline: c.discipline, system: c.system, topic: c.topic } : undefined;
  }

  conceptMatches(c: Concept, q: ItemQuery): boolean {
    if (q.conceptIds && !q.conceptIds.includes(c.id)) return false;
    if (q.topic && c.topic !== q.topic) return false;
    if (q.discipline && c.discipline !== q.discipline && !c.alsoDisciplines?.includes(q.discipline)) return false;
    if (q.system && c.system !== q.system && !c.alsoSystems?.includes(q.system)) return false;
    return true;
  }

  conceptsWhere(q: ItemQuery): Concept[] {
    return this.concepts.filter((c) => this.conceptMatches(c, q));
  }

  itemsOf<K extends keyof KindMap>(kind: K, q: ItemQuery = {}): KindMap[K][] {
    const allowed = Object.keys(q).length ? new Set(this.conceptsWhere(q).map((c) => c.id)) : null;
    return this.items.filter(
      (i): i is KindMap[K] => i.kind === kind && (!allowed || i.conceptIds.some((id) => allowed.has(id))),
    );
  }

  topicTitle(id: string): string {
    return getTopic(id)?.title ?? id;
  }
}
