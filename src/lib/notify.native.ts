import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import type { NotifyPermission } from './notify';

export type { NotifyPermission } from './notify';

/**
 * System notifications in the iPhone/Android app: local notifications the
 * phone shows itself, so no server is involved. Reminders are scheduled
 * ahead of time (see features/reminders/phone), so they arrive with Oursome
 * closed. The browser version is notify.ts.
 */

let cached: NotifyPermission = 'default';

const toPermission = (p: Notifications.NotificationPermissionsStatus): NotifyPermission =>
  p.granted ? 'granted' : p.canAskAgain ? 'default' : 'denied';

export function notifyPermission(): NotifyPermission {
  return cached;
}

/** Read the current permission from the phone (call once at start-up). */
export async function refreshNotifyPermission(): Promise<NotifyPermission> {
  try {
    cached = toPermission(await Notifications.getPermissionsAsync());
  } catch {
    cached = 'unsupported';
  }
  return cached;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  try {
    cached = toPermission(await Notifications.requestPermissionsAsync());
  } catch {
    // Keep what we had.
  }
  return cached;
}

/** True while the app is on screen. */
export function pageVisible(): boolean {
  return AppState.currentState === 'active';
}

/** Show a notification now; resolves false if it couldn't be shown. */
export async function showSystemNotification(title: string, body: string, href: string): Promise<boolean> {
  if (cached !== 'granted') return false;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body, data: { href }, sound: true }, trigger: null });
    return true;
  } catch {
    return false;
  }
}
