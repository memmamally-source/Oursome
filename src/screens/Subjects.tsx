import { Link, useParams } from 'react-router';
import { Icon } from '@/components/Icon';
import { Bar, Empty, PageHeader, StatusBadge, pct } from '@/components/ui';
import { content } from '@/content';
import type { DisciplineId, SystemId } from '@/content/schema';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { byConcept, byTopic, coverage, disciplineWithinSystem, type Node } from '@/engine/analysis';
import { gamesFor } from '@/engine/plan';
import { getGame } from '@/features/games/registry';
import { useAnalysis } from '@/state/derived';
import { useNow } from '@/state/clock';
import { useProgress } from '@/state/progress';

export function Subjects() {
  const a = useAnalysis();
  return (
    <div className="stack-lg">
      <PageHeader title="Subjects" eyebrow="Step 1 syllabus" />
      <section className="stack">
        <h2>By discipline</h2>
        <NodeList nodes={a.disciplines} kind="discipline" />
      </section>
      <section className="stack">
        <h2>By organ system</h2>
        <NodeList nodes={a.systems} kind="system" />
      </section>
    </div>
  );
}

function NodeList({ nodes, kind }: { nodes: Node[]; kind: 'discipline' | 'system' | 'topic' | 'concept' }) {
  const records = useProgress((s) => s.concepts);
  return (
    <div className="card" style={{ padding: '4px 18px' }}>
      <ul className="list">
        {nodes.map((n) => {
          const seen = n.conceptIds.filter((id) => records[id]).length;
          const href = kind === 'concept' ? `/learn/${n.id}` : kind === 'topic' ? `/subjects/topic/${n.id}` : `/subjects/${kind}/${n.id}`;
          return (
            <li key={n.id}>
              <Link to={href} className="mastery-row" style={{ textDecoration: 'none' }}>
                <div className="stack-sm" style={{ gap: 6 }}>
                  <div className="meta">
                    <strong>{n.title}</strong>
                    <StatusBadge status={n.estimate.status} />
                  </div>
                  <Bar value={n.estimate.accuracy ?? 0} label={`${n.title} accuracy`} />
                  <span className="tiny muted">
                    {n.estimate.attempts ? `${pct(n.estimate.accuracy)} accuracy · ${n.estimate.attempts} answers · ` : ''}
                    {seen}/{n.conceptIds.length} concepts studied
                  </span>
                </div>
                <Icon name="chevron" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SubjectDetail() {
  const { kind, id } = useParams<{ kind: 'discipline' | 'system' | 'topic'; id: string }>();
  const records = useProgress((s) => s.concepts);
  const now = useNow();
  if (!kind || !id) return null;
  const title = kind === 'discipline' ? DISCIPLINES[id as DisciplineId]?.title : kind === 'system' ? SYSTEMS[id as SystemId]?.title : content.topicTitle(id);
  const q = kind === 'discipline' ? { discipline: id as DisciplineId } : kind === 'system' ? { system: id as SystemId } : { topic: id };
  const inScope = (c: Parameters<typeof content.conceptMatches>[0]) => content.conceptMatches(c, q);
  const topics = kind === 'topic' ? [] : byTopic(content, records, now, inScope);
  const concepts = byConcept(content, records, now, inScope);
  const cov = coverage(content, records, inScope);
  const games = gamesFor(content, q);
  const focusParam = kind === 'discipline' ? `discipline=${id}` : kind === 'system' ? `system=${id}` : `topic=${id}`;

  return (
    <div className="stack-lg">
      <PageHeader title={title ?? id} eyebrow={kind === 'topic' ? 'Topic' : kind === 'system' ? 'Organ system' : 'Discipline'} back="/subjects">
        <p className="small muted">
          Coverage: {cov.seen} of {cov.total} concepts studied
        </p>
      </PageHeader>
      {!concepts.length ? (
        <Empty>No content in this area yet.</Empty>
      ) : (
        <>
          <section className="stack">
            <h2>Play this subject</h2>
            <div className="row-wrap">
              {games.map((g) => (
                <Link key={g} to={`/play/${g}?${focusParam}`} className="btn btn-ghost">
                  {getGame(g)?.title}
                </Link>
              ))}
            </div>
          </section>
          {kind === 'system' && (
            <section className="stack">
              <h2>Disciplines within {title}</h2>
              <NodeList nodes={disciplineWithinSystem(content, records, now, id as SystemId)} kind="discipline" />
            </section>
          )}
          {topics.length > 0 && (
            <section className="stack">
              <h2>Topics</h2>
              <NodeList nodes={topics} kind="topic" />
            </section>
          )}
          <section className="stack">
            <h2>Concepts</h2>
            <NodeList nodes={concepts} kind="concept" />
          </section>
        </>
      )}
    </div>
  );
}
