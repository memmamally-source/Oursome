/** Memoised views of progress for screens. Selectors return stable references; maths lives in engine/. */
import { useMemo } from 'react';
import { content } from '@/content';
import { priorityWeaknesses, strongest, bySystem, byDiscipline } from '@/engine/analysis';
import { buildPlan, dueConcepts, type PlanBlock } from '@/engine/plan';
import { dateKey } from '@/engine/random';
import { timeSummary } from '@/engine/stats';
import { useNow } from './clock';
import { useProgress } from './progress';

export function useTimeSummary() {
  const days = useProgress((s) => s.days);
  const external = useProgress((s) => s.external);
  return useMemo(() => timeSummary({ days, external }), [days, external]);
}

export function useDailyDone(): Set<string> {
  const daily = useProgress((s) => s.daily);
  return useMemo(() => new Set(Object.keys(daily)), [daily]);
}

export function useAnalysis() {
  const concepts = useProgress((s) => s.concepts);
  const srs = useProgress((s) => s.srs);
  const dailyDone = useDailyDone();
  const now = useNow();
  return useMemo(() => {
    const disciplines = byDiscipline(content, concepts, now);
    const systems = bySystem(content, concepts, now);
    return {
      now,
      due: dueConcepts(srs, content, now),
      weak: priorityWeaknesses(content, concepts, now, 3),
      strongestDiscipline: strongest(disciplines),
      strongestSystem: strongest(systems),
      disciplines,
      systems,
      plan: (minutes: number) => buildPlan({ repo: content, records: concepts, srs, dailyDone, minutes, now }),
    };
  }, [concepts, srs, dailyDone, now]);
}

export function playHref(b: Pick<PlanBlock, 'gameId' | 'focus' | 'daily'>): string {
  const q = new URLSearchParams();
  if (b.daily) q.set('daily', '1');
  if (b.focus?.topic) q.set('topic', b.focus.topic);
  if (b.focus?.concept) q.set('concept', b.focus.concept);
  const s = q.toString();
  return `/play/${b.gameId}${s ? `?${s}` : ''}`;
}

export const todayKey = () => dateKey();
