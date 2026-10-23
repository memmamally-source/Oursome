import type { EventOccurrence } from '@/features/types';
import { dateKeyOf, minutesOfDay, timeKeyOf, type DateKey } from '@/lib/dates';

export type PositionedOccurrence = {
  occurrence: EventOccurrence;
  startMin: number;
  endMin: number;
  column: number;
  columns: number;
};

/**
 * Lay out timed occurrences for a single day into side-by-side columns.
 * Overlapping events share a cluster; each gets the first free column.
 */
export function layoutDay(occurrences: EventOccurrence[], date: DateKey, minDuration = 30): PositionedOccurrence[] {
  const items = occurrences
    .filter((o) => !o.event.allDay)
    .map((o) => {
      const startMin = dateKeyOf(o.start) < date ? 0 : minutesOfDay(timeKeyOf(o.start));
      const rawEnd = dateKeyOf(o.end) > date ? 24 * 60 : minutesOfDay(timeKeyOf(o.end));
      return { occurrence: o, startMin, endMin: Math.max(rawEnd, startMin + minDuration) };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: PositionedOccurrence[] = [];
  let cluster: PositionedOccurrence[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = columnEnds.length;
    for (const p of cluster) p.columns = columns;
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
  };

  for (const item of items) {
    if (item.startMin >= clusterEnd && cluster.length) flush();
    let column = columnEnds.findIndex((end) => end <= item.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[column] = item.endMin;
    }
    cluster.push({ ...item, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();
  return result;
}

/** Pairs of timed occurrences on the same day whose times overlap. */
export function findConflicts(occurrences: EventOccurrence[]): [EventOccurrence, EventOccurrence][] {
  const timed = occurrences.filter((o) => !o.event.allDay).sort((a, b) => a.start.localeCompare(b.start));
  const pairs: [EventOccurrence, EventOccurrence][] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].start >= timed[i].end) break;
      pairs.push([timed[i], timed[j]]);
    }
  }
  return pairs;
}

/** Back-to-back events (gap < `gapMinutes`) that may be tight if travel is needed. */
export function findTightGaps(occurrences: EventOccurrence[], gapMinutes = 15): [EventOccurrence, EventOccurrence][] {
  const timed = occurrences.filter((o) => !o.event.allDay && o.event.location).sort((a, b) => a.start.localeCompare(b.start));
  const pairs: [EventOccurrence, EventOccurrence][] = [];
  for (let i = 0; i + 1 < timed.length; i++) {
    const a = timed[i];
    const b = timed[i + 1];
    if (dateKeyOf(a.end) !== dateKeyOf(b.start) || b.start < a.end) continue;
    const gap = minutesOfDay(timeKeyOf(b.start)) - minutesOfDay(timeKeyOf(a.end));
    if (gap < gapMinutes && a.event.location !== b.event.location) pairs.push([a, b]);
  }
  return pairs;
}
