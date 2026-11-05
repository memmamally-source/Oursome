import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { TeachSheet } from '@/components/learning';
import { Empty } from '@/components/ui';
import { content } from '@/content';
import type { ItemQuery } from '@/content/repo';
import type { CaseItem } from '@/content/schema';
import { dateKey, seeded, shuffle } from '@/engine/random';
import { useSeed } from '@/state/clock';
import { useProgress } from '@/state/progress';
import { useStudyContext } from '@/state/studyTimer';
import { GameFrame, ScoreCard, useGameSession } from '../GameFrame';
import { dailyCase, mysteryScore } from './logic';

export function MysteryGame({ daily, query, focusLabel }: { daily: boolean; query: ItemQuery; focusLabel?: string }) {
  const [round, setRound] = useState(0);
  const seedBase = useSeed();
  const today = dateKey();
  const kase = useMemo(() => {
    const cases = content.itemsOf('case', query);
    if (daily) return dailyCase(content.itemsOf('case'), today);
    return shuffle(cases.length ? cases : content.itemsOf('case'), seeded(`${seedBase}:${round}`))[0];
  }, [daily, query, round, today, seedBase]);
  if (!kase) return <Empty>No cases yet.</Empty>;
  return <Case key={`${kase.id}-${round}`} kase={kase} daily={daily ? `${today}:mystery` : undefined} focusLabel={focusLabel} onAgain={daily ? undefined : () => setRound((r) => r + 1)} />;
}

function Case({ kase, daily, focusLabel, onAgain }: { kase: CaseItem; daily?: string; focusLabel?: string; onAgain?: () => void }) {
  const { answer, completeGame } = useProgress();
  const best = useProgress((s) => s.games.mystery?.best ?? 0);
  const sessionId = useGameSession('mystery', daily ? 'daily' : 'practice');
  const [revealed, setRevealed] = useState(1);
  const [choice, setChoice] = useState<string | null>(null);
  const [teach, setTeach] = useState(false);
  const [finalBest] = useState(best);
  const correct = choice === kase.answerId;
  const done = choice !== null;
  useStudyContext({ gameId: 'mystery', activity: teach ? 'lesson' : done ? 'explanation' : 'play', conceptIds: kase.conceptIds });
  const score = mysteryScore(correct, revealed);
  const chosen = kase.options.find((o) => o.id === choice);
  const right = kase.options.find((o) => o.id === kase.answerId)!;

  const submit = (id: string) => {
    if (done) return;
    setChoice(id);
    const ok = id === kase.answerId;
    answer({ gameId: 'mystery', sessionId, item: kase, correct: ok, prompt: `${kase.title}: ${kase.question}`, response: kase.options.find((o) => o.id === id)!.text, expected: right.text, hintsUsed: revealed - 1 });
    completeGame({ gameId: 'mystery', sessionId, score: mysteryScore(ok, revealed), correct: ok ? 1 : 0, total: 1, daily });
  };

  const shown = done ? kase.stages : kase.stages.slice(0, revealed);
  return (
    <GameFrame
      gameId="mystery"
      title={daily ? 'Daily Mystery Patient' : 'Mystery Patient'}
      subtitle={`${kase.title}${focusLabel ? ` · ${focusLabel}` : ''}`}
      status={!done ? <span className="small num" style={{ fontWeight: 700 }}>Worth {mysteryScore(true, revealed)}</span> : undefined}
    >
      <div className="card stack">
        {shown.map((s, i) => (
          <div key={s.label + i} className={`stage${i === shown.length - 1 && !done ? ' latest' : ''}`}>
            <div className="eyebrow">{s.label}</div>
            <p>{s.text}</p>
          </div>
        ))}
        {!done && revealed < kase.stages.length && (
          <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setRevealed(revealed + 1)}>
            Reveal next clue: {kase.stages[revealed]!.label} (−15)
          </button>
        )}
      </div>
      <div className="card stack">
        <h2>{kase.question}</h2>
        <p className="small muted">Answer whenever you’re confident. Fewer clues scores more, but a correct answer matters most.</p>
        <div className="stack-sm">
          {kase.options.map((o, i) => {
            const state = done ? (o.id === kase.answerId ? ' is-correct' : o.id === choice ? ' is-wrong' : '') : '';
            return (
              <button key={o.id} className={`option${state}`} disabled={done} onClick={() => submit(o.id)}>
                <span className="key">{String.fromCharCode(65 + i)}</span>
                <span style={{ flex: 1 }}>{o.text}</span>
                {done && o.id === kase.answerId && <Icon name="check" size={20} title="Correct answer" />}
                {done && o.id === choice && !correct && <Icon name="x" size={20} title="Your answer" />}
              </button>
            );
          })}
        </div>
      </div>
      {done && (
        <div className="stack">
          <ScoreCard score={score} best={finalBest} lines={[correct ? `Correct with ${revealed} of ${kase.stages.length} clues` : 'Incorrect', `Answer: ${right.text}`]}>
            <div className="row-wrap">
              {onAgain && <button className="btn btn-primary" onClick={onAgain}>Next case</button>}
              <Link to="/" className="btn btn-ghost" style={{ color: '#fff', borderColor: '#555' }}>Home</Link>
            </div>
          </ScoreCard>
          <section className={`feedback ${correct ? 'feedback-ok' : 'feedback-bad'}`}>
            <h3>
              <Icon name={correct ? 'check' : 'x'} size={20} /> {correct ? 'Correct' : 'Not quite'}
            </h3>
            {!correct && chosen?.whyWrong && (
              <div className="section">
                <div className="section-title">Why your answer was wrong</div>
                <p>{chosen.whyWrong}</p>
              </div>
            )}
            <div className="section">
              <div className="section-title">Explanation</div>
              <p>{kase.explanation}</p>
            </div>
            <div className="section">
              <div className="section-title">Mechanism</div>
              <p>{kase.mechanism}</p>
            </div>
            <div className="section">
              <div className="section-title">Differentials</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {kase.differentials.map((d) => (
                  <li key={d.name}>
                    <strong>{d.name}:</strong> {d.why}
                  </li>
                ))}
              </ul>
            </div>
            <div className="section">
              <div className="section-title">Step 1 takeaway</div>
              <p className="takeaway">{kase.takeaway}</p>
            </div>
            <div className="row-wrap" style={{ marginTop: 12 }}>
              <button className="btn btn-dark btn-sm" onClick={() => setTeach(true)}>
                <Icon name="bulb" size={16} /> Teach me this
              </button>
            </div>
          </section>
        </div>
      )}
      {teach && <TeachSheet conceptId={kase.conceptIds[0]!} onClose={() => setTeach(false)} />}
    </GameFrame>
  );
}
