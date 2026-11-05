import { PageHeader } from '@/components/ui';
import { Brand } from '@/config/brand';
import { ALL_CONCEPTS, ALL_ITEMS, content } from '@/content';
import { SOURCES } from '@/content/sources';
import { BLUEPRINT_VERIFIED, DISCIPLINES } from '@/content/taxonomy';

/** Transparency page: review status, source register and what the app does not claim. */
export function About() {
  const statuses = ALL_ITEMS.reduce<Record<string, number>>((m, i) => ((m[i.review.status] = (m[i.review.status] ?? 0) + 1), m), {});
  return (
    <div className="stack-lg" style={{ maxWidth: 820 }}>
      <PageHeader title="Content & sources" eyebrow={Brand.name} back={true} />
      <section className="card stack-sm">
        <h2>Medical review status</h2>
        <p>
          {ALL_CONCEPTS.length} concepts and {ALL_ITEMS.length} game items exist in this build. Every one is an original, AI-drafted record marked
          <strong> draft</strong>: none has yet been approved by a medical reviewer.
          {content.isPreview ? ' You are viewing a reviewer preview that includes drafts.' : ' Learners only see published content.'}
        </p>
        <p className="small muted">By status: {Object.entries(statuses).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
        <p className="small muted">
          Questions are written from general medical knowledge and checked against open references. Nothing is copied from commercial question banks, review books or recalled exam items.
        </p>
      </section>
      <section className="card stack-sm">
        <h2>Step 1 blueprint alignment</h2>
        <p className="small">
          Discipline weightings used for coverage are {BLUEPRINT_VERIFIED ? 'verified against' : 'provisional pending verification against'} the official USMLE content outline.
        </p>
        <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>
          {Object.values(DISCIPLINES)
            .filter((d) => d.range)
            .map((d) => (
              <li key={d.title}>
                {d.title}: {d.range![0]}–{d.range![1]}%
              </li>
            ))}
        </ul>
        <p className="tiny muted">The app never predicts pass/fail or exam scores.</p>
      </section>
      <section className="stack">
        <h2>Source register</h2>
        {SOURCES.map((s) => (
          <article key={s.id} className="card card-tight stack-sm" style={{ gap: 4 }}>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 6 }}>
              <a href={s.url} target="_blank" rel="noreferrer">
                <strong>{s.name}</strong>
              </a>
              <span className={`badge ${s.reuse === 'cite-only' ? 'badge-warn' : s.reuse === 'per-item' ? '' : 'badge-ok'}`}>{s.reuse.replace(/-/g, ' ')}</span>
            </div>
            <span className="small">{s.type} · {s.licence}</span>
            <span className="tiny muted">
              Access: {s.access}. Attribution: {s.attribution}. Reviewed {s.lastReviewed}
              {s.verifiedLive ? '' : ' (licence page not re-opened in this review)'}.
            </span>
            {s.notes && <span className="tiny muted">{s.notes}</span>}
          </article>
        ))}
      </section>
    </div>
  );
}
