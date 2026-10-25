import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * System notifications in the browser (and the installed web app). They
 * appear while Oursome is open in a tab or running as an installed app;
 * delivery with everything closed needs a push server, which isn't set up.
 * Phones running the native app use in-app reminders for now.
 */

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied';

const supported = () => Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;

export function notifyPermission(): NotifyPermission {
  return supported() ? (Notification.permission as NotifyPermission) : 'unsupported';
}

/** Ask once, only after the person taps a button. */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!supported()) return 'unsupported';
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    return notifyPermission();
  }
}

/** True when the page is in front of the person (in-app reminders are enough). */
export function pageVisible(): boolean {
  return Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState === 'visible';
}

const base = ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '').replace(/\/$/, '');

/** Show a system notification; resolves false if it couldn't be shown. */
export async function showSystemNotification(title: string, body: string, href: string, tag?: string): Promise<boolean> {
  if (notifyPermission() !== 'granted') return false;
  const options = { body, tag, icon: `${base}/icons/icon-192.png`, badge: `${base}/icons/icon-192.png`, data: { href: `${base}${href}` } };
  try {
    // Android browsers only allow notifications through the service worker.
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.assign(`${base}${href}`);
    };
    return true;
  } catch {
    return false;
  }
}
