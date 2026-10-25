import type { EventOccurrence } from '@/features/types';
import { addDays, fromDateKey, toDateKey, type DateKey } from '@/lib/dates';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Northern-hemisphere meteorological seasons (US/UK/CA launch markets). */
export function seasonOf(date: Date): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export type Occasion = {
  key: string;
  title: string;
  kind: 'birthday' | 'anniversary' | 'occasion';
  when: 'today' | 'tomorrow';
  /** How many years, when the original date's year is known (e.g. "10th anniversary"). */
  years?: number;
};

const kindOf = (title: string): Occasion['kind'] =>
  /birthday|bday/i.test(title) ? 'birthday' : /anniversary/i.test(title) ? 'anniversary' : 'occasion';

/** Important dates happening today or tomorrow, today first. */
export function upcomingOccasions(important: EventOccurrence[], now: Date): Occasion[] {
  const today = toDateKey(now);
  const tomorrow = toDateKey(addDays(now, 1));
  return important
    .filter((o) => o.date === today || o.date === tomorrow)
    .map((o) => {
      const startYear = Number(o.event.start.slice(0, 4));
      const years = fromDateKey(o.date).getFullYear() - startYear;
      return {
        key: o.key,
        title: o.event.title,
        kind: kindOf(o.event.title),
        when: (o.date === today ? 'today' : 'tomorrow') as Occasion['when'],
        years: o.event.recurrence?.freq === 'yearly' && years > 0 ? years : undefined,
      };
    })
    .sort((a, b) => (a.when === b.when ? 0 : a.when === 'today' ? -1 : 1));
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** "Good morning, Alex." and the line under it. */
export function homeGreeting(now: Date, firstName: string | undefined, household: string | undefined): { hello: string; line: string } {
  const h = now.getHours();
  const part = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return {
    hello: `${part}${firstName ? `, ${firstName}` : ''}.`,
    line: household ? `Here’s what’s happening at ${household} today.` : 'Here’s what’s happening at home today.',
  };
}

export type { DateKey };
