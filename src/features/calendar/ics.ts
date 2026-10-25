import type { CalendarEvent, Recurrence } from '@/features/types';
import {
  addDays,
  combine,
  dateKeyOf,
  fromDateKey,
  fromLocalDateTime,
  timeKeyOf,
  toDateKey,
  toLocalDateTime,
  type DateKey,
  type LocalDateTime,
} from '@/lib/dates';

/**
 * Calendar files (iCalendar, .ics): the format Google Calendar, Apple
 * Calendar and Outlook all import and export. This is one-way exchange
 * (a file at a time), not live sync.
 */

// ---------- Export ----------

const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters continue on the next line after a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += i ? 74 : 75) parts.push(line.slice(i, i + (i ? 74 : 75)));
  return parts.join('\r\n ');
}

const compactDate = (d: DateKey) => d.replace(/-/g, '');
const compactLocal = (v: LocalDateTime) => `${compactDate(dateKeyOf(v))}T${timeKeyOf(v).replace(':', '')}00`;
const utcStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

function rrule(r: Recurrence): string {
  const freq = r.freq === 'weekdays' ? 'WEEKLY;BYDAY=MO,TU,WE,TH,FR' : r.freq.toUpperCase();
  const interval = r.interval && r.interval > 1 ? `;INTERVAL=${r.interval}` : '';
  const until = r.until ? `;UNTIL=${compactDate(r.until)}` : '';
  return `RRULE:FREQ=${freq}${interval}${until}`;
}

export function toICS(events: CalendarEvent[], name = 'Oursome', now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oursome//Calendar//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const e of events) {
    if (e.taskId) continue;
    lines.push('BEGIN:VEVENT', `UID:${e.externalId ?? `${e.id}@oursome`}`, `DTSTAMP:${utcStamp(now)}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(dateKeyOf(e.start))}`);
      // The end of an all-day event is the (exclusive) next day.
      lines.push(`DTEND;VALUE=DATE:${compactDate(toDateKey(addDays(fromDateKey(dateKeyOf(e.end)), 1)))}`);
    } else {
      lines.push(`DTSTART;TZID=${e.timeZone}:${compactLocal(e.start)}`, `DTEND;TZID=${e.timeZone}:${compactLocal(e.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    if (e.recurrence) lines.push(rrule(e.recurrence));
    if (e.reminderMinutes != null) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${e.reminderMinutes}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------- Import ----------

export type ImportedEvent = {
  uid?: string;
  title: string;
  start: LocalDateTime;
  end: LocalDateTime;
  allDay: boolean;
  location?: string;
  notes?: string;
  recurrence: Recurrence | null;
  reminderMinutes: number | null;
  /** A repeat rule we can't represent exactly (it was imported as a single event). */
  simplified?: boolean;
};

const unescapeText = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

type Prop = { name: string; params: Record<string, string>; value: string };

function parseLine(line: string): Prop | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon < 0) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const [k, v = ''] = p.split('=');
    params[k.toUpperCase()] = v.replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** A DTSTART/DTEND value as local wall-clock time on this device. */
function parseWhen(p: Prop): { value: LocalDateTime; allDay: boolean } | null {
  const v = p.value.trim();
  const date = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (date || p.params.VALUE === 'DATE') {
    const m = date ?? v.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return { value: combine(`${m[1]}-${m[2]}-${m[3]}`, '00:00'), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  if (m[7]) {
    // UTC: convert to this device's local time.
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return { value: toLocalDateTime(d), allDay: false };
  }
  // Floating or TZID time: kept as the wall-clock time written in the file.
  return { value: combine(`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}`), allDay: false };
}

function parseDuration(v: string): number | null {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const minutes = (+(m[2] ?? 0) * 7 + +(m[3] ?? 0)) * 1440 + +(m[4] ?? 0) * 60 + +(m[5] ?? 0);
  return m[1] === '-' ? -minutes : minutes;
}

/** A repeat count ("5 times") becomes the date of the last occurrence. */
function untilFromCount(start: DateKey, freq: string, count: number, interval: number): DateKey | undefined {
  const n = (count - 1) * interval;
  const d = fromDateKey(start);
  if (freq === 'DAILY') return toDateKey(addDays(d, n));
  if (freq === 'WEEKLY') return toDateKey(addDays(d, n * 7));
  if (freq === 'MONTHLY') return toDateKey(new Date(d.getFullYear(), d.getMonth() + n, d.getDate()));
  if (freq === 'YEARLY') return toDateKey(new Date(d.getFullYear() + n, d.getMonth(), d.getDate()));
  return undefined;
}

function parseRule(v: string, start: DateKey): { recurrence: Recurrence | null; simplified: boolean } {
  const parts = Object.fromEntries(v.split(';').map((kv) => kv.split('=') as [string, string]));
  const m = parts.UNTIL?.match(/^(\d{4})(\d{2})(\d{2})/);
  const interval = parts.INTERVAL && +parts.INTERVAL > 1 ? +parts.INTERVAL : 1;
  const until = m ? `${m[1]}-${m[2]}-${m[3]}` : parts.COUNT ? untilFromCount(start, parts.FREQ, +parts.COUNT, interval) : undefined;
  const base = { ...(interval > 1 ? { interval } : {}), ...(until ? { until } : {}) };
  const byday = parts.BYDAY;
  switch (parts.FREQ) {
    case 'DAILY':
      return { recurrence: { freq: 'daily', ...base }, simplified: false };
    case 'WEEKLY':
      if (byday === 'MO,TU,WE,TH,FR') return { recurrence: { freq: 'weekdays', ...base }, simplified: !!parts.COUNT };
      return { recurrence: { freq: 'weekly', ...base }, simplified: !!byday && byday.includes(',') };
    case 'MONTHLY':
      return { recurrence: { freq: 'monthly', ...base }, simplified: !!byday };
    case 'YEARLY':
      return { recurrence: { freq: 'yearly', ...base }, simplified: false };
    default:
      return { recurrence: null, simplified: true };
  }
}

const shift = (v: LocalDateTime, minutes: number) => toLocalDateTime(new Date(fromLocalDateTime(v).getTime() + minutes * 60_000));

/** Read the events in a calendar file. Unknown parts are skipped, never guessed. */
export function parseICS(text: string): ImportedEvent[] {
  const lines = text
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
  const out: ImportedEvent[] = [];
  let cur: Prop[] | null = null;
  let depth = 0; // inside VALARM etc.
  let alarm: number | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') {
      cur = [];
      alarm = null;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('BEGIN:')) {
      depth++;
      continue;
    }
    if (line.startsWith('END:') && line !== 'END:VEVENT') {
      depth--;
      continue;
    }
    if (line === 'END:VEVENT') {
      const ev = build(cur, alarm);
      if (ev) out.push(ev);
      cur = null;
      continue;
    }
    const p = parseLine(line);
    if (!p) continue;
    if (depth > 0) {
      if (p.name === 'TRIGGER' && alarm == null) {
        const d = parseDuration(p.value);
        if (d != null && d <= 0) alarm = -d;
      }
      continue;
    }
    cur.push(p);
  }
  return out;
}

function build(props: Prop[], alarm: number | null): ImportedEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  const startProp = get('DTSTART');
  const start = startProp && parseWhen(startProp);
  if (!start) return null;
  if (get('STATUS')?.value === 'CANCELLED') return null;
  const endProp = get('DTEND');
  let end = endProp ? parseWhen(endProp)?.value : undefined;
  const duration = get('DURATION');
  if (!end && duration) {
    const mins = parseDuration(duration.value);
    if (mins != null) end = shift(start.value, mins);
  }
  if (start.allDay) {
    // Exclusive end date → the last day, ending at 23:59.
    const lastDay = end ? toDateKey(addDays(fromLocalDateTime(end), -1)) : dateKeyOf(start.value);
    end = combine(lastDay < dateKeyOf(start.value) ? dateKeyOf(start.value) : lastDay, '23:59');
  } else if (!end || end <= start.value) {
    end = shift(start.value, 60);
  }
  const rule = get('RRULE');
  const parsedRule = rule ? parseRule(rule.value, dateKeyOf(start.value)) : { recurrence: null, simplified: false };
  const summary = get('SUMMARY')?.value;
  return {
    uid: get('UID')?.value,
    title: summary ? unescapeText(summary).trim() || 'Untitled event' : 'Untitled event',
    start: start.value,
    end,
    allDay: start.allDay,
    location: get('LOCATION') ? unescapeText(get('LOCATION')!.value).trim() || undefined : undefined,
    notes: get('DESCRIPTION') ? unescapeText(get('DESCRIPTION')!.value).trim() || undefined : undefined,
    recurrence: parsedRule.recurrence,
    reminderMinutes: alarm,
    ...(parsedRule.simplified ? { simplified: true } : {}),
  };
}

/**
 * Add imported events to a calendar. Events already imported from the same
 * file (same UID) are updated rather than duplicated.
 */
export function mergeImported(
  events: CalendarEvent[],
  imported: ImportedEvent[],
  calendarId: string,
  timeZone: string,
  makeId: () => string,
  now = new Date(),
): { events: CalendarEvent[]; added: number; updated: number } {
  const next = [...events];
  let added = 0;
  let updated = 0;
  for (const ev of imported) {
    const data = {
      title: ev.title,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      location: ev.location,
      notes: ev.notes,
      recurrence: ev.recurrence,
      reminderMinutes: ev.reminderMinutes,
    };
    // Same UID, or (for files without UIDs) the same title at the same time.
    const i = next.findIndex(
      (e) =>
        e.calendarId === calendarId && (ev.uid ? e.externalId === ev.uid : !e.externalId && e.title === ev.title && e.start === ev.start),
    );
    if (i >= 0) {
      next[i] = { ...next[i], ...data };
      updated++;
    } else {
      next.push({ ...data, id: makeId(), calendarId, timeZone, visibility: 'private', externalId: ev.uid, createdAt: now.toISOString() });
      added++;
    }
  }
  return { events: next, added, updated };
}
