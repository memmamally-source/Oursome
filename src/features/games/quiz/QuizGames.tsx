/**
 * Quiz-style games sharing one flow: Medical Survival, Fact or Fiction and Spaced Review.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { AnswerFeedback, QuestionCard, TeachSheet, expectedText, promptText } from '@/components/learning';
import { Empty } from '@/components/ui';
import { content } from '@/content';
import type { ItemQuery } from '@/content/repo';
import { dueConcepts } from '@/engine/plan';
import { seeded } from '@/engine/random';
import { useSeed } from '@/state/clock';
import { useProgress } from '@/state/progress';
import { useStudyContext } from '@/state/studyTimer';
import { GameFrame, RoundReview, ScoreCard, useGameSession, type Result } from '../GameFrame';
import type { GameId } from '../registry';
import { answerSurvival, initialSurvival, isOver, pickNext, START_LIVES, type SurvivalItem, type SurvivalState } from '../survival/logic';
import { factOrFictionRound, reviewItems, type QuizItem } from './logic';

type Feedback = 'immediate' | 'end';
type Chosen = { id: string; correct: boolean } | null;

// ——— Medical Survival ———

export function SurvivalGame({ query, focusLabel, mode }: { query: ItemQuery; focusLabel?: string; mode?: string }) {
  const pool = useMemo<SurvivalItem[]>(() => [...content.itemsOf('mcq', query), ...content.itemsOf('tf', query)], [query]);
  const [run, setRun] = useState<{ feedback: Feedback; timed: boolean; n: number } | null>(null);
  const [feedbackPref, setFeedbackPref] = useState<Feedback>(mode === 'challenge' ? 'end' : 'immediate');
  const [timedPref, setTimedPref] = useState(mode === 'challenge');
  const best = useProgress((s) => s.games.survival?.best ?? 0);

  if (!pool.length) return <Empty>No questions for this subject yet.</Empty>;
  if (!run) {
    return (
      <GameFrame gameId="survival" title="Medical Survival" subtitle={focusLabel ?? 'Mixed subjects'} pausable={false}>
        <div className="card stack">
          <p>
            You have <strong>{START_LIVES} lives</strong>. Each wrong answer costs one. Questions get harder every three correct answers. Accuracy matters more than speed.
          </p>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Explanations</legend>
            <div className="row-wrap">
              <button className="chip" aria-pressed={feedbackPref === 'immediate'} onClick={() => setFeedbackPref('immediate')}>
                After each answer
              </button>
              <button className="chip" aria-pressed={feedbackPref === 'end'} onClick={() => setFeedbackPref('end')}>
                At the end (faster)
              </button>
            </div>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Timer</legend>
            <div className="row-wrap">
              <button className="chip" aria-pressed={!timedPref} onClick={() => setTimedPref(false)}>
                Untimed
              </button>
              <button className="chip" aria-pressed={timedPref} onClick={() => setTimedPref(true)}>
                30 s per question (bonus only)
              </button>
            </div>
          </fieldset>
          <p className="small muted">
            {pool.length} questions available · Personal best {best}
          </p>
          <button className="btn btn-primary" onClick={() => setRun({ feedback: feedbackPref, timed: timedPref, n: 1 })}>
            <Icon name="play" size={16} /> Start run
          </button>
        </div>
      </GameFrame>
    );
  }
  return <SurvivalRun key={run.n} pool={pool} feedback={run.feedback} timed={run.timed} focusLabel={focusLabel} onRestart={() => setRun(null)} />;
}

const TIME_LIMIT = 30_000;

function SurvivalRun({ pool, feedback, timed, focusLabel, onRestart }: { pool: SurvivalItem[]; feedback: Feedback; timed: boolean; focusLabel?: string; onRestart: () => void }) {
  const completeGame = useProgress((s) => s.completeGame);
  const answer = useProgress((s) => s.answer);
  const sessionId = useGameSession('survival', `${feedback}${timed ? '-timed' : ''}`);
  const rnd = useMemo(() => seeded(sessionId), [sessionId]);
  const [finalBest] = useState(() => useProgress.getState().games.survival?.best ?? 0);
  const [state, setState] = useState<SurvivalState>(initialSurvival);
  const [current, setCurrent] = useState<SurvivalItem | null>(() => pickNext(pool, initialSurvival(), rnd));
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [chosen, setChosen] = useState<Chosen>(null);
  const [teach, setTeach] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(TIME_LIMIT);
  useStudyContext(done || !current ? null : { gameId: 'survival', activity: teach ? 'lesson' : chosen ? 'explanation' : 'play', conceptIds: current.conceptIds });

  const advance = useCallback(
    (s: SurvivalState) => {
      if (isOver(s, pool)) {
        setDone(true);
        completeGame({ gameId: 'survival', sessionId, score: s.score, correct: s.correct, total: s.answered });
        return;
      }
      setCurrent(pickNext(pool, s, rnd));
      setChosen(null);
      setTeach(false);
      setShownAt(Date.now());
      setLeft(TIME_LIMIT);
    },
    [completeGame, pool, rnd, sessionId],
  );

  const onAnswer = useCallback(
    (correct: boolean, response: string, id: string) => {
      if (!current || chosen) return;
      setChosen({ id, correct });
      const now = Date.now();
      answer({ gameId: 'survival', sessionId, item: current, correct, prompt: promptText(current), response, expected: expectedText(current), latencyMs: now - shownAt });
      const frac = timed ? Math.max(0, 1 - (now - shownAt) / TIME_LIMIT) : null;
      const next = answerSurvival(state, current, correct, frac);
      setState(next);
      setResults((r) => [...r, { item: current, correct, chosenId: id }]);
      if (feedback === 'end') window.setTimeout(() => advance(next), 650);
    },
    [advance, answer, chosen, current, feedback, sessionId, shownAt, state, timed],
  );

  // Optional timer: running out counts as a wrong answer.
  useEffect(() => {
    if (!timed || !current || chosen || done) return;
    const t = window.setInterval(() => {
      const remaining = TIME_LIMIT - (Date.now() - shownAt);
      setLeft(remaining);
      if (remaining <= 0) onAnswer(false, '(time ran out)', '__timeout');
    }, 250);
    return () => window.clearInterval(t);
  }, [timed, current, chosen, done, onAnswer, shownAt]);

  if (done || !current) {
    return (
      <GameFrame gameId="survival" title="Medical Survival" subtitle={focusLabel} pausable={false}>
        <ScoreCard
          score={state.score}
          best={finalBest}
          lines={[`${state.correct} of ${state.answered} correct`, `Longest streak ${state.bestStreak}`, `Reached level ${state.level}`, state.lives > 0 ? 'You answered every available question.' : 'Out of lives.']}
        >
          <div className="row-wrap">
            <button className="btn btn-primary" onClick={onRestart}>
              Play again
            </button>
            <Link to="/review" className="btn btn-ghost" style={{ color: '#fff', borderColor: '#555' }}>
              My Mistakes
            </Link>
          </div>
        </ScoreCard>
        <RoundReview results={results} />
      </GameFrame>
    );
  }

  return (
    <GameFrame
      gameId="survival"
      title="Medical Survival"
      subtitle={focusLabel}
      status={
        <>
          <span className="lives" aria-label={`${state.lives} lives left`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <span key={i} className={i < state.lives ? '' : 'lost'}>
                <Icon name="heart" size={20} />
              </span>
            ))}
          </span>
          <span className="num small" style={{ fontWeight: 700 }}>
            {state.score}
          </span>
        </>
      }
    >
      <div className="card stack" key={current.id}>
        <div className="row between small muted">
          <span>
            Question {state.answered + (chosen ? 0 : 1)} · Level {state.level}
          </span>
          {timed && !chosen && <span className="num">{Math.max(0, Math.ceil(left / 1000))} s</span>}
          {state.streak > 1 && <span className="badge badge-red">Streak {state.streak}</span>}
        </div>
        <QuestionCard item={current} answered={chosen?.id ?? null} onAnswer={onAnswer} />
        {chosen && feedback === 'immediate' && (
          <>
            <AnswerFeedback correct={chosen.correct} item={current} chosenId={chosen.id} onTeach={() => setTeach(true)} />
            <button className="btn btn-primary" onClick={() => advance(state)} autoFocus>
              {isOver(state, pool) ? 'See results' : 'Next question'}
            </button>
          </>
        )}
        {chosen && feedback === 'end' && (
          <p className="small" style={{ fontWeight: 700, color: chosen.correct ? 'var(--ok)' : 'var(--bad)' }} aria-live="polite">
            {chosen.correct ? '✓ Correct' : '✗ Incorrect: explained at the end'}
          </p>
        )}
        {teach && <TeachSheet conceptId={current.conceptIds[0]!} excludeItemId={current.id} onClose={() => setTeach(false)} />}
      </div>
    </GameFrame>
  );
}

// ——— Fact or Fiction and Spaced Review share a fixed-length round ———

export function FactFictionGame({ query, focusLabel }: { query: ItemQuery; focusLabel?: string }) {
  const [round, setRound] = useState(0);
  const seed = useSeed();
  const items = useMemo(() => factOrFictionRound(content, seeded(`${seed}-${round}`), 10, query), [query, round, seed]);
  if (!items.length) return <Empty>No statements for this subject yet.</Empty>;
  return <FixedRound key={round} gameId="fact-fiction" title="Fact or Fiction" subtitle={focusLabel ?? 'Ten quick calls. Mixed subjects.'} items={items} onAgain={() => setRound((r) => r + 1)} />;
}

export function ReviewGame() {
  const seed = useSeed();
  // Snapshot at start: the round shouldn't change as answers reschedule concepts.
  const [snapshot] = useState(() => {
    const { srs, log, mistakes } = useProgress.getState();
    const due = dueConcepts(srs, content, Date.now());
    if (due.length) return { items: reviewItems(content, due, log, seeded(seed), 12), due: due.length };
    const open = Object.values(mistakes)
      .filter((m) => !m.history[m.history.length - 1]?.correct)
      .map((m) => content.item(m.itemId))
      .filter((i): i is QuizItem => i?.kind === 'mcq' || i?.kind === 'tf')
      .slice(0, 10);
    return { items: open, due: 0 };
  });
  if (!snapshot.items.length) {
    return (
      <GameFrame gameId="review" title="Spaced Review" pausable={false}>
        <Empty>
          Nothing is due and there are no open mistakes. Play any game; concepts you meet are scheduled automatically.
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-primary" to="/arcade">
              Go to the Arcade
            </Link>
          </div>
        </Empty>
      </GameFrame>
    );
  }
  return (
    <FixedRound
      gameId="review"
      title="Spaced Review"
      subtitle={snapshot.due ? `${snapshot.items.length} due concepts, each asked a new way where possible` : 'Nothing due: practising your open mistakes'}
      items={snapshot.items}
      activity="review"
    />
  );
}

function FixedRound({ gameId, title, subtitle, items, onAgain, activity }: { gameId: GameId; title: string; subtitle: string; items: QuizItem[]; onAgain?: () => void; activity?: 'review' }) {
  const completeGame = useProgress((s) => s.completeGame);
  const answer = useProgress((s) => s.answer);
  const sessionId = useGameSession(gameId, 'round');
  const [finalBest] = useState(() => useProgress.getState().games[gameId]?.best ?? 0);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const [teach, setTeach] = useState(false);
  const [chosen, setChosen] = useState<Chosen>(null);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const item = items[i]!;
  useStudyContext(done ? null : { gameId, activity: teach ? 'lesson' : (activity ?? (chosen ? 'explanation' : 'play')), conceptIds: item.conceptIds });

  const correctCount = results.filter((r) => r.correct).length;
  const score = correctCount * 100;

  const next = () => {
    if (i + 1 >= items.length) {
      setDone(true);
      completeGame({ gameId, sessionId, score, correct: correctCount, total: items.length });
    } else {
      setI(i + 1);
      setChosen(null);
      setTeach(false);
      setShownAt(Date.now());
    }
  };

  if (done) {
    return (
      <GameFrame gameId={gameId} title={title} pausable={false}>
        <ScoreCard score={score} best={finalBest} lines={[`${correctCount} of ${items.length} correct`]}>
          <div className="row-wrap">
            {onAgain && (
              <button className="btn btn-primary" onClick={onAgain}>
                New round
              </button>
            )}
            <Link to="/" className="btn btn-ghost" style={{ color: '#fff', borderColor: '#555' }}>
              Home
            </Link>
          </div>
        </ScoreCard>
        <RoundReview results={results} />
      </GameFrame>
    );
  }

  return (
    <GameFrame
      gameId={gameId}
      title={title}
      subtitle={subtitle}
      status={
        <span className="num small" style={{ fontWeight: 700 }}>
          {i + 1}/{items.length}
        </span>
      }
    >
      <div className="card stack" key={item.id}>
        <QuestionCard
          item={item}
          answered={chosen?.id ?? null}
          onAnswer={(correct, response, id) => {
            if (chosen) return;
            setChosen({ id, correct });
            setResults((r) => [...r, { item, correct, chosenId: id }]);
            answer({ gameId, sessionId, item, correct, prompt: promptText(item), response, expected: expectedText(item), latencyMs: Date.now() - shownAt });
          }}
        />
        {chosen && (
          <>
            <AnswerFeedback correct={chosen.correct} item={item} chosenId={chosen.id} onTeach={() => setTeach(true)} />
            <button className="btn btn-primary" onClick={next} autoFocus>
              {i + 1 >= items.length ? 'See results' : 'Next'}
            </button>
          </>
        )}
        {teach && <TeachSheet conceptId={item.conceptIds[0]!} excludeItemId={item.id} onClose={() => setTeach(false)} />}
      </div>
    </GameFrame>
  );
}
