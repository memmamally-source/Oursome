import { useMemo } from 'react';

import { expandOccurrences, occurrencesOnDay } from '@/features/calendar/recurrence';
import { useCalendar, visibleEvents } from '@/features/calendar/store';
import { useSettings } from '@/features/settings/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { pickPriorities } from '@/features/tasks/logic';
import { useTasks } from '@/features/tasks/store';
import { addDays, format, timeKeyOf, toDateKey } from '@/lib/dates';

import { buildSuggestions } from './suggestions';

export function useDashboard(now: Date) {
  const today = toDateKey(now);
  const tomorrow = toDateKey(addDays(now, 1));
  const events = useCalendar((s) => s.events);
  const calendars = useCalendar((s) => s.calendars);
  const tasks = useTasks((s) => s.tasks);
  const space = useSpace((s) => s.space);
  const lists = useShopping((s) => s.lists);
  const items = useShopping((s) => s.items);
  const dismissed = useSettings((s) => s.dismissedSuggestions);

  return useMemo(() => {
    const shown = visibleEvents(events, calendars);
    const todayOcc = occurrencesOnDay(shown, today);
    const tomorrowOcc = occurrencesOnDay(shown, tomorrow);
    const upcomingImportant = expandOccurrences(
      events.filter((e) => e.isImportantDate),
      today,
      toDateKey(addDays(now, 30)),
    ).filter((o) => o.date >= today);

    const nowTime = format(now, 'HH:mm');
    const timed = todayOcc.filter((o) => !o.event.allDay);
    const next = timed.find((o) => timeKeyOf(o.end) > nowTime);

    const open = tasks.filter((t) => !t.completedAt);
    const dueToday = open.filter((t) => !t.isReminder && t.due && t.due <= today);
    const reminders = open.filter((t) => t.isReminder && t.due === today);
    const sharedOpen = open.filter((t) => t.visibility === 'shared');
    const sharedEventsToday = todayOcc.filter((o) => o.event.visibility === 'shared');
    const priorities = pickPriorities(tasks, today);
    const completedToday = tasks.filter((t) => t.completedAt && toDateKey(new Date(t.completedAt)) === today && !t.isReminder);

    const suggestions = buildSuggestions({
      now,
      today,
      todayOccurrences: todayOcc,
      tomorrowOccurrences: tomorrowOcc,
      upcomingImportant,
      tasks,
    }).filter((s) => !dismissed.includes(s.id));

    const listSummaries = lists.map((l) => ({
      list: l,
      remaining: items.filter((i) => i.listId === l.id && !i.purchased).length,
      preview: items
        .filter((i) => i.listId === l.id && !i.purchased)
        .slice(0, 4)
        .map((i) => i.name),
    }));

    return {
      today,
      todayOcc,
      tomorrowOcc,
      timed,
      allDay: todayOcc.filter((o) => o.event.allDay),
      next,
      nowTime,
      dueToday,
      reminders,
      sharedOpen,
      sharedEventsToday,
      /** Shared events today plus open shared tasks due by today. */
      sharedToday:
        sharedEventsToday.length +
        dueToday.filter((t) => t.visibility === 'shared').length +
        reminders.filter((t) => t.visibility === 'shared').length,
      priorities,
      completedToday,
      suggestion: suggestions[0],
      upcomingImportant,
      space,
      listSummaries,
      isEmpty: events.length === 0 && tasks.length === 0,
    };
  }, [events, calendars, tasks, space, lists, items, dismissed, today, tomorrow, now]);
}
