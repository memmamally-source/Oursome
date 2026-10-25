import type { Reminder } from './logic';

/**
 * Scheduling reminders with the phone (phone.native.ts). In the browser
 * there's nothing to schedule: reminders come from the engine while open.
 */
export const schedulesOnPhone = false;

export function setUpPhoneNotifications(): () => void {
  return () => {};
}

export async function syncPhoneReminders(_reminders: Reminder[]): Promise<void> {}
