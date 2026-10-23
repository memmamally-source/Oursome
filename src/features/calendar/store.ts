import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CalendarEvent, CalendarSource } from '@/features/types';
import { createId } from '@/lib/id';
import { persistStorage, STORE_VERSION } from '@/lib/storage';

export const PERSONAL_CALENDAR_ID = 'cal_personal';

export const defaultCalendars: CalendarSource[] = [
  { id: PERSONAL_CALENDAR_ID, name: 'My calendar', color: 'coral', kind: 'personal', visible: true },
];

export type EventDraft = Omit<CalendarEvent, 'id' | 'createdAt'>;

type CalendarState = {
  events: CalendarEvent[];
  calendars: CalendarSource[];
  addEvent: (draft: EventDraft) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  toggleCalendar: (id: string) => void;
  upsertCalendar: (calendar: CalendarSource) => void;
  replaceAll: (events: CalendarEvent[], calendars: CalendarSource[]) => void;
  clearDemo: () => void;
  reset: () => void;
};

export const useCalendar = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      calendars: defaultCalendars,
      addEvent: (draft) => {
        const event: CalendarEvent = { ...draft, id: createId('e_'), createdAt: new Date().toISOString() };
        set((s) => ({ events: [...s.events, event] }));
        return event;
      },
      updateEvent: (id, patch) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      toggleCalendar: (id) => set((s) => ({ calendars: s.calendars.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)) })),
      upsertCalendar: (calendar) =>
        set((s) => ({
          calendars: s.calendars.some((c) => c.id === calendar.id)
            ? s.calendars.map((c) => (c.id === calendar.id ? calendar : c))
            : [...s.calendars, calendar],
        })),
      replaceAll: (events, calendars) => set({ events, calendars }),
      clearDemo: () =>
        set((s) => ({
          events: s.events.filter((e) => !e.isDemo),
          calendars: s.calendars.filter((c) => c.kind === 'personal' || s.events.some((e) => !e.isDemo && e.calendarId === c.id)),
        })),
      reset: () => set({ events: [], calendars: defaultCalendars }),
    }),
    { name: 'oursome.calendar', version: STORE_VERSION, storage: persistStorage },
  ),
);

/** Events whose calendar is currently toggled visible. */
export function visibleEvents(events: CalendarEvent[], calendars: CalendarSource[]): CalendarEvent[] {
  const visible = new Set(calendars.filter((c) => c.visible).map((c) => c.id));
  return events.filter((e) => visible.has(e.calendarId));
}
