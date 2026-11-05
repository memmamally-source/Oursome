import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { AnswerFeedback, QuestionCard, TeachSheet, expectedText, promptText } from '@/components/learning';
import { Empty, PageHeader, Sheet, StatusBadge } from '@/components/ui';
import { content } from '@/content';
import type { McqItem, TrueFalseItem } from '@/content/schema';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { estimate } from '@/engine/mastery';
import { mistakeResolved, type MistakeEntry } from '@/engine/progress';
import { getGame } from '@/features/games/registry';
import { useAnalysis } from '@/state/derived';
import { useNow } from '@/state/clock';
import { useProgress } from '@/state/progress';
import { useStudyContext } from '@/state/studyTimer';

type Sort = 'date' | 'frequency' | 'subject' | 'system' | 'game' | 'difficulty';

export function Review() {
  const a = useAnalysis();
  const mistakes = useProgress((s) => s.mistakes);
  const srs = useProgress((s) => s.srs);
  const saved = useProgress((s) => s.savedConcepts);
  const [sort, setSort] = useState<Sort>('date');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [retry, setRetry] = useState<MistakeEntry | null>(null);
  const [teach, setTeach] = useState<{ conceptId: string; itemId?: string } | null>(null);
  useStudyContext({ activity: 'mistakes' });

  const list = useMemo(() => {
    const xs = Object.values(mistakes).filter((m) => filter === 'all' || !mistakeResolved(m));
    const c0 = (m: MistakeEntry) => content.concept(m.conceptIds[0]!);
    const by: Record<Sort, (a: MistakeEntry, b: MistakeEntry) => number> = {
      date: (x, y) => y.lastAt - x.lastAt,
      frequency: (x, y) => y.count - x.count || y.lastAt - x.lastAt,
      subject: (x, y) => (c0(x)?.discipline ?? '').localeCompare(c0(y)?.discipline ?? ''),
      system: (x, y) => (c0(x)?.system ?? '').localeCompare(c0(y)?.system ?? ''),
      game: (x, y) => x.gameId.localeCompare(y.gameId),
      difficulty: (x, y) => y.difficulty - x.difficulty,
    };
    return xs.sort(by[sort]);
  }, [mistakes, sort, filter]);

  const nextDue = Object.values(srs).filter((c) => c.due > a.now).sort((x, y) => x.due - y.due)[0];

  return (
    <div className="stack-lg">
      <PageHeader title="Review" eyebrow="Spaced repetition and mistakes" />
      <section className="card card-accent stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>{a.due.length ? `${a.due.length} concept${a.due.length === 1 ? '' : 's'} due` : 'Nothing due right now'}</h2>
            <p className="small muted">
              {a.due.length
                ? 'Each concept is asked a different way from last time, so you recall the idea, not the question.'
                : nextDue
                  ? `Next review ${new Date(nextDue.due).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}.`
                  : 'Play any game and missed concepts will be scheduled here automatically.'}
            </p>
          </div>
          {a.due.length > 0 && (
            <Link to="/play/review" className="btn btn-primary">
              Start review
            </Link>
          )}
        </div>
      </section>

      <section className="stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h2>My Mistakes</h2>
          <div className="row-wrap">
            <label className="row small" style={{ gap: 6 }}>
              Sort
              <select className="input" style={{ minHeight: 36, padding: '4px 8px' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="date">Most recent</option>
                <option value="frequency">Most repeated</option>
                <option value="subject">Subject</option>
                <option value="system">Organ system</option>
                <option value="game">Game</option>
                <option value="difficulty">Difficulty</option>
              </select>
            </label>
            <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter(filter === 'all' ? 'open' : 'all')}>
              Include corrected
            </button>
          </div>
        </div>
        {!list.length ? (
          <Empty>{Object.keys(mistakes).length ? 'Every mistake has been corrected since. Nice work.' : 'No mistakes yet. Every wrong answer will be saved here with its explanation.'}</Empty>
        ) : (
          <div className="stack-sm">
            {list.map((m) => (
              <MistakeCard key={m.itemId} m={m} onRetry={() => setRetry(m)} onTeach={() => setTeach({ conceptId: m.conceptIds[0]!, itemId: m.itemId })} />
            ))}
          </div>
        )}
        <p className="tiny muted">History is kept even after you improve; the status shows your current mastery of the concept.</p>
      </section>

      {saved.length > 0 && (
        <section className="stack">
          <h2>Saved concepts</h2>
          <div className="row-wrap">
            {saved.map((id) => {
              const c = content.concept(id);
              return c ? (
                <Link key={id} to={`/learn/${id}`} className="chip">
                  <Icon name="bookmark" size={14} /> {c.title}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}

      {retry && <RetrySheet m={retry} onClose={() => setRetry(null)} />}
      {teach && <TeachSheet conceptId={teach.conceptId} excludeItemId={teach.itemId} onClose={() => setTeach(null)} />}
    </div>
  );
}

function MistakeCard({ m, onRetry, onTeach }: { m: MistakeEntry; onRetry: () => void; onTeach: () => void }) {
  const records = useProgress((s) => s.concepts);
  const favourites = useProgress((s) => s.favouriteItems);
  const { toggleFavourite, scheduleReview } = useProgress();
  const concept = content.concept(m.conceptIds[0]!);
  const now = useNow();
  const status = estimate(m.conceptIds.map((id) => records[id]), now).status;
  const item = content.item(m.itemId);
  const retryable = item?.kind === 'mcq' || item?.kind === 'tf';
  const fav = favourites.includes(m.itemId);
  const [scheduled, setScheduled] = useState(false);
  return (
    <article className="card stack-sm">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row-wrap">
          {concept && <span className="badge badge-red">{DISCIPLINES[concept.discipline].short}</span>}
          {concept && <span className="badge">{SYSTEMS[concept.system].short}</span>}
          <span className="badge">{getGame(m.gameId)?.title}</span>
          {m.count > 1 && <span className="badge badge-bad">Missed {m.count}×</span>}
          {mistakeResolved(m) && <span className="badge badge-ok">Corrected</span>}
        </div>
        <button className="btn btn-text btn-sm" aria-pressed={fav} aria-label={fav ? 'Remove from favourites' : 'Favourite explanation'} onClick={() => toggleFavourite(m.itemId)}>
          <Icon name="star" size={18} className={fav ? 'red' : undefined} />
        </button>
      </div>
      <p style={{ fontWeight: 500 }}>{m.prompt}</p>
      <div className="small">
        <div>
          <span className="muted">Your answer: </span>
          <span style={{ color: 'var(--bad)' }}>{m.response}</span>
        </div>
        <div>
          <span className="muted">Correct: </span>
          <strong>{m.expected}</strong>
        </div>
      </div>
      {item && 'mini' in item && <p className="small muted">{item.mini}</p>}
      <div className="row between small" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="muted">
          {concept?.title} · {new Date(m.lastAt).toLocaleDateString()} · {m.history.length} attempt{m.history.length === 1 ? '' : 's'}
        </span>
        <StatusBadge status={status} />
      </div>
      <div className="row-wrap">
        {retryable && (
          <button className="btn btn-dark btn-sm" onClick={onRetry}>
            Retry
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onTeach}>
          <Icon name="bulb" size={16} /> Teach me this
        </button>
        {concept && (
          <Link className="btn btn-ghost btn-sm" to={`/play/survival?concept=${concept.id}`}>
            Related game
          </Link>
        )}
        {concept && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={scheduled}
            onClick={() => {
              scheduleReview(concept.id, 1);
              setScheduled(true);
            }}
          >
            {scheduled ? 'Scheduled for tomorrow' : 'Review tomorrow'}
          </button>
        )}
      </div>
    </article>
  );
}

function RetrySheet({ m, onClose }: { m: MistakeEntry; onClose: () => void }) {
  const item = content.item(m.itemId) as McqItem | TrueFalseItem;
  const answer = useProgress((s) => s.answer);
  const [res, setRes] = useState<{ id: string; correct: boolean } | null>(null);
  const [teach, setTeach] = useState(false);
  return (
    <Sheet title="Retry" onClose={onClose}>
      <div className="stack">
        <QuestionCard
          item={item}
          answered={res?.id ?? null}
          onAnswer={(correct, response, id) => {
            if (res) return;
            setRes({ id, correct });
            answer({ gameId: 'review', item, correct, prompt: promptText(item), response, expected: expectedText(item) });
          }}
        />
        {res && <AnswerFeedback correct={res.correct} item={item} chosenId={res.id} onTeach={() => setTeach(true)} />}
        {teach && <TeachSheet conceptId={item.conceptIds[0]!} excludeItemId={item.id} onClose={() => setTeach(false)} />}
      </div>
    </Sheet>
  );
}
