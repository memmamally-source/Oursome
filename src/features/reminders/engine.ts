import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { toast } from '@/components/ui/Toast';
import { useCalendar } from '@/features/calendar/store';
import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useTasks } from '@/features/tasks/store';
import { notifyPermission, pageVisible, refreshNotifyPermission, requestNotifyPermission, showSystemNotification } from '@/lib/notify';
import { persistStorage } from '@/lib/storage';

import { coalesce, inQuietHours, phoneSchedule, remindersDue, type Reminder } from './logic';
import { schedulesOnPhone, setUpPhoneNotifications, syncPhoneReminders } from './phone';

export type Delivered = { id: string; title: string; body: string; href: string; at: string; via: 'system' | 'in-app' };

type RemindersState = {
  /** Ids already delivered, so nothing arrives twice. */
  delivered: string[];
  history: Delivered[];
  lastCheck: string | null;
  markDelivered: (ids: string[], checkedAt: string) => void;
  addHistory: (entries: Delivered[]) => void;
  setLastCheck: (at: string) => void;
  clearHistory: () => void;
};

export const useReminders = create<RemindersState>()(
  persist(
    (set) => ({
      delivered: [],
      history: [],
      lastCheck: null,
      markDelivered: (ids, checkedAt) => set((s) => ({ delivered: [...s.delivered, ...ids].slice(-400), lastCheck: checkedAt })),
      addHistory: (entries) => set((s) => ({ history: [...entries, ...s.history].slice(0, 30) })),
      setLastCheck: (lastCheck) => set({ lastCheck }),
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'oursome.reminders', version: 1, storage: persistStorage },
  ),
);

/** How far back to look after a gap (covers the longest quiet hours). */
const MAX_LOOKBACK_MS = 12 * 60 * 60_000;
const CHECK_EVERY_MS = 30_000;

async function show(title: string, body: string, href: string, tag: string): Promise<'system' | 'in-app'> {
  // The phone already shows it: it was scheduled ahead (see syncReminders).
  if (schedulesOnPhone && notifyPermission() === 'granted') return 'system';
  if (!pageVisible() && (await showSystemNotification(title, body, href, tag))) return 'system';
  toast({
    message: `${title} · ${body}`,
    tone: 'info',
    duration: 8000,
    action: { label: 'Open', onPress: () => router.push(href as Href) },
  });
  return 'in-app';
}

/** Look for reminders due since the last check and deliver the new ones. */
export async function checkReminders(now = new Date()): Promise<Reminder[]> {
  const state = useReminders.getState();
  const prefs = useSettings.getState().notifications;
  // During quiet hours nothing is delivered; the next check after they end picks it all up.
  if (inQuietHours(now, prefs.quietHours)) return [];
  const last = state.lastCheck ? new Date(state.lastCheck) : now;
  const from = new Date(Math.max(last.getTime(), now.getTime() - MAX_LOOKBACK_MS));
  const seen = new Set(state.delivered);
  const due = remindersDue({ tasks: useTasks.getState().tasks, events: useCalendar.getState().events, prefs, from, to: now }).filter(
    (r) => !seen.has(r.id),
  );
  if (!due.length) {
    state.setLastCheck(now.toISOString());
    return [];
  }
  // Mark first, so a slow notification can't lead to a second delivery.
  state.markDelivered(
    due.map((r) => r.id),
    now.toISOString(),
  );
  const { single, summary } = coalesce(due);
  const shown = summary ? [{ id: `sum:${now.toISOString()}`, title: summary.title, body: summary.body, href: '/' }] : single;
  const entries: Delivered[] = [];
  for (const r of shown) {
    const via = await show(r.title, r.body, r.href, r.id);
    entries.push({ id: r.id, title: r.title, body: r.body, href: r.href, at: now.toISOString(), via });
  }
  useReminders.getState().addHistory(entries);
  return due;
}

let askedThisLaunch = false;

/** Phone app: hand the next two weeks of reminders to the phone, asking for permission the first time one exists. */
export async function syncReminders(now = new Date()): Promise<void> {
  if (!schedulesOnPhone) return;
  const list = phoneSchedule({
    tasks: useTasks.getState().tasks,
    events: useCalendar.getState().events,
    prefs: useSettings.getState().notifications,
    now,
  });
  let permission = await refreshNotifyPermission();
  if (permission === 'default' && list.length && !askedThisLaunch) {
    askedThisLaunch = true;
    permission = await requestNotifyPermission();
  }
  if (permission === 'granted') await syncPhoneReminders(list);
}

/** Mounted once at the root: checks every 30 seconds and whenever Oursome comes back into view. */
export function ReminderEngine() {
  const signedIn = useSession((s) => s.signedIn);
  useEffect(() => {
    if (!signedIn || !schedulesOnPhone) return;
    const stop = setUpPhoneNotifications();
    // Reschedule shortly after tasks, events or reminder settings change.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void syncReminders().catch(() => {}), 1500);
    };
    soon();
    const unsubs = [useTasks.subscribe(soon), useCalendar.subscribe(soon), useSettings.subscribe(soon)];
    const sub = AppState.addEventListener('change', (s) => s === 'active' && soon());
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
      sub.remove();
      stop();
    };
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn) return;
    const tick = () => void checkReminders().catch(() => {});
    tick();
    const timer = setInterval(tick, CHECK_EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    const onVisible = () => document.visibilityState === 'visible' && tick();
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn]);
  return null;
}
