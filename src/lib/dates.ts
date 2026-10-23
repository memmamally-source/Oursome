import { addDays } from 'date-fns/addDays';
import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { parse } from 'date-fns/parse';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfWeek } from 'date-fns/startOfWeek';

/**
 * Date conventions (Stage 1, local-first):
 *  - DateKey:  'yyyy-MM-dd' calendar date in the user's time zone.
 *  - TimeKey:  'HH:mm' 24-hour wall-clock time.
 *  - LocalDateTime: "yyyy-MM-dd'T'HH:mm" wall-clock time in the item's `timeZone`.
 * Wall-clock storage keeps events stable across DST changes; conversion
 * between zones arrives with sync in Stage 2.
 */
export type DateKey = string;
export type TimeKey = string;
export type LocalDateTime = string;

export const WEEK_STARTS_ON = 1 as const; // Monday; configurable later per locale

export function toDateKey(d: Date): DateKey {
  return format(d, 'yyyy-MM-dd');
}

export function fromDateKey(key: DateKey): Date {
  return parse(key, 'yyyy-MM-dd', new Date());
}

export function toLocalDateTime(d: Date): LocalDateTime {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalDateTime(value: LocalDateTime): Date {
  return parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
}

export function combine(date: DateKey, time: TimeKey): LocalDateTime {
  return `${date}T${time}`;
}

export function dateKeyOf(value: LocalDateTime): DateKey {
  return value.slice(0, 10);
}

export function timeKeyOf(value: LocalDateTime): TimeKey {
  return value.slice(11, 16);
}

export function minutesOfDay(time: TimeKey): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeFromMinutes(total: number): TimeKey {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function todayKey(now = new Date()): DateKey {
  return toDateKey(now);
}

/** "9:30 AM" style label. */
export function formatTime(time: TimeKey): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Friendly relative day label: Today, Tomorrow, Yesterday, Fri 25 Oct. */
export function relativeDayLabel(key: DateKey, now = new Date()): string {
  const diff = differenceInCalendarDays(fromDateKey(key), startOfDay(now));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return format(fromDateKey(key), 'EEEE');
  return format(fromDateKey(key), 'EEE d MMM');
}

export function greetingFor(now = new Date()): { text: string; emoji: string } {
  const h = now.getHours();
  if (h < 5) return { text: 'Good evening', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 18) return { text: 'Good afternoon', emoji: '🌤️' };
  return { text: 'Good evening', emoji: '🌙' };
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 6×7 grid of dates covering the month containing `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export { addDays, format, isSameDay };
