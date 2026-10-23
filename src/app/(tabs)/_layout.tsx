import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/navigation/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="assistant" />
      <Tabs.Screen name="space" />
    </Tabs>
  );
}
