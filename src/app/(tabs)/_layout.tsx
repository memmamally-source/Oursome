import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { TabBar } from '@/components/navigation/TabBar';
import { useLayout } from '@/hooks/useLayout';

/**
 * Web loads each screen's code on demand. Once the first screen is up and the
 * browser is idle, fetch the other tabs' code so switching is instant.
 */
function usePrefetchTabs() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const load = () => {
      import('./calendar');
      import('./tasks');
      import('../assistant');
      import('./space');
    };
    const w = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 3000 });
    else setTimeout(load, 1500);
  }, []);
}

export default function TabsLayout() {
  usePrefetchTabs();
  const { isWide } = useLayout();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, tabBarPosition: isWide ? 'left' : 'bottom' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="space" />
    </Tabs>
  );
}
