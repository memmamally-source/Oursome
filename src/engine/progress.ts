/**
 * Progress state and the single reducer that applies learning events to it. Pure and idempotent:
 * every state change goes through `applyEvent`, and an event id already in the log is ignored.
 */
import type { PackageId } from '@/config/packages';
import type { GameId } from '@/features/games/registry';
import type { LearningEvent, StudyContext } from './events';
import { recordOutcome, type ConceptRecord } from './mastery';
import { dateKey } from './random';
import { applyAttempt, type Card, type Rating } from './srs';
import { creditDay, emptyDay, type DayTime } from './studyTime';

export type PrepStage = 'beginning' | 'midway' | 'revising';
export type PlayStyle = 'casual' | 'focused' | 'both';
export type ThemePref = 'system' | 'light' | 'dark';

export interface Profile {
  packageId: PackageId;
  onboarded: boolean;
  examDate?: string;
  stage?: PrepStage;
  weakSubjects: string[];
  dailyGoalMin: number;
  style: PlayStyle;
  theme: ThemePref;
  reduceMotion: boolean;
  /** Public leaderboards are opt-in. */
  leaderboardOptIn: boolean;
  remindersOn: boolean;
  createdAt: number;
}

export interface MistakeEntry {
  itemId: string;
  gameId: GameId;
  conceptIds: string[];
  prompt: string;
  response: string;
  expected: string;
  difficulty: number;
  count: number;
  firstAt: number;
  lastAt: number;
  /** Every attempt at this item since the first mistake (retries included). */
  history: { at: number; correct: boolean }[];
}

export interface GameStat {
  played: number;
  completed: number;
  best: number;
  totalScore: number;
  lastPlayed: number;
}

export interface ExternalLog {
  id: string;
  date: string; // yyyy-MM-dd
  resource: string;
  minutes: number;
  subject?: string;
  notes?: string;
}

export interface ContentReport {
  id: string;
  at: number;
  itemId?: string;
  conceptId?: string;
  text: string;
}

export interface ProgressState {
  profile: Profile;
  concepts: Record<string, ConceptRecord>;
  srs: Record<string, Card>;
  mistakes: Record<string, MistakeEntry>;
  days: Record<string, DayTime>;
  counts: Record<string, { answered: number; correct: number }>;
  games: Partial<Record<GameId, GameStat>>;
  daily: Record<string, { score: number; correct: number; total: number; at: number }>;
  explanationsOpened: number;
  external: ExternalLog[];
  savedConcepts: string[];
  favouriteItems: string[];
  reports: ContentReport[];
  /** Capped append-only event log (for sync) — aggregates above never depend on it being complete. */
  log: LearningEvent[];
}

export const LOG_CAP = 2000;

export const defaultProfile = (now = Date.now()): Profile => ({
  packageId: 'step1',
  onboarded: false,
  weakSubjects: [],
  dailyGoalMin: 15,
  style: 'both',
  theme: 'system',
  reduceMotion: false,
  leaderboardOptIn: false,
  remindersOn: false,
  createdAt: now,
});

export const initialProgress = (now = Date.now()): ProgressState => ({
  profile: defaultProfile(now),
  concepts: {},
  srs: {},
  mistakes: {},
  days: {},
  counts: {},
  games: {},
  daily: {},
  explanationsOpened: 0,
  external: [],
  savedConcepts: [],
  favouriteItems: [],
  reports: [],
  log: [],
});

export type Classifier = (conceptId: string) => { discipline: string; system: string } | undefined;

export function ratingFor(correct: boolean, hintsUsed: number): Rating {
  if (!correct) return 1;
  return hintsUsed > 0 ? 2 : 3;
}

const bumpGame = (s: ProgressState, id: GameId, f: (g: GameStat) => GameStat) => {
  const g = s.games[id] ?? { played: 0, completed: 0, best: 0, totalScore: 0, lastPlayed: 0 };
  return { ...s.games, [id]: f(g) };
};

export function applyEvent(state: ProgressState, ev: LearningEvent, classify: Classifier): ProgressState {
  if (state.log.some((e) => e.id === ev.id)) return state;
  const s: ProgressState = { ...state, log: [...state.log, ev].slice(-LOG_CAP) };
  const day = dateKey(ev.at);

  switch (ev.type) {
    case 'game_started':
      return { ...s, games: bumpGame(s, ev.gameId, (g) => ({ ...g, played: g.played + 1, lastPlayed: ev.at })) };

    case 'game_completed': {
      const games = bumpGame(s, ev.gameId, (g) => ({
        ...g,
        completed: g.completed + 1,
        best: Math.max(g.best, ev.score),
        totalScore: g.totalScore + ev.score,
        lastPlayed: ev.at,
      }));
      const daily = ev.daily && !s.daily[ev.daily] ? { ...s.daily, [ev.daily]: { score: ev.score, correct: ev.correct, total: ev.total, at: ev.at } } : s.daily;
      return { ...s, games, daily };
    }

    case 'answer_submitted': {
      const concepts = { ...s.concepts };
      const srs = { ...s.srs };
      const rating = ratingFor(ev.correct, ev.hintsUsed);
      for (const cid of ev.conceptIds) {
        concepts[cid] = recordOutcome(concepts[cid], { at: ev.at, correct: ev.correct, difficulty: ev.difficulty });
        srs[cid] = applyAttempt(srs[cid], rating, ev.at);
      }
      const c = s.counts[day] ?? { answered: 0, correct: 0 };
      const counts = { ...s.counts, [day]: { answered: c.answered + 1, correct: c.correct + (ev.correct ? 1 : 0) } };
      let mistakes = s.mistakes;
      const prev = s.mistakes[ev.itemId];
      if (!ev.correct) {
        mistakes = {
          ...mistakes,
          [ev.itemId]: {
            itemId: ev.itemId,
            gameId: prev?.gameId ?? ev.gameId,
            conceptIds: ev.conceptIds,
            prompt: ev.prompt,
            response: ev.response,
            expected: ev.expected,
            difficulty: ev.difficulty,
            count: (prev?.count ?? 0) + 1,
            firstAt: prev?.firstAt ?? ev.at,
            lastAt: ev.at,
            history: [...(prev?.history ?? []), { at: ev.at, correct: false }],
          },
        };
      } else if (prev) {
        mistakes = { ...mistakes, [ev.itemId]: { ...prev, history: [...prev.history, { at: ev.at, correct: true }] } };
      }
      return { ...s, concepts, srs, counts, mistakes };
    }

    case 'explanation_opened':
      return { ...s, explanationsOpened: s.explanationsOpened + 1 };

    case 'concept_reviewed': {
      const srs = { ...s.srs, [ev.conceptId]: applyAttempt(s.srs[ev.conceptId], ev.rating, ev.at) };
      return { ...s, srs };
    }

    case 'study_time': {
      const days = { ...s.days, [day]: creditDay(s.days[day] ?? emptyDay(), ev.ms, ev.context, classify) };
      return { ...s, days };
    }

    default:
      return s;
  }
}

/** Whether a mistake has since been answered correctly on its latest attempt. */
export function mistakeResolved(m: MistakeEntry): boolean {
  return m.history[m.history.length - 1]?.correct === true;
}

export type { StudyContext };
