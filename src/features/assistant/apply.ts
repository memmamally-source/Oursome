import { occurrencesOnDay, expandOccurrences } from '@/features/calendar/recurrence';
import { PERSONAL_CALENDAR_ID, useCalendar, visibleEvents } from '@/features/calendar/store';
import { useShopping } from '@/features/shopping/store';
import { ME_ID } from '@/features/space/store';
import { compareTasks, pickPriorities } from '@/features/tasks/logic';
import { useTasks } from '@/features/tasks/store';
import { addDays, combine, deviceTimeZone, formatTime, relativeDayLabel, timeKeyOf, toDateKey } from '@/lib/dates';

import type { Proposal, QueryKind } from './parser';

/** Persist an approved proposal. Returns a short confirmation line. */
export function applyProposal(p: Proposal): string {
  const shared = !!p.assigneeId && p.assigneeId !== ME_ID;
  switch (p.kind) {
    case 'task':
    case 'reminder': {
      useTasks.getState().addTask({
        title: p.title,
        categoryId: p.categoryId ?? 'personal',
        priority: 'medium',
        due: p.date,
        dueTime: p.time,
        isReminder: p.kind === 'reminder',
        reminderMinutes: p.kind === 'reminder' ? 0 : null,
        assigneeId: p.assigneeId,
        visibility: shared ? 'shared' : 'private',
      });
      return p.kind === 'reminder' ? 'Reminder added' : 'Task added';
    }
    case 'event': {
      const date = p.date ?? toDateKey(new Date());
      useCalendar.getState().addEvent({
        title: p.title,
        start: combine(date, p.allDay ? '00:00' : (p.time ?? '09:00')),
        end: combine(date, p.allDay ? '23:59' : (p.endTime ?? p.time ?? '10:00')),
        allDay: !!p.allDay,
        timeZone: deviceTimeZone(),
        calendarId: PERSONAL_CALENDAR_ID,
        location: p.location,
        visibility: 'private',
        reminderMinutes: 30,
      });
      return 'Added to your calendar';
    }
    case 'shopping': {
      const shop = useShopping.getState();
      const wanted = p.listName?.toLowerCase();
      let list =
        (wanted && shop.lists.find((l) => l.name.toLowerCase() === wanted)) ||
        shop.lists.find((l) => /grocer|shopping/i.test(l.name)) ||
        shop.lists[0];
      if (!list) {
        list = shop.addList({ name: p.listName ?? 'Groceries', color: 'mint', icon: 'basket-outline', visibility: 'private' });
      }
      for (const item of p.items ?? []) useShopping.getState().addItem(list.id, item, ME_ID);
      return `Added to ${list.name}`;
    }
  }
}

/** Plain-language answers computed from the user's real data. */
export function answerQuery(query: QueryKind, now = new Date()): string {
  const { events, calendars } = useCalendar.getState();
  const tasks = useTasks.getState().tasks;
  const shown = visibleEvents(events, calendars);
  const today = toDateKey(now);
  const tomorrow = toDateKey(addDays(now, 1));

  const describeDay = (date: string) => {
    const occ = occurrencesOnDay(shown, date);
    const due = tasks.filter((t) => !t.completedAt && t.due === date).sort(compareTasks);
    const label = relativeDayLabel(date, now).toLowerCase();
    if (!occ.length && !due.length) return `Nothing planned for ${label} — enjoy the breathing room.`;
    const lines: string[] = [];
    if (occ.length) {
      lines.push(`${occ.length === 1 ? 'One event' : `${occ.length} events`} ${label}:`);
      for (const o of occ) lines.push(`• ${o.event.allDay ? 'All day' : formatTime(timeKeyOf(o.start))} — ${o.event.title}`);
    }
    if (due.length) {
      lines.push(`${due.length === 1 ? 'One task' : `${due.length} tasks`} due:`);
      for (const t of due.slice(0, 6)) lines.push(`• ${t.title}`);
    }
    return lines.join('\n');
  };

  switch (query) {
    case 'today':
      return describeDay(today);
    case 'tomorrow':
      return describeDay(tomorrow);
    case 'week': {
      const end = toDateKey(addDays(now, 6));
      const occ = expandOccurrences(shown, today, end);
      const due = tasks.filter((t) => !t.completedAt && t.due && t.due >= today && t.due <= end);
      const busiest = Object.entries(
        occ.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.date]: (acc[o.date] ?? 0) + 1 }), {}),
      ).sort((a, b) => b[1] - a[1])[0];
      const lines = [`The next 7 days: ${occ.length} events and ${due.length} tasks.`];
      if (busiest) lines.push(`Busiest day: ${relativeDayLabel(busiest[0], now)} (${busiest[1]} events).`);
      const important = occ.filter((o) => o.event.isImportantDate);
      if (important.length)
        lines.push(`Don’t forget: ${important.map((o) => `${o.event.title} (${relativeDayLabel(o.date, now)})`).join(', ')}.`);
      return lines.join('\n');
    }
    case 'plan-today':
    case 'plan-tomorrow': {
      const date = query === 'plan-today' ? today : tomorrow;
      const occ = occurrencesOnDay(shown, date).filter((o) => !o.event.allDay);
      const top = pickPriorities(tasks, date, 3);
      const lines: string[] = [];
      lines.push(query === 'plan-today' ? 'Here’s a simple plan for today:' : 'Here’s a simple plan for tomorrow:');
      if (top.length) {
        lines.push('Focus on:');
        top.forEach((t, i) => lines.push(`${i + 1}. ${t.title}`));
      } else lines.push('No urgent tasks — a good day to tackle something from “Anytime”.');
      if (occ.length) {
        const first = occ[0];
        const last = occ[occ.length - 1];
        lines.push(
          `Your first commitment is ${first.event.title} at ${formatTime(timeKeyOf(first.start))}; you’re free after ${formatTime(timeKeyOf(last.end))}.`,
        );
      }
      lines.push('Smarter scheduling arrives with the full AI assistant.');
      return lines.join('\n');
    }
    case 'reschedule':
      return 'Moving flexible tasks automatically is coming with the full AI assistant. For now, open Tasks and use “Move to tomorrow” on anything that can wait.';
  }
}
