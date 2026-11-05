/**
 * Shared learning-event model. Every game emits these; the progress store applies them to
 * aggregates and keeps a capped log for future cloud sync. Events carry a unique id so
 * re-delivery (retries, sync) is idempotent: applying the same id twice is a no-op.
 */
import type { GameId } from '@/features/games/registry';

export type Activity = 'play' | 'explanation' | 'lesson' | 'review' | 'mistakes';

export interface StudyContext {
  gameId?: GameId;
  conceptIds?: string[];
  activity: Activity;
}

interface Base {
  id: string;
  at: number;
  sessionId?: string;
}

export type LearningEvent = Base &
  (
    | { type: 'game_started'; gameId: GameId; mode: string }
    | { type: 'game_paused'; gameId: GameId }
    | { type: 'game_resumed'; gameId: GameId }
    | { type: 'game_completed'; gameId: GameId; score: number; correct: number; total: number; daily?: string }
    | { type: 'question_presented'; gameId: GameId; itemId: string }
    | {
        type: 'answer_submitted';
        gameId: GameId;
        itemId: string;
        conceptIds: string[];
        correct: boolean;
        response: string;
        expected: string;
        prompt: string;
        hintsUsed: number;
        latencyMs: number;
        difficulty: number;
      }
    | { type: 'hint_used'; gameId: GameId; itemId: string }
    | { type: 'explanation_opened'; conceptId: string; depth: 'quick' | 'detailed' | 'lesson'; itemId?: string }
    | { type: 'concept_reviewed'; conceptId: string; rating: 1 | 2 | 3 | 4 }
    | { type: 'study_time'; ms: number; context: StudyContext }
  );

export type EventType = LearningEvent['type'];
