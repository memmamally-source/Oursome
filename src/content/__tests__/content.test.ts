import { ALL_CONCEPTS, ALL_ITEMS } from '@/content';
import { ContentRepo, PUBLISHED_ONLY, REVIEWER_PREVIEW } from '@/content/repo';
import { CONNECTION_GROUPS } from '@/content/step1/connections';
import { validateContent } from '@/content/validate';
import { buildConnections } from '@/features/games/connections/logic';
import { seeded } from '@/engine/random';

describe('content bank', () => {
  it('passes every automated QA check', () => {
    expect(validateContent(ALL_CONCEPTS, ALL_ITEMS)).toEqual([]);
  });

  it('has a meaningful starter library', () => {
    expect(ALL_CONCEPTS.length).toBeGreaterThanOrEqual(40);
    const kinds = (k: string) => ALL_ITEMS.filter((i) => i.kind === k).length;
    expect(kinds('mcq')).toBeGreaterThanOrEqual(40);
    expect(kinds('tf')).toBeGreaterThanOrEqual(40);
    expect(kinds('clue')).toBeGreaterThanOrEqual(40);
    expect(kinds('group')).toBeGreaterThanOrEqual(16);
    expect(kinds('case')).toBeGreaterThanOrEqual(5);
  });

  it('marks all AI-drafted content as unreviewed drafts', () => {
    for (const c of ALL_CONCEPTS) expect(c.review).toMatchObject({ status: 'draft', provenance: 'ai-drafted' });
    for (const i of ALL_ITEMS) expect(i.review.status).toBe('draft');
  });

  it('hides unreviewed content in a published-only build', () => {
    const repo = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, PUBLISHED_ONLY);
    expect(repo.concepts).toHaveLength(0);
    expect(repo.items).toHaveLength(0);
    expect(repo.isPreview).toBe(false);
  });

  it('shows a published item only when its concepts are published too', () => {
    const concept = { ...ALL_CONCEPTS[0]!, review: { status: 'published' as const, provenance: 'ai-drafted' as const } };
    const item = ALL_ITEMS.find((i) => i.conceptIds[0] === concept.id)!;
    const pubItem = { ...item, review: { ...item.review, status: 'published' as const } };
    const repo = new ContentRepo([concept, ...ALL_CONCEPTS.slice(1)], [pubItem], PUBLISHED_ONLY);
    expect(repo.items.map((i) => i.id)).toEqual([pubItem.id]);
  });

  it('filters items by topic, discipline and system', () => {
    const repo = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, REVIEWER_PREVIEW);
    const anti = repo.itemsOf('mcq', { topic: 'cv-antiarrhythmics' });
    expect(anti.length).toBeGreaterThan(0);
    expect(anti.every((i) => repo.concept(i.conceptIds[0]!)?.topic === 'cv-antiarrhythmics')).toBe(true);
    // Multi-tagging: G6PD is biochemistry primarily but also pathology.
    expect(repo.conceptsWhere({ discipline: 'pathology' }).some((c) => c.id === 'g6pd')).toBe(true);
  });

  it('can build many distinct, fair Connections puzzles from the bank', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const p = buildConnections(CONNECTION_GROUPS, seeded(`t${i}`));
      expect(p).not.toBeNull();
      seen.add(p!.groups.map((g) => g.id).sort().join());
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
