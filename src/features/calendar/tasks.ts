import { ME_ID } from '@/features/space/store';
import type { EventOccurrence, Task } from '@/features/types';
import { combine, minutesOfDay, timeFromMinutes, type DateKey } from '@/lib/dates';

/** The pseudo-calendar dated tasks appear under (shown in mint; toggled from the calendar filters). */
export const TASKS_CALENDAR_ID = 'cal_tasks';

/**
 * Open tasks with a due date, as read-only calendar entries: a timed task
 * is a 30-minute block, otherwise it sits in the all-day row. Tapping one
 * opens the task (see openOccurrence). Nothing here is saved as an event.
 */
export function taskOccurrences(tasks: Task[], from: DateKey, to: DateKey): EventOccurrence[] {
  return tasks
    .filter((t) => !t.completedAt && t.due && t.due >= from && t.due <= to)
    .map((t) => {
      const start = t.dueTime ?? '00:00';
      const end = t.dueTime ? timeFromMinutes(Math.min(minutesOfDay(t.dueTime) + 30, 23 * 60 + 59)) : '23:59';
      const event = {
        id: `task:${t.id}`,
        taskId: t.id,
        title: t.title,
        start: combine(t.due!, start),
        end: combine(t.due!, end),
        allDay: !t.dueTime,
        timeZone: 'local',
        calendarId: TASKS_CALENDAR_ID,
        visibility: t.visibility,
        // Whose plate it's on: the assignee, or the user for their own unassigned tasks.
        personId: t.assigneeId ?? (t.assigneeName ? undefined : ME_ID),
        createdAt: t.createdAt,
      };
      return { key: event.id, event, date: t.due!, start: event.start, end: event.end };
    });
}
