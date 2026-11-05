import { useState } from 'react';
import { Link } from 'react-router';
import { GAME_ICONS, Icon } from '@/components/Icon';
import { PageHeader } from '@/components/ui';
import { GAMES, type GameMeta } from '@/features/games/registry';
import { useProgress } from '@/state/progress';

type Mode = 'all' | 'relax' | 'learn' | 'challenge';
const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: 'all', label: 'All', blurb: 'Every game in the library.' },
  { id: 'relax', label: 'Relax', blurb: 'Short games, optional timers, no pressure. Progress is still tracked.' },
  { id: 'learn', label: 'Learn', blurb: 'Structured practice with detailed explanations and spaced review.' },
  { id: 'challenge', label: 'Challenge', blurb: 'Survival runs and personal records. Accuracy beats speed.' },
];

export function Arcade() {
  const [mode, setMode] = useState<Mode>('all');
  const games = useProgress((s) => s.games);
  const list = GAMES.filter((g) => mode === 'all' || g.modes.includes(mode));
  const playable = list.filter((g) => g.status === 'playable');
  const planned = list.filter((g) => g.status === 'planned');
  return (
    <div className="stack-lg">
      <PageHeader title="Arcade" eyebrow="Play to learn">
        <div className="row-wrap" role="radiogroup" aria-label="Experience">
          {MODES.map((m) => (
            <button key={m.id} className="chip" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="muted small">{MODES.find((m) => m.id === mode)!.blurb}</p>
      </PageHeader>
      <div className="grid">
        {playable.map((g) => (
          <GameTile key={g.id} g={g} best={games[g.id]?.best} played={games[g.id]?.completed ?? 0} mode={mode} />
        ))}
      </div>
      {planned.length > 0 && (
        <section className="stack">
          <div>
            <h2>In development</h2>
            <p className="small muted">Designed and on the roadmap; not playable yet.</p>
          </div>
          <div className="grid">
            {planned.map((g) => (
              <GameTile key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GameTile({ g, best, played, mode }: { g: GameMeta; best?: number; played?: number; mode?: Mode }) {
  const inner = (
    <>
      <div className="row between">
        <span className={`game-icon${g.status === 'planned' ? ' planned' : ''}`}>
          <Icon name={g.status === 'planned' ? 'lock' : GAME_ICONS[g.id]!} />
        </span>
        {g.status === 'planned' ? <span className="badge">In development</span> : <span className="small muted">{g.minutes} min</span>}
      </div>
      <div className="stack-sm" style={{ gap: 4 }}>
        <h3>{g.title}</h3>
        <p className="small muted">{g.blurb}</p>
      </div>
      {g.status === 'playable' && (
        <div className="row small muted" style={{ marginTop: 'auto' }}>
          {played ? <span>Played {played}×</span> : <span>New</span>}
          {best ? <span>· Best {best}</span> : null}
        </div>
      )}
    </>
  );
  if (g.status === 'planned') {
    return (
      <div className="card game-tile" aria-disabled="true" style={{ opacity: 0.7 }}>
        {inner}
      </div>
    );
  }
  const q = mode === 'relax' || mode === 'challenge' || mode === 'learn' ? `?mode=${mode}` : '';
  return (
    <Link to={`/play/${g.id}${q}`} className="card card-link game-tile">
      {inner}
    </Link>
  );
}
