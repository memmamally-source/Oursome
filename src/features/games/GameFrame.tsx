import { useEffect, useState, type ReactNode } from 'react';
import { uid } from '@/engine/random';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { AnswerFeedback, TeachSheet } from '@/components/learning';
import { PreviewBanner } from '@/components/ui';
import type { McqItem, TrueFalseItem } from '@/content/schema';
import { setStudyPaused } from '@/state/studyTimer';
import { useProgress } from '@/state/progress';
import type { GameId } from './registry';

/** Header with pause/resume shared by all games. Pausing hides the board and stops study time. */
export function GameFrame({ gameId, title, subtitle, status, children, pausable = true }: { gameId: GameId; title: string; subtitle?: string; status?: ReactNode; children: ReactNode; pausable?: boolean }) {
  const [paused, setPaused] = useState(false);
  const emit = useProgress((s) => s.emit);
  const toggle = () => {
    const p = !paused;
    setPaused(p);
    setStudyPaused(p);
    emit({ type: p ? 'game_paused' : 'game_resumed', gameId });
  };
  return (
    <div className="stack" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Link to="/arcade" className="btn btn-text" style={{ paddingLeft: 0 }}>
          <Icon name="back" size={18} /> Arcade
        </Link>
        <div className="row" style={{ gap: 12 }}>
          {status}
          {pausable && (
            <button className="btn btn-ghost btn-sm" onClick={toggle} aria-pressed={paused}>
              <Icon name={paused ? 'play' : 'pause'} size={16} /> {paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </div>
      <div className="stack-sm" style={{ gap: 2 }}>
        <h1>{title}</h1>
        {subtitle && <p className="small muted">{subtitle}</p>}
      </div>
      <PreviewBanner />
      {paused ? (
        <div className="card empty stack" style={{ alignItems: 'center' }}>
          <h2>Paused</h2>
          <p>Study time is not counted while paused.</p>
          <button className="btn btn-primary" onClick={toggle}>
            <Icon name="play" size={16} /> Resume
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export interface Result {
  item: McqItem | TrueFalseItem;
  correct: boolean;
  chosenId: string;
}

/** End-of-round review: every answer, with full explanations available for each. */
export function RoundReview({ results }: { results: Result[] }) {
  const [open, setOpen] = useState<number | null>(() => {
    const i = results.findIndex((r) => !r.correct);
    return i >= 0 ? i : null;
  });
  const [teach, setTeach] = useState<Result | null>(null);
  if (!results.length) return null;
  return (
    <section className="stack-sm">
      <h2>Review your answers</h2>
      {results.map((r, i) => (
        <div key={`${r.item.id}-${i}`} className="card card-tight stack-sm">
          <button className="row between" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', gap: 12 }} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: r.correct ? 'var(--ok)' : 'var(--bad)', flex: 'none' }}>
                <Icon name={r.correct ? 'check' : 'x'} size={20} title={r.correct ? 'Correct' : 'Incorrect'} />
              </span>
              <span className="small">{r.item.kind === 'mcq' ? r.item.stem : r.item.statement}</span>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          {open === i && <AnswerFeedback correct={r.correct} item={r.item} chosenId={r.chosenId} onTeach={() => setTeach(r)} />}
        </div>
      ))}
      {teach && <TeachSheet conceptId={teach.item.conceptIds[0]!} excludeItemId={teach.item.id} onClose={() => setTeach(null)} />}
    </section>
  );
}

export function ScoreCard({ score, best, lines, children }: { score: number; best?: number; lines: ReactNode[]; children?: ReactNode }) {
  const isBest = best !== undefined && score > 0 && score >= best;
  return (
    <section className="hero stack fade-in">
      <span className="eyebrow" style={{ color: '#ff8a8e' }}>{isBest ? 'New personal best' : 'Round complete'}</span>
      <div className="stat-value" style={{ fontSize: '2.6rem', color: '#fff' }}>{score.toLocaleString()}</div>
      <div className="stack-sm small" style={{ gap: 2 }}>
        {lines.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      {children}
    </section>
  );
}

/** A game session id; the start event is idempotent so React's dev double-mount can't double-count. */
export function useGameSession(gameId: GameId, mode: string): string {
  const [sessionId] = useState(uid);
  const startGame = useProgress((s) => s.startGame);
  useEffect(() => {
    startGame(gameId, mode, sessionId);
  }, [gameId, mode, sessionId, startGame]);
  return sessionId;
}
