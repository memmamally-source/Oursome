import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORE_VERSION } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export const dashboardSectionKeys = ['overview', 'capture', 'schedule', 'priorities', 'suggestion', 'space', 'shopping', 'dates'] as const;
export type DashboardSection = (typeof dashboardSectionKeys)[number];

export const dashboardSectionLabels: Record<DashboardSection, string> = {
  overview: 'Today’s overview',
  capture: 'Quick capture',
  schedule: 'Today’s schedule',
  priorities: 'My priorities',
  suggestion: 'Smart suggestions',
  space: 'Our Space preview',
  shopping: 'Shopping lists',
  dates: 'Important dates',
};

export type NotificationPrefs = {
  appointments: boolean;
  deadlines: boolean;
  assignments: boolean;
  household: boolean;
  routines: boolean;
  morningBriefing: boolean;
  eveningBriefing: boolean;
  quietHours: { enabled: boolean; from: string; to: string };
};

type SettingsState = {
  theme: ThemePreference;
  hasOnboarded: boolean;
  dashboard: Record<DashboardSection, boolean>;
  notifications: NotificationPrefs;
  dismissedSuggestions: string[];
  taskSortMode: 'smart' | 'manual';
  /** Show dated tasks on the calendar. */
  tasksOnCalendar: boolean;
  /** Motion: follow the device setting, or always reduce. */
  motion: 'system' | 'reduced';
  /** Optional celebrations: the orb's bounces and occasion decorations. */
  celebrations: boolean;
  setMotion: (motion: 'system' | 'reduced') => void;
  setCelebrations: (on: boolean) => void;
  /** A look back at the week on Home, on Sundays and Mondays. */
  weeklySummary: boolean;
  setWeeklySummary: (on: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  completeOnboarding: () => void;
  toggleSection: (section: DashboardSection) => void;
  setNotifications: (patch: Partial<NotificationPrefs>) => void;
  dismissSuggestion: (id: string) => void;
  setTaskSortMode: (mode: 'smart' | 'manual') => void;
  setTasksOnCalendar: (on: boolean) => void;
  reset: () => void;
};

const defaults = {
  theme: 'system' as ThemePreference,
  hasOnboarded: false,
  dashboard: Object.fromEntries(dashboardSectionKeys.map((k) => [k, true])) as Record<DashboardSection, boolean>,
  notifications: {
    appointments: true,
    deadlines: true,
    assignments: true,
    household: true,
    routines: true,
    morningBriefing: false,
    eveningBriefing: false,
    quietHours: { enabled: true, from: '21:30', to: '07:00' },
  },
  dismissedSuggestions: [] as string[],
  taskSortMode: 'smart' as const,
  tasksOnCalendar: true,
  motion: 'system' as 'system' | 'reduced',
  celebrations: true,
  weeklySummary: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      toggleSection: (section) => set((s) => ({ dashboard: { ...s.dashboard, [section]: !s.dashboard[section] } })),
      setNotifications: (patch) => set((s) => ({ notifications: { ...s.notifications, ...patch } })),
      dismissSuggestion: (id) => set((s) => ({ dismissedSuggestions: [...s.dismissedSuggestions.slice(-50), id] })),
      setTaskSortMode: (taskSortMode) => set({ taskSortMode }),
      setMotion: (motion) => set({ motion }),
      setCelebrations: (celebrations) => set({ celebrations }),
      setWeeklySummary: (weeklySummary) => set({ weeklySummary }),
      setTasksOnCalendar: (tasksOnCalendar) => set({ tasksOnCalendar }),
      reset: () => set({ ...defaults }),
    }),
    { name: 'oursome.settings', version: STORE_VERSION, storage: persistStorage },
  ),
);
