import { create } from 'zustand';

import type { DateKey } from '@/lib/dates';

/**
 * The day picked on the Calendar tab while it's on screen, so the big +
 * button adds things on that day rather than today. Not saved.
 */
export const useCalendarFocus = create<{ date: DateKey | null; setDate: (date: DateKey | null) => void }>()((set) => ({
  date: null,
  setDate: (date) => set({ date }),
}));
