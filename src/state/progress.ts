/**
 * App-wide progress store (Zustand, persisted to localStorage on this device). Every write goes
 * through `applyEvent`, the same reducer a future cloud sync will replay, so local and synced
 * state cannot drift. See DATABASE_ARCHITECTURE.md for the Firestore mapping.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Brand } from '@/config/brand';
import { content } from '@/content';
import type { GameItem } from '@/content/schema';
import type { LearningEvent, StudyContext } from '@/engine/events';
import {
  applyEvent,
  initialProgress,
  type ContentReport,
  type ExternalLog,
  type Profile,
  type ProgressState,
} from '@/engine/progress';
import { uid } from '@/engine/random';
import type { GameId } from '@/features/games/registry';

type EventInput = LearningEvent extends infer E ? (E extends LearningEvent ? Omit<E, 'id' | 'at'> & { at?: number } : never) : never;

export interface AnswerInput {
  gameId: GameId;
  item: Pick<GameItem, 'id' | 'conceptIds' | 'difficulty'>;
  correct: boolean;
  prompt: string;
  response: string;
  expected: string;
  hintsUsed?: number;
  latencyMs?: number;
  sessionId?: string;
}

interface Actions {
  /** Apply a learning event. Pass `id` to make the call idempotent (same id = applied once). */
  emit: (e: EventInput, id?: string) => void;
  setProfile: (p: Partial<Profile>) => void;
  startGame: (gameId: GameId, mode: string, sessionId: string) => void;
  answer: (a: AnswerInput) => void;
  completeGame: (x: { gameId: GameId; sessionId: string; score: number; correct: number; total: number; daily?: string }) => void;
  creditStudy: (ms: number, context: StudyContext) => void;
  openExplanation: (conceptId: string, depth: 'quick' | 'detailed' | 'lesson', itemId?: string) => void;
  addExternal: (e: Omit<ExternalLog, 'id'>) => void;
  removeExternal: (id: string) => void;
  toggleSaved: (conceptId: string) => void;
  toggleFavourite: (itemId: string) => void;
  report: (r: Omit<ContentReport, 'id' | 'at'>) => void;
  /** Learner-chosen revision date for a concept ("Schedule revision"). */
  scheduleReview: (conceptId: string, inDays: number) => void;
  resetAll: () => void;
}

export type Store = ProgressState & Actions;

const classify = (conceptId: string) => {
  const c = content.concept(conceptId);
  return c ? { discipline: c.discipline, system: c.system } : undefined;
};

export const useProgress = create<Store>()(
  persist(
    (set, get) => ({
      ...initialProgress(),
      emit: (e, id) => {
        const ev = { ...e, id: id ?? uid(), at: e.at ?? Date.now() } as LearningEvent;
        set((s) => applyEvent(s, ev, classify));
      },
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      startGame: (gameId, mode, sessionId) => get().emit({ type: 'game_started', gameId, mode, sessionId }, `start:${sessionId}`),
      answer: (a) =>
        get().emit({
          type: 'answer_submitted',
          gameId: a.gameId,
          sessionId: a.sessionId,
          itemId: a.item.id,
          conceptIds: a.item.conceptIds,
          difficulty: a.item.difficulty,
          correct: a.correct,
          prompt: a.prompt,
          response: a.response,
          expected: a.expected,
          hintsUsed: a.hintsUsed ?? 0,
          latencyMs: a.latencyMs ?? 0,
        }),
      completeGame: (x) => get().emit({ type: 'game_completed', ...x }, `done:${x.sessionId}`),
      creditStudy: (ms, context) => {
        if (ms > 0) get().emit({ type: 'study_time', ms, context });
      },
      openExplanation: (conceptId, depth, itemId) => get().emit({ type: 'explanation_opened', conceptId, depth, itemId }),
      addExternal: (e) => set((s) => ({ external: [...s.external, { ...e, id: uid() }] })),
      removeExternal: (id) => set((s) => ({ external: s.external.filter((x) => x.id !== id) })),
      toggleSaved: (id) =>
        set((s) => ({ savedConcepts: s.savedConcepts.includes(id) ? s.savedConcepts.filter((x) => x !== id) : [...s.savedConcepts, id] })),
      toggleFavourite: (id) =>
        set((s) => ({ favouriteItems: s.favouriteItems.includes(id) ? s.favouriteItems.filter((x) => x !== id) : [...s.favouriteItems, id] })),
      report: (r) => set((s) => ({ reports: [...s.reports, { ...r, id: uid(), at: Date.now() }] })),
      scheduleReview: (conceptId, inDays) =>
        set((s) => {
          const due = new Date();
          due.setHours(0, 0, 0, 0);
          const at = due.getTime() + inDays * 86_400_000;
          const card = s.srs[conceptId];
          return { srs: { ...s.srs, [conceptId]: card ? { ...card, due: at } : { stability: 1, difficulty: 5, lastReview: Date.now(), reps: 0, lapses: 0, due: at } } };
        }),
      resetAll: () => set({ ...initialProgress() }),
    }),
    {
      name: `${Brand.storageKey}:progress`,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Study-time events are frequent and fully captured in `days`; keep them out of the stored log.
      partialize: (s) => ({ ...s, log: s.log.filter((e) => e.type !== 'study_time').slice(-1000) }),
    },
  ),
);

/** Everything the learner has stored, for export ("View and export your data"). */
export function exportProgress(): string {
  const { log: _log, ...rest } = useProgress.getState();
  const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function'));
  return JSON.stringify({ app: Brand.name, exportedAt: new Date().toISOString(), ...data }, null, 2);
}
