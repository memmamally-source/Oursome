import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { TeachSheet } from '@/components/learning';
import { Empty } from '@/components/ui';
import { content } from '@/content';
import type { ItemQuery } from '@/content/repo';
import { dateKey, seeded, shuffle } from '@/engine/random';
import { useSeed } from '@/state/clock';
import { useProgress } from '@/state/progress';
import { useStudyContext } from '@/state/studyTimer';
import { GameFrame, ScoreCard, useGameSession } from '../GameFrame';
import { MAX_MISTAKES, buildConnections, checkGuess, scoreConnections, type ConnectionsPuzzle, type PuzzleGroup } from './logic';

export function ConnectionsGame({ daily, query, focusLabel }: { daily: boolean; query: ItemQuery; focusLabel?: string }) {
  const [round, setRound] = useState(0);
  const seedBase = useSeed();
  const today = dateKey();
  const puzzle = useMemo(() => {
    const bank = content.itemsOf('group');
    const preferred = Object.keys(query).length ? content.itemsOf('group', query) : [];
    const seed = daily ? `step1:${today}:connections` : `${seedBase}:${round}`;
    return buildConnections(bank, seeded(seed), preferred);
  }, [daily, query, round, today, seedBase]);
  if (!puzzle) return <Empty>Not enough categories to build a puzzle yet.</Empty>;
  return <Board key={`${round}-${daily}`} puzzle={puzzle} daily={daily ? `${today}:connections` : undefined} focusLabel={focusLabel} onAgain={daily ? undefined : () => setRound((r) => r + 1)} />;
}

function Board({ puzzle, daily, focusLabel, onAgain }: { puzzle: ConnectionsPuzzle; daily?: string; focusLabel?: string; onAgain?: () => void }) {
  const { answer, completeGame } = useProgress();
  const already = useProgress((s) => (daily ? s.daily[daily] : undefined));
  const best = useProgress((s) => s.games.connections?.best ?? 0);
  const sessionId = useGameSession('connections', daily ? 'daily' : 'practice');
  const [tiles, setTiles] = useState(puzzle.tiles);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<PuzzleGroup[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [teach, setTeach] = useState<string | null>(null);
  const [finalBest] = useState(best);
  const over = solved.length === 4 || mistakes >= MAX_MISTAKES;
  useStudyContext({ gameId: 'connections', activity: teach ? 'lesson' : over ? 'explanation' : 'play', conceptIds: [...new Set(puzzle.groups.flatMap((g) => g.conceptIds))] });

  const remaining = tiles.filter((t) => !solved.some((g) => g.members.includes(t)));

  const finish = (found: PuzzleGroup[], m: number) => {
    // Every group is a learning event: found = correct, unfound at the end = incorrect.
    for (const g of puzzle.groups) {
      const ok = found.includes(g);
      answer({
        gameId: 'connections',
        sessionId,
        item: { id: g.id, conceptIds: g.conceptIds, difficulty: g.difficulty as 1 | 2 | 3 | 4 | 5 },
        correct: ok,
        prompt: `Connections: which terms make "${g.label}"?`,
        response: ok ? g.members.join(', ') : 'Group not found',
        expected: g.members.join(', '),
      });
    }
    completeGame({ gameId: 'connections', sessionId, score: scoreConnections(found.length, m), correct: found.length, total: 4, daily });
  };

  const submit = () => {
    if (selected.length !== 4) return;
    const r = checkGuess(puzzle, selected, guesses);
    if (r.kind === 'repeat') {
      setMessage('Already guessed');
      return;
    }
    setGuesses([...guesses, selected]);
    if (r.kind === 'correct') {
      const found = [...solved, r.group];
      setSolved(found);
      setSelected([]);
      setMessage('');
      if (found.length === 4) finish(found, mistakes);
    } else {
      const m = mistakes + 1;
      setMistakes(m);
      setMessage(r.kind === 'one-away' ? 'One away…' : 'Not a group');
      setShake(true);
      window.setTimeout(() => setShake(false), 320);
      if (m >= MAX_MISTAKES) finish(solved, m);
    }
  };

  // Found groups first, then (once the game is over) the ones that were missed.
  const shownGroups = over ? [...solved, ...puzzle.groups.filter((g) => !solved.includes(g))] : solved;
  const score = scoreConnections(solved.length, mistakes);

  return (
    <GameFrame
      gameId="connections"
      title={daily ? 'Daily Connections' : 'Medical Connections'}
      subtitle={focusLabel ?? 'Find four groups of four.'}
      status={
        <span className="dots" aria-label={`${MAX_MISTAKES - mistakes} mistakes left`}>
          {Array.from({ length: MAX_MISTAKES }, (_, i) => (
            <span key={i} className={i < mistakes ? 'used' : ''} />
          ))}
        </span>
      }
    >
      {already && !over && <p className="small muted">You finished today’s puzzle (score {already.score}). Replays don’t change your daily result.</p>}
      <div className="cx-grid" role="group" aria-label="Terms">
        {shownGroups.map((g) => (
            <div key={g.id} className={`cx-solved tier-${g.tier}`}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.label}</strong>
              <div className="small">{g.members.join(' · ')}</div>
            </div>
        ))}
        {!over &&
          remaining.map((t) => (
            <button
              key={t}
              className={`cx-tile${shake && selected.includes(t) ? ' shake' : ''}`}
              aria-pressed={selected.includes(t)}
              onClick={() => {
                setMessage('');
                setSelected(selected.includes(t) ? selected.filter((x) => x !== t) : selected.length < 4 ? [...selected, t] : selected);
              }}
            >
              {t}
            </button>
          ))}
      </div>
      <p aria-live="polite" className="small" style={{ minHeight: 22, fontWeight: 700, textAlign: 'center' }}>
        {message}
      </p>
      {!over ? (
        <div className="row-wrap" style={{ justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => setTiles(shuffle(tiles))}>Shuffle</button>
          <button className="btn btn-ghost" disabled={!selected.length} onClick={() => setSelected([])}>Deselect</button>
          <button className="btn btn-primary" disabled={selected.length !== 4} onClick={submit}>Submit</button>
        </div>
      ) : (
        <div className="stack">
          <ScoreCard score={score} best={finalBest} lines={[`${solved.length} of 4 groups found`, `${mistakes} mistake${mistakes === 1 ? '' : 's'}`]}>
            <div className="row-wrap">
              {onAgain && <button className="btn btn-primary" onClick={onAgain}>New puzzle</button>}
              <Link to="/" className="btn btn-ghost" style={{ color: '#fff', borderColor: '#555' }}>Home</Link>
            </div>
          </ScoreCard>
          <section className="stack-sm">
            <h2>The four groups explained</h2>
            {puzzle.groups.map((g) => (
              <div key={g.id} className="card card-tight stack-sm">
                <div className="row between">
                  <strong>{g.label}</strong>
                  <span className={`badge tier-${g.tier}`}>Tier {g.tier}</span>
                </div>
                <p className="small">{g.members.join(' · ')}</p>
                <p className="small muted">{g.explanation}</p>
                {g.conceptIds[0] && (
                  <button className="btn btn-text btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => setTeach(g.conceptIds[0]!)}>
                    Teach me this
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
      {teach && <TeachSheet conceptId={teach} onClose={() => setTeach(null)} />}
    </GameFrame>
  );
}
