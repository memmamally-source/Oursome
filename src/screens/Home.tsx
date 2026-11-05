import { useState } from 'react';
import { Link } from 'react-router';
import { Icon, GAME_ICONS } from '@/components/Icon';
import { PreviewBanner, Stat, pct } from '@/components/ui';
import { getPackage } from '@/config/packages';
import { content } from '@/content';
import { formatDuration } from '@/engine/studyTime';
import { GAMES, getGame } from '@/features/games/registry';
import { useProgress } from '@/state/progress';
import { playHref, todayKey, useAnalysis, useDailyDone, useTimeSummary } from '@/state/derived';

const PLAN_LENGTHS = [5, 10, 15, 30, 60];

export function Home() {
  const profile = useProgress((s) => s.profile);
  const counts = useProgress((s) => s.counts);
  const mistakes = useProgress((s) => s.mistakes);
  const time = useTimeSummary();
  const a = useAnalysis();
  const dailyDone = useDailyDone();
  const [planMin, setPlanMin] = useState(profile.dailyGoalMin <= 60 ? closest(profile.dailyGoalMin) : 15);
  const plan = a.plan(planMin);
  const next = a.plan(5)[0];
  const today = todayKey();
  const c = counts[today] ?? { answered: 0, correct: 0 };
  const goalMs = profile.dailyGoalMin * 60_000;
  const returning = Object.keys(counts).length > 0;
  const startOfDay = new Date(a.now).setHours(0, 0, 0, 0);
  const addedToday = Object.values(mistakes).filter((m) => m.firstAt >= startOfDay).length;
  const weakest = a.weak[0];
  const examDays = profile.examDate ? Math.ceil((new Date(profile.examDate + 'T00:00').getTime() - startOfDay) / 86_400_000) : null;

  return (
    <div className="stack-lg">
      <section className="hero stack">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="eyebrow" style={{ color: '#ff8a8e' }}>{getPackage(profile.packageId).title} preparation</span>
          <h1 style={{ color: '#fff' }}>{returning ? 'Welcome back' : 'Welcome'}</h1>
          {examDays !== null && examDays >= 0 && <span className="muted small">{examDays} days until your exam</span>}
        </div>
        <div className="stack-sm">
          <div className="row between small">
            <span>
              Today: <strong className="num">{formatDuration(time.today)}</strong> of {profile.dailyGoalMin} min
            </span>
            <span className="row" style={{ gap: 6 }}>
              <Icon name="flame" size={18} /> <strong className="num">{time.streak}</strong> day streak
            </span>
          </div>
          <div className="bar" style={{ background: '#333', borderColor: '#333' }} role="progressbar" aria-label="Daily goal" aria-valuenow={Math.round(Math.min(1, time.today / goalMs) * 100)}>
            <span style={{ width: `${Math.min(100, (time.today / goalMs) * 100)}%` }} />
          </div>
        </div>
        {next && (
          <Link to={playHref(next)} className="btn btn-primary btn-wrap" style={{ alignSelf: 'flex-start', maxWidth: '100%', justifyContent: 'flex-start' }}>
            <Icon name="play" size={16} />
            <span className="stack-sm" style={{ gap: 0 }}>
              <span>Up next: {getGame(next.gameId)?.title}</span>
              <span className="small" style={{ fontWeight: 500, opacity: 0.9 }}>{next.reason}</span>
            </span>
          </Link>
        )}
      </section>

      <PreviewBanner />

      <section className="stack">
        <div className="row between">
          <h2>Today’s dailies</h2>
          <span className="small muted">Same puzzles for everyone today</span>
        </div>
        <div className="grid">
          {GAMES.filter((g) => g.daily).map((g) => {
            const done = dailyDone.has(`${today}:${g.id}`);
            return (
              <Link key={g.id} to={`/play/${g.id}?daily=1`} className="card card-link row" style={{ gap: 14 }}>
                <span className="game-icon">
                  <Icon name={GAME_ICONS[g.id]!} />
                </span>
                <div style={{ flex: 1 }}>
                  <h3>{g.id === 'crossword' ? 'Daily Medical Mini' : `Daily ${g.title.replace('Medical ', '')}`}</h3>
                  <span className="small muted">{g.minutes} min</span>
                </div>
                {done ? <span className="badge badge-ok"><Icon name="check" size={14} /> Done</span> : <Icon name="chevron" />}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2>Today’s progress</h2>
        <div className="grid-4">
          <Stat label="Study time" value={formatDuration(time.today)} sub={time.externalToday ? `+ ${formatDuration(time.externalToday)} logged elsewhere` : 'tracked automatically'} />
          <Stat label="Questions answered" value={c.answered} />
          <Stat label="Accuracy" value={c.answered ? pct(c.correct / c.answered) : '—'} />
          <Stat label="Due for review" value={a.due.length} sub={addedToday ? `${addedToday} added to revision today` : undefined} />
        </div>
        <div className="grid-2">
          <div className="card stack-sm">
            <span className="stat-label">Weakest area</span>
            {weakest ? (
              <>
                <h3>{weakest.title}</h3>
                <span className="small muted">
                  {pct(weakest.estimate.accuracy)} accuracy over {weakest.estimate.attempts} answers
                </span>
                <Link className="btn btn-dark btn-sm" style={{ alignSelf: 'flex-start' }} to={playHref({ gameId: 'survival', focus: weakest.level === 'concept' ? { concept: weakest.id } : { topic: weakest.id } })}>
                  Practise it
                </Link>
              </>
            ) : (
              <p className="small muted">Answer a few more questions and we’ll pinpoint your weakest topic. One answer is never enough to judge.</p>
            )}
          </div>
          <div className="card stack-sm">
            <span className="stat-label">Strongest area</span>
            {a.strongestDiscipline ? (
              <>
                <h3>{a.strongestDiscipline.title}</h3>
                <span className="small muted">{pct(a.strongestDiscipline.estimate.accuracy)} accuracy</span>
              </>
            ) : (
              <p className="small muted">Not enough data yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h2>Your study plan</h2>
          <div className="row-wrap" role="radiogroup" aria-label="Plan length">
            {PLAN_LENGTHS.map((m) => (
              <button key={m} className="chip" role="radio" aria-checked={planMin === m} onClick={() => setPlanMin(m)}>
                {m} min
              </button>
            ))}
          </div>
        </div>
        <ol className="card list" style={{ padding: '4px 18px' }}>
          {plan.map((b, i) => (
            <li key={i} className="row" style={{ gap: 14 }}>
              <span className="num" style={{ fontWeight: 800, width: 52, flex: 'none' }}>{b.minutes} min</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{getGame(b.gameId)?.title}</strong>
                <div className="small muted">{b.reason}</div>
              </div>
              <Link className="btn btn-ghost btn-sm" to={playHref(b)} aria-label={`Start ${getGame(b.gameId)?.title}`}>
                Start
              </Link>
            </li>
          ))}
        </ol>
        <p className="tiny muted">Built from your due reviews, weak areas, unfinished dailies and untouched topics. Play anything you like instead.</p>
      </section>

      <section className="row-wrap">
        <Link to="/progress" className="btn btn-ghost">
          <Icon name="chart" size={18} /> Full dashboard
        </Link>
        <Link to="/arcade" className="btn btn-ghost">
          <Icon name="arcade" size={18} /> All games
        </Link>
      </section>
      <p className="tiny muted">{content.concepts.length} concepts available in this build.</p>
    </div>
  );
}

function closest(n: number) {
  return PLAN_LENGTHS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
}
