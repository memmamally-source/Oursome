import { useEffect, useState } from 'react';

import { useActivity } from '@/features/activity/store';
import { useAlbums } from '@/features/albums/store';
import { useCalendar } from '@/features/calendar/store';
import { useCloud } from '@/features/cloud/state';
import { useMemories } from '@/features/memories/store';
import { useReminders } from '@/features/reminders/engine';
import { useSession } from '@/features/session/store';
import { useSettings } from '@/features/settings/store';
import { useShopping } from '@/features/shopping/store';
import { useSpace } from '@/features/space/store';
import { useTasks } from '@/features/tasks/store';

const stores = [useSession, useSettings, useTasks, useCalendar, useShopping, useSpace, useActivity, useMemories, useReminders, useCloud, useAlbums];

/** True once every persisted store has loaded from device storage. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ready) return;
    const check = () => setReady(stores.every((s) => s.persist.hasHydrated()));
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}
