import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import type { Reminder } from './logic';

/**
 * Hands upcoming reminders to the phone as local notifications, so they
 * arrive at the right time even with Oursome closed. Rescheduled whenever
 * tasks, events or reminder settings change (see ReminderEngine).
 */
export const schedulesOnPhone = true;

/** Android shows notifications through a channel people can tune in Settings. */
const CHANNEL = 'reminders';

const open = (response: Notifications.NotificationResponse | null) => {
  const href = response?.notification.request.content.data?.href;
  if (typeof href === 'string' && href.startsWith('/')) router.push(href as Href);
};

/** Show reminders while the app is open too, and open the right page when one is tapped. */
export function setUpPhoneNotifications(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      description: 'Appointments, tasks and briefings you asked to be reminded about',
      importance: AndroidImportance.HIGH,
    }).catch(() => {});
  }
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  // Opened by tapping a reminder while the app was closed.
  void Notifications.getLastNotificationResponseAsync()
    .then(open)
    .catch(() => {});
  return () => sub.remove();
}

let last = '';

export async function syncPhoneReminders(reminders: Reminder[]): Promise<void> {
  const key = reminders.map((r) => `${r.id}@${r.at.getTime()}`).join('|');
  if (key === last) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { href: r.href }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
  last = key;
}
