import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { TeachSheet } from '@/components/learning';
import { Empty } from '@/components/ui';
import { content } from '@/content';
import type { ItemQuery } from '@/content/repo';
import { dateKey } from '@/engine/random';
import { useSeed } from '@/state/clock';
import { useProgress } from '@/state/progress';
import { useStudyContext } from '@/state/studyTimer';
import { GameFrame, ScoreCard, useGameSession } from '../GameFrame';
import { cellsOf, type Dir, type Placed } from './generator';
import { CROSSWORD_SIZES, buildCrossword, emptyFill, entryCorrect, gridSolved, scoreCrossword, type CrosswordKind, type Fill, type Puzzle } from './logic';

export function CrosswordGame({ daily, query, focusLabel }: { daily: boolean; query: ItemQuery; focusLabel?: string }) {
  const hasFocus = Object.keys(query).length > 0;
  const [kind, setKind] = useState<CrosswordKind | null>(daily ? 'mini' : hasFocus ? 'subject' : null);
  const [timed, setTimed] = useState(true);
  const [round, setRound] = useState(0);
  const seedBase = useSeed();
  const today = dateKey();
  const isDaily = kind === 'mini' || kind === 'standard' ? !hasFocus : false;
  const puzzle = useMemo(() => {
    if (!kind) return null;
    const seed = isDaily ? `step1:${today}:${kind}` : `${seedBase}:${round}`;
    return buildCrossword(content, kind, seed, kind === 'subject' ? query : {});
  }, [kind, isDaily, today, round, query, seedBase]);

  if (!kind) {
    return (
      <GameFrame gameId="crossword" title="Medical Crossword" pausable={false}>
        <div className="grid">
          {(['mini', 'standard', 'advanced'] as const).map((k) => (
            <button key={k} className="card card-link stack-sm" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setKind(k)}>
              <h3>{CROSSWORD_SIZES[k].label}</h3>
              <span className="small muted">
                {k === 'mini' ? 'About 6 words · 3 minutes · same for everyone today' : k === 'standard' ? 'About 12 words · same for everyone today' : 'Harder clues · new grid each time'}
              </span>
            </button>
          ))}
        </div>
        <label className="row small">
          <input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} /> Untimed (hide the clock)
        </label>
        <p className="small muted">Subject crosswords: open a subject from the Subjects tab and choose Medical Crossword.</p>
      </GameFrame>
    );
  }
  if (!puzzle) return <Empty>Not enough clues in this area to build a crossword yet. Try a broader subject.</Empty>;
  return (
    <Board
      key={`${kind}-${round}`}
      puzzle={puzzle}
      timed={timed}
      daily={isDaily ? `${today}:crossword${kind === 'mini' ? '' : `-${kind}`}` : undefined}
      title={isDaily ? (kind === 'mini' ? 'Daily Medical Mini' : 'Daily Standard Crossword') : hasFocus ? `${focusLabel} crossword` : CROSSWORD_SIZES[kind].label}
      onAgain={isDaily ? undefined : () => setRound((r) => r + 1)}
    />
  );
}

function Board({ puzzle, timed, daily, title, onAgain }: { puzzle: Puzzle; timed: boolean; daily?: string; title: string; onAgain?: () => void }) {
  const { grid } = puzzle;
  const { answer, completeGame } = useProgress();
  const best = useProgress((s) => s.games.crossword?.best ?? 0);
  const sessionId = useGameSession('crossword', daily ? 'daily' : 'practice');
  const [fill, setFill] = useState<Fill>(() => emptyFill(grid));
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState<{ r: number; c: number; dir: Dir }>(() => ({ r: grid.entries[0]!.row, c: grid.entries[0]!.col, dir: grid.entries[0]!.dir }));
  const [done, setDone] = useState<null | { score: number; perEntry: Map<string, { correct: boolean; hinted: boolean }> }>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finalBest] = useState(best);
  const inputRef = useRef<HTMLInputElement>(null);

  const entryAt = useCallback((r: number, c: number, dir: Dir) => grid.entries.find((e) => e.dir === dir && cellsOf(e).some(([er, ec]) => er === r && ec === c)), [grid.entries]);
  const current = entryAt(pos.r, pos.c, pos.dir) ?? entryAt(pos.r, pos.c, pos.dir === 'across' ? 'down' : 'across')!;
  const curCells = new Set(cellsOf(current).map(([r, c]) => `${r},${c}`));
  const item = puzzle.items.get(current.id);
  useStudyContext({ gameId: 'crossword', activity: teach ? 'lesson' : done ? 'explanation' : 'play', conceptIds: item?.conceptIds });

  useEffect(() => {
    if (!timed || done) return;
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(t);
  }, [timed, done, startedAt]);

  const select = (r: number, c: number) => {
    const across = entryAt(r, c, 'across');
    const down = entryAt(r, c, 'down');
    let dir: Dir = pos.dir;
    if (r === pos.r && c === pos.c && across && down) dir = pos.dir === 'across' ? 'down' : 'across';
    else if (!entryAt(r, c, dir)) dir = across ? 'across' : 'down';
    setPos({ r, c, dir });
    inputRef.current?.focus();
  };

  const goEntry = (e: Placed) => {
    const first = cellsOf(e).find(([r, c]) => !fill[r]![c]) ?? cellsOf(e)[0]!;
    setPos({ r: first[0], c: first[1], dir: e.dir });
    inputRef.current?.focus();
  };

  const finish = useCallback(
    (f: Fill) => {
      const res = scoreCrossword(grid, f, revealed);
      setDone(res);
      for (const e of grid.entries) {
        const it = puzzle.items.get(e.id);
        if (!it) continue;
        const got = cellsOf(e).map(([r, c]) => f[r]![c] || '·').join('');
        const r = res.perEntry.get(e.id)!;
        answer({ gameId: 'crossword', sessionId, item: it, correct: r.correct, prompt: `Crossword: ${e.clue}`, response: got, expected: e.answer, hintsUsed: r.hinted ? 1 : 0 });
      }
      completeGame({ gameId: 'crossword', sessionId, score: res.score, correct: [...res.perEntry.values()].filter((x) => x.correct).length, total: grid.entries.length, daily });
    },
    [answer, completeGame, daily, grid, puzzle.items, revealed, sessionId],
  );

  const write = (letter: string) => {
    if (done) return;
    const next = fill.map((row) => [...row]);
    next[pos.r]![pos.c] = letter;
    setFill(next);
    setWrong((w) => {
      const n = new Set(w);
      n.delete(`${pos.r},${pos.c}`);
      return n;
    });
    // Advance within the entry.
    const cells = cellsOf(current);
    const idx = cells.findIndex(([r, c]) => r === pos.r && c === pos.c);
    const after = cells.slice(idx + 1).find(([r, c]) => !next[r]![c]) ?? cells[idx + 1];
    if (after) setPos({ r: after[0], c: after[1], dir: current.dir });
    if (gridSolved(grid, next)) finish(next);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (done) return;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      write(k.toUpperCase());
    } else if (k === 'Backspace') {
      e.preventDefault();
      if (fill[pos.r]![pos.c]) write('');
      else {
        const cells = cellsOf(current);
        const idx = cells.findIndex(([r, c]) => r === pos.r && c === pos.c);
        const prev = cells[idx - 1];
        if (prev) {
          const next = fill.map((row) => [...row]);
          next[prev[0]]![prev[1]] = '';
          setFill(next);
          setPos({ r: prev[0], c: prev[1], dir: current.dir });
        }
      }
    } else if (k.startsWith('Arrow')) {
      e.preventDefault();
      const [dr, dc] = k === 'ArrowUp' ? [-1, 0] : k === 'ArrowDown' ? [1, 0] : k === 'ArrowLeft' ? [0, -1] : [0, 1];
      const dir: Dir = dr ? 'down' : 'across';
      if (dir !== pos.dir && entryAt(pos.r, pos.c, dir)) return setPos({ ...pos, dir });
      let r = pos.r + dr;
      let c = pos.c + dc;
      while (grid.letters[r]?.[c] === null) {
        r += dr;
        c += dc;
      }
      if (grid.letters[r]?.[c]) setPos({ r, c, dir: entryAt(r, c, dir) ? dir : pos.dir });
    } else if (k === 'Tab' || k === 'Enter') {
      e.preventDefault();
      const i = grid.entries.indexOf(current);
      goEntry(grid.entries[(i + (e.shiftKey ? -1 : 1) + grid.entries.length) % grid.entries.length]!);
    } else if (k === ' ') {
      e.preventDefault();
      if (entryAt(pos.r, pos.c, pos.dir === 'across' ? 'down' : 'across')) setPos({ ...pos, dir: pos.dir === 'across' ? 'down' : 'across' });
    }
  };

  const revealLetter = () => {
    const target = cellsOf(current).find(([r, c]) => fill[r]![c] !== grid.letters[r]![c]);
    if (!target) return;
    const [r, c] = target;
    setRevealed(new Set(revealed).add(`${r},${c}`));
    const next = fill.map((row) => [...row]);
    next[r]![c] = grid.letters[r]![c]!;
    setFill(next);
    if (gridSolved(grid, next)) window.setTimeout(() => finish(next), 0);
  };

  const checkWord = () => {
    const w = new Set(wrong);
    for (const [r, c] of cellsOf(current)) if (fill[r]![c] && fill[r]![c] !== grid.letters[r]![c]) w.add(`${r},${c}`);
    setWrong(w);
  };

  const mins = Math.floor(elapsed / 60000);
  const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');

  return (
    <GameFrame gameId="crossword" title={title} status={timed && !done ? <span className="num small" style={{ fontWeight: 700 }}><Icon name="clock" size={16} /> {mins}:{secs}</span> : undefined}>
      <div className="cw-wrap">
        <div className="stack-sm">
          <div className="cw-clue-bar" aria-live="polite">
            <span className="badge badge-red">
              {current.number}
              {current.dir === 'across' ? 'A' : 'D'}
            </span>
            <span>{current.clue}</span>
            <span className="muted small" style={{ marginLeft: 'auto' }}>({current.answer.length})</span>
          </div>
          <div className="cw-grid" style={{ gridTemplateColumns: `repeat(${grid.width}, 1fr)` }} onClick={() => inputRef.current?.focus()}>
            {grid.letters.map((row, r) =>
              row.map((sol, c) => {
                if (!sol) return <div key={`${r}-${c}`} className="cw-cell" aria-hidden />;
                const k = `${r},${c}`;
                const cls = ['cw-cell', 'open', curCells.has(k) ? 'in-word' : '', pos.r === r && pos.c === c ? 'active' : '', revealed.has(k) ? 'revealed' : '', wrong.has(k) ? 'wrong' : ''].join(' ');
                return (
                  <div key={k} className={cls} onClick={(e) => (e.stopPropagation(), select(r, c))} role="gridcell" aria-label={`Row ${r + 1} column ${c + 1}${fill[r]![c] ? `, ${fill[r]![c]}` : ', empty'}`}>
                    {grid.numbers[r]![c] && <span className="cw-num">{grid.numbers[r]![c]}</span>}
                    <span className="cw-letter">{done && !fill[r]![c] ? <span style={{ color: '#a91018' }}>{sol}</span> : fill[r]![c]}</span>
                  </div>
                );
              }),
            )}
          </div>
          <input
            ref={inputRef}
            className="cw-input"
            aria-label="Crossword input: type letters, arrows to move, Tab for next clue, Space to switch direction"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value=""
            onChange={(e) => {
              const ch = e.target.value.slice(-1);
              if (/^[a-zA-Z]$/.test(ch)) write(ch.toUpperCase());
            }}
            onKeyDown={onKey}
          />
          {!done && (
            <div className="row-wrap" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={checkWord}>Check word</button>
              <button className="btn btn-ghost btn-sm" onClick={revealLetter}>
                <Icon name="bulb" size={16} /> Reveal letter
              </button>
              <button className="btn btn-dark btn-sm" onClick={() => finish(fill)}>Finish</button>
            </div>
          )}
          <p className="tiny muted" style={{ textAlign: 'center' }}>
            Tap a square twice to switch direction. Keyboard: arrows, Tab, Space, Backspace.
          </p>
        </div>
        <div className="stack">
          {(['across', 'down'] as const).map((d) => (
            <div key={d} className="card card-tight">
              <h3 style={{ textTransform: 'capitalize', marginBottom: 6 }}>{d}</h3>
              <ul className="list cw-clues">
                {grid.entries
                  .filter((e) => e.dir === d)
                  .map((e) => (
                    <li key={e.id} aria-current={e === current} className={entryCorrect(e, fill) ? 'done' : ''} onClick={() => goEntry(e)} style={{ borderBottom: 'none', padding: '6px 8px' }}>
                      <strong className="num">{e.number}</strong> <span className="small">{e.clue}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {done && (
        <div className="stack">
          <ScoreCard
            score={done.score}
            best={finalBest}
            lines={[`${[...done.perEntry.values()].filter((x) => x.correct).length} of ${grid.entries.length} words solved`, revealed.size ? `${revealed.size} letter${revealed.size === 1 ? '' : 's'} revealed` : 'No hints used', timed ? `Time ${mins}:${secs}` : 'Untimed']}
          >
            <div className="row-wrap">
              {onAgain && <button className="btn btn-primary" onClick={onAgain}>New crossword</button>}
              <Link to="/" className="btn btn-ghost" style={{ color: '#fff', borderColor: '#555' }}>Home</Link>
            </div>
          </ScoreCard>
          <section className="stack-sm">
            <h2>Answers explained</h2>
            {grid.entries.map((e) => {
              const r = done.perEntry.get(e.id)!;
              const it = puzzle.items.get(e.id);
              return (
                <div key={e.id} className="card card-tight stack-sm">
                  <div className="row between">
                    <strong>
                      {e.number} {e.dir}: {e.answer}
                    </strong>
                    <span className={`badge ${r.correct ? 'badge-ok' : 'badge-bad'}`}>
                      <Icon name={r.correct ? 'check' : 'x'} size={14} /> {r.correct ? (r.hinted ? 'Solved with a hint' : 'Solved') : 'Missed'}
                    </span>
                  </div>
                  <p className="small muted">{e.clue}</p>
                  {it && <p className="small">{it.mini}</p>}
                  {it && (
                    <button className="btn btn-text btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => setTeach(it.conceptIds[0]!)}>
                      Teach me this
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}
      {teach && <TeachSheet conceptId={teach} onClose={() => setTeach(null)} />}
    </GameFrame>
  );
}
