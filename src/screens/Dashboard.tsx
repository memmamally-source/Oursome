import { useState } from 'react';
import { Link } from 'react-router';
import { Bar, PageHeader, Stat, StatusBadge, pct } from '@/components/ui';
import { content } from '@/content';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { byTopic, coverage, improvement, retention, type Node } from '@/engine/analysis';
import { lastDays, totalsBy, answeredTotals } from '@/engine/stats';
import { formatDuration } from '@/engine/studyTime';
import { GAMES, getGame } from '@/features/games/registry';
import { playHref, useAnalysis, useTimeSummary } from '@/state/derived';
import { useProgress } from '@/state/progress';

/** The full study dashboard. Every number is real local data; metrics are kept separate on purpose. */
export function Dashboard() {
  const s = useProgress();
  const time = useTimeSummary();
  const a = useAnalysis();
  const [range, setRange] = useState<14 | 30>(14);
  const days = lastDays(s.days, range);
  const goalMs = s.profile.dailyGoalMin * 60_000;
  const max = Math.max(goalMs, ...days.map((d) => d.ms), 1);
  const totals = answeredTotals(s.counts);
  const ret = retention(s.concepts);
  const imp = improvement(s.concepts, a.now);
  const cov = coverage(content, s.concepts);
  const topics = byTopic(content, s.concepts, a.now).filter((n) => n.estimate.attempts > 0);
  const byGame = totalsBy(s.days, 'byGame');
  const byDisc = totalsBy(s.days, 'byDiscipline');
  const bySys = totalsBy(s.days, 'bySystem');
  const byAct = totalsBy(s.days, 'byActivity');
  const heat = lastDays(s.days, 35);
  const level = (ms: number) => (ms <= 0 ? 0 : ms < 5 * 60_000 ? 1 : ms < 15 * 60_000 ? 2 : ms < 45 * 60_000 ? 3 : 4);
  const favourite = Object.entries(s.games).sort((x, y) => (y[1]?.completed ?? 0) - (x[1]?.completed ?? 0))[0];

  return (
    <div className="stack-lg">
      <PageHeader title="Your Step 1 dashboard" eyebrow="Progress" />

      <section className="stack">
        <h2>Study time</h2>
        <div className="grid-4">
          <Stat label="Today" value={formatDuration(time.today)} sub={`Goal ${s.profile.dailyGoalMin} min`} />
          <Stat label="This week" value={formatDuration(time.week)} />
          <Stat label="This month" value={formatDuration(time.month)} />
          <Stat label="Lifetime" value={formatDuration(time.lifetime)} />
          <Stat label="Average per study day" value={formatDuration(time.averageDaily)} />
          <Stat label="Study streak" value={`${time.streak} d`} sub={`${time.activeDaysTotal} active days in total`} />
          <Stat label="Logged elsewhere (week)" value={formatDuration(time.externalWeek)} sub="Kept separate" />
          <Stat label="Combined (week)" value={formatDuration(time.week + time.externalWeek)} />
        </div>
        <div className="card stack-sm">
          <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <h3>Daily in-app study time</h3>
            <div className="row-wrap" role="radiogroup" aria-label="Range">
              {([14, 30] as const).map((r) => (
                <button key={r} className="chip" role="radio" aria-checked={range === r} onClick={() => setRange(r)}>
                  {r} days
                </button>
              ))}
            </div>
          </div>
          <div className="chart-bars" aria-hidden>
            {days.map((d, i) => (
              <div
                key={d.key}
                className={`b${i === days.length - 1 ? ' today' : d.ms >= goalMs ? ' goal-met' : ''}`}
                style={{ height: `${(d.ms / max) * 100}%` }}
                title={`${d.key}: ${formatDuration(d.ms)}`}
              />
            ))}
          </div>
          <div className="chart-axis" aria-hidden>
            {days.map((d, i) => (
              <span key={d.key}>{i % (range === 14 ? 2 : 5) === 0 || i === days.length - 1 ? Number(d.key.slice(8)) : ''}</span>
            ))}
          </div>
          <p className="tiny muted">Dark bars met your daily goal; red is today. Only active time counts: idle, hidden or background time is excluded.</p>
          <table className="sr-only">
            <caption>Daily study time</caption>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <th scope="row">{d.key}</th>
                  <td>{formatDuration(d.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2-md">
          <div className="card stack-sm">
            <h3>Activity calendar</h3>
            <div className="heat" role="img" aria-label={`Study on ${heat.filter((d) => d.ms > 0).length} of the last 35 days`}>
              {heat.map((d) => (
                <span key={d.key} data-l={level(d.ms)} title={`${d.key}: ${formatDuration(d.ms)}`} />
              ))}
            </div>
            <p className="tiny muted">Last 5 weeks. Breaks are fine: streaks are a nudge, not a penalty.</p>
          </div>
          <div className="card stack-sm">
            <h3>Where your time went</h3>
            <TimeList title="By activity" data={byAct} label={(k) => ({ play: 'Playing', explanation: 'Reading explanations', lesson: 'Mini lessons', review: 'Spaced review', mistakes: 'Reviewing mistakes' })[k] ?? k} />
          </div>
        </div>
        <div className="grid">
          <div className="card">
            <TimeList title="By game" data={byGame} label={(k) => getGame(k)?.title ?? k} />
          </div>
          <div className="card">
            <TimeList title="By discipline" data={byDisc} label={(k) => DISCIPLINES[k as keyof typeof DISCIPLINES]?.title ?? k} />
          </div>
          <div className="card">
            <TimeList title="By organ system" data={bySys} label={(k) => SYSTEMS[k as keyof typeof SYSTEMS]?.title ?? k} />
          </div>
        </div>
      </section>

      <section className="stack">
        <h2>Learning metrics</h2>
        <p className="small muted">Each measures something different and none predicts your exam score.</p>
        <div className="grid-4">
          <Stat label="Questions answered" value={totals.answered.toLocaleString()} />
          <Stat label="Accuracy" value={totals.answered ? pct(totals.correct / totals.answered) : '—'} sub="Correct ÷ answered" />
          <Stat label="Retention" value={pct(ret.rate)} sub={ret.attempts ? `${ret.attempts} revisits after ≥1 day` : 'Revisit concepts on later days'} />
          <Stat label="Syllabus coverage" value={`${cov.seen}/${cov.total}`} sub="Concepts encountered" />
          <Stat label="Improvement" value={imp ? `${imp.delta >= 0 ? '+' : ''}${Math.round(imp.delta * 100)} pts` : '—'} sub={imp ? 'Accuracy, last 7 days vs previous 7' : 'Needs 10+ answers in each week'} />
          <Stat label="Due for review" value={a.due.length} />
          <Stat label="Open mistakes" value={Object.values(s.mistakes).filter((m) => !m.history[m.history.length - 1]?.correct).length} />
          <Stat label="Explanations opened" value={s.explanationsOpened} />
        </div>
      </section>

      <section className="stack">
        <h2>Priority weaknesses</h2>
        {a.weak.length ? (
          <div className="stack-sm">
            {a.weak.map((w) => (
              <WeakCard key={w.id} n={w} />
            ))}
          </div>
        ) : (
          <p className="card small muted">Not enough answers yet to name a weakness with confidence. Areas need several answers before they are judged.</p>
        )}
      </section>

      <section className="grid-2-md">
        <div className="card stack-sm">
          <h3>Accuracy by discipline</h3>
          <MasteryList nodes={a.disciplines.filter((n) => n.estimate.attempts)} />
        </div>
        <div className="card stack-sm">
          <h3>Accuracy by organ system</h3>
          <MasteryList nodes={a.systems.filter((n) => n.estimate.attempts)} />
        </div>
      </section>

      {topics.length > 0 && (
        <section className="card stack-sm">
          <h3>Topic mastery</h3>
          <MasteryList nodes={topics.sort((x, y) => (x.estimate.mastery ?? 0) - (y.estimate.mastery ?? 0))} showMastery />
        </section>
      )}

      <section className="stack">
        <h2>Games</h2>
        <div className="grid-4">
          <Stat label="Games completed" value={Object.values(s.games).reduce((t, g) => t + (g?.completed ?? 0), 0)} />
          <Stat label="Favourite game" value={favourite?.[1]?.completed ? <span style={{ fontSize: '1rem' }}>{getGame(favourite[0])?.title}</span> : '—'} />
        </div>
        <div className="card" style={{ padding: '4px 18px' }}>
          <ul className="list">
            {GAMES.filter((g) => s.games[g.id]?.completed).map((g) => {
              const st = s.games[g.id]!;
              return (
                <li key={g.id} className="row between small">
                  <strong>{g.title}</strong>
                  <span className="muted num">
                    {st.completed} played · best {st.best} · average {Math.round(st.totalScore / Math.max(1, st.completed))}
                  </span>
                </li>
              );
            })}
            {!Object.values(s.games).some((g) => g?.completed) && <li className="small muted">Finish a game to see scores and personal bests.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}

function TimeList({ title, data, label }: { title: string; data: Record<string, number>; label: (k: string) => string }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="stack-sm">
      <h3>{title}</h3>
      {rows.length ? (
        rows.slice(0, 6).map(([k, v]) => (
          <div key={k} className="stack-sm" style={{ gap: 4 }}>
            <div className="row between small">
              <span>{label(k)}</span>
              <span className="muted num">{formatDuration(v)}</span>
            </div>
            <Bar value={v / max} label={`${label(k)} time`} dark />
          </div>
        ))
      ) : (
        <p className="small muted">No tracked time yet.</p>
      )}
    </div>
  );
}

function MasteryList({ nodes, showMastery }: { nodes: Node[]; showMastery?: boolean }) {
  if (!nodes.length) return <p className="small muted">No answers yet.</p>;
  return (
    <div className="stack-sm">
      {nodes.map((n) => (
        <div key={n.id} className="stack-sm" style={{ gap: 4 }}>
          <div className="row between small" style={{ gap: 8 }}>
            <span>{n.title}</span>
            <span className="row" style={{ gap: 6 }}>
              <span className="num muted">
                {pct(showMastery ? n.estimate.mastery : n.estimate.accuracy)} · {n.estimate.attempts}
              </span>
              <StatusBadge status={n.estimate.status} />
            </span>
          </div>
          <Bar value={(showMastery ? n.estimate.mastery : n.estimate.accuracy) ?? 0} label={`${n.title}`} />
        </div>
      ))}
      <p className="tiny muted">{showMastery ? 'Mastery weights difficulty and recency; it is not the same as raw accuracy.' : 'Number after the percentage = answers so far.'}</p>
    </div>
  );
}

function WeakCard({ n }: { n: Node }) {
  const focus = n.level === 'concept' ? { concept: n.id } : { topic: n.id };
  return (
    <div className="card card-accent row between" style={{ flexWrap: 'wrap', gap: 12 }}>
      <div>
        <span className="eyebrow">{n.level === 'concept' ? 'Concept' : 'Topic'}</span>
        <h3>{n.title}</h3>
        <span className="small muted">
          {pct(n.estimate.accuracy)} accuracy over {n.estimate.attempts} answers
        </span>
      </div>
      <div className="row-wrap">
        <Link className="btn btn-primary btn-sm" to={playHref({ gameId: 'survival', focus })}>
          Practise
        </Link>
        {n.level === 'concept' ? (
          <Link className="btn btn-ghost btn-sm" to={`/learn/${n.id}`}>
            Mini lesson
          </Link>
        ) : (
          <Link className="btn btn-ghost btn-sm" to={`/subjects/topic/${n.id}`}>
            Open topic
          </Link>
        )}
      </div>
    </div>
  );
}
