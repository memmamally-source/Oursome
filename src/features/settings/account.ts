import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';

import { useActivity } from '@/features/activity/store';
import { deleteAllPhotoFiles } from '@/features/albums/storage';
import { useAlbums } from '@/features/albums/store';
import { useCalendar } from '@/features/calendar/store';
import { useMemories } from '@/features/memories/store';
import { useReminders } from '@/features/reminders/engine';
import { useSession } from '@/features/session/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';
import { deleteAllPhotos } from '@/lib/photoStore';

import { useSettings } from './store';

/** Everything Oursome stores about the user, as portable JSON. */
export function buildExport() {
  const { profile } = useSession.getState();
  const { tasks, categories } = useTasks.getState();
  const { events, calendars } = useCalendar.getState();
  const { lists, items, favourites } = useShopping.getState();
  const { space } = useSpace.getState();
  const { theme, dashboard, notifications } = useSettings.getState();
  return {
    exportedAt: new Date().toISOString(),
    format: 'oursome-export@1',
    profile,
    settings: { theme, dashboard, notifications },
    tasks,
    categories,
    events,
    calendars,
    shoppingLists: lists,
    shoppingItems: items,
    favourites,
    space,
  };
}

export async function exportData(): Promise<void> {
  const json = JSON.stringify(buildExport(), null, 2);
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oursome-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: json, title: 'Oursome data export' });
}

/**
 * Stage 1: erases all local data on this device, photos included. Stage 2 will also delete
 * the Firebase account and server data via a Cloud Function.
 */
export async function deleteAllLocalData(): Promise<void> {
  useTasks.getState().reset();
  useCalendar.getState().reset();
  useShopping.getState().reset();
  useSpace.getState().replace(null);
  useSettings.getState().reset();
  useAlbums.setState({ albums: [], photos: [] });
  useMemories.setState({ memories: [] });
  useActivity.getState().clear();
  useReminders.setState({ delivered: [], history: [], lastCheck: null });
  await Promise.all([deleteAllPhotoFiles(), deleteAllPhotos()]).catch(() => {});
  useSession.setState({ profile: null, signedIn: false });
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('oursome.'));
  // Stores re-persist their reset state; clearing keys removes any stale extras.
  await AsyncStorage.multiRemove(keys);
}
