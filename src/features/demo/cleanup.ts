import { useCalendar } from '@/features/calendar/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import type { CalendarEvent, CalendarSource, ShoppingItem, ShoppingList, Space, Task } from '@/features/types';

/**
 * Sample content (from before PR #4) is retired. Older accounts may still
 * hold it, so it's removed once, automatically. Only sample records go
 * (flagged `isDemo` or with a `demo_` id); anything the person added stays,
 * even inside the sample household or a sample shopping list.
 */
export type SampleState = {
  tasks: Task[];
  events: CalendarEvent[];
  calendars: CalendarSource[];
  lists: ShoppingList[];
  items: ShoppingItem[];
  spaces: Space[];
};

const sample = (x: { id: string; isDemo?: boolean }) => !!x.isDemo || x.id.startsWith('demo_');

export function hasSampleContent(s: SampleState): boolean {
  return (
    s.tasks.some(sample) ||
    s.events.some(sample) ||
    s.lists.some(sample) ||
    s.items.some(sample) ||
    s.calendars.some((c) => c.id.startsWith('demo_')) ||
    s.spaces.some((sp) => sample(sp) || sp.members.some((m) => m.id.startsWith('demo_')))
  );
}

export function withoutSampleContent(s: SampleState): SampleState {
  const events = s.events.filter((e) => !sample(e));
  const items = s.items.filter((i) => !sample(i));
  // A sample list the person added their own items to stays, as theirs.
  const lists = s.lists.filter((l) => !sample(l) || items.some((i) => i.listId === l.id)).map((l) => (l.isDemo ? { ...l, isDemo: undefined } : l));
  const listIds = new Set(lists.map((l) => l.id));
  // Sample calendars go unless the person's own events use them.
  const calendars = s.calendars.filter((c) => !c.id.startsWith('demo_') || events.some((e) => e.calendarId === c.id));
  const tasks = s.tasks.filter((t) => !sample(t));

  const spaces = s.spaces
    .map((sp) => {
      const members = sp.members.filter((m) => !m.id.startsWith('demo_'));
      const announcements = sp.announcements.filter((a) => !a.id.startsWith('demo_'));
      return { ...sp, members, announcements, isDemo: undefined };
    })
    .filter((sp, i) => {
      if (!sample(s.spaces[i])) return true;
      // The sample household stays only if the person made it their own: someone added,
      // a note posted, or shared items in it.
      const used =
        sp.members.some((m) => !m.isMe) ||
        sp.announcements.length > 0 ||
        tasks.some((t) => t.spaceId === sp.id) ||
        events.some((e) => e.spaceId === sp.id) ||
        lists.some((l) => l.spaceId === sp.id);
      return used;
    });

  return { tasks, events, calendars, lists, items: items.filter((i) => listIds.has(i.listId)), spaces };
}

/** Run at launch: removes leftover sample content from this device (does nothing once it's gone). */
export function removeSampleContent(): boolean {
  const state: SampleState = {
    tasks: useTasks.getState().tasks,
    events: useCalendar.getState().events,
    calendars: useCalendar.getState().calendars,
    lists: useShopping.getState().lists,
    items: useShopping.getState().items,
    spaces: useSpace.getState().spaces,
  };
  if (!hasSampleContent(state)) return false;
  const next = withoutSampleContent(state);
  useTasks.setState({ tasks: next.tasks });
  useCalendar.setState({ events: next.events, calendars: next.calendars });
  useShopping.setState({ lists: next.lists, items: next.items });
  useSpace.getState().setSpaces(next.spaces);
  return true;
}
