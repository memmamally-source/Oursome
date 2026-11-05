import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Empty } from '@/components/ui';
import { content } from '@/content';
import type { ItemQuery } from '@/content/repo';
import type { DisciplineId, SystemId } from '@/content/schema';
import { DISCIPLINES, SYSTEMS } from '@/content/taxonomy';
import { ConnectionsGame } from '@/features/games/connections/ConnectionsGame';
import { CrosswordGame } from '@/features/games/crossword/CrosswordGame';
import { MysteryGame } from '@/features/games/mystery/MysteryGame';
import { FactFictionGame, ReviewGame, SurvivalGame } from '@/features/games/quiz/QuizGames';
import { getGame } from '@/features/games/registry';

/** Routes /play/:gameId?daily=1&topic=…&concept=…&discipline=…&system=…&mode=… to a game. */
export function Play() {
  const { gameId = '' } = useParams();
  const [params] = useSearchParams();
  const game = getGame(gameId);
  const daily = params.get('daily') === '1';
  const mode = params.get('mode') ?? undefined;
  const topic = params.get('topic');
  const concept = params.get('concept');
  const discipline = params.get('discipline') as DisciplineId | null;
  const system = params.get('system') as SystemId | null;

  const { query, label } = useMemo(() => {
    const q: ItemQuery = {};
    let l: string | undefined;
    if (concept && content.concept(concept)) {
      q.conceptIds = [concept];
      l = content.concept(concept)!.title;
    } else if (topic) {
      q.topic = topic;
      l = content.topicTitle(topic);
    } else if (discipline && DISCIPLINES[discipline]) {
      q.discipline = discipline;
      l = DISCIPLINES[discipline].title;
    } else if (system && SYSTEMS[system]) {
      q.system = system;
      l = SYSTEMS[system].title;
    }
    return { query: q, label: l };
  }, [concept, topic, discipline, system]);

  if (!game) return <Empty>Unknown game.</Empty>;
  if (game.status !== 'playable') {
    return (
      <Empty>
        <strong>{game.title}</strong> is in development and not playable yet.
        <div style={{ marginTop: 12 }}>
          <Link className="btn btn-primary" to="/arcade">Back to the Arcade</Link>
        </div>
      </Empty>
    );
  }
  const key = `${gameId}|${params.toString()}`;
  switch (game.id) {
    case 'survival':
      return <SurvivalGame key={key} query={query} focusLabel={label} mode={mode} />;
    case 'fact-fiction':
      return <FactFictionGame key={key} query={query} focusLabel={label} />;
    case 'review':
      return <ReviewGame key={key} />;
    case 'connections':
      return <ConnectionsGame key={key} daily={daily} query={query} focusLabel={label} />;
    case 'crossword':
      return <CrosswordGame key={key} daily={daily} query={query} focusLabel={label} />;
    case 'mystery':
      return <MysteryGame key={key} daily={daily} query={query} focusLabel={label} />;
    default:
      return <Empty>Unknown game.</Empty>;
  }
}
