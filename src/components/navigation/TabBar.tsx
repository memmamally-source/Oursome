import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import type { IconName } from '@/features/types';
import { SIDEBAR_WIDTH, useLayout } from '@/hooks/useLayout';
import { haptic } from '@/lib/haptics';
import { elevation, fonts, layout, radius, space, useTheme, type AccentKey } from '@/theme';

import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

type TabMeta = { label: string; icon: IconName; activeIcon: IconName; accent: AccentKey };

export const tabMeta: Record<string, TabMeta> = {
  index: { label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny', accent: 'coral' },
  calendar: { label: 'Calendar', icon: 'calendar-clear-outline', activeIcon: 'calendar-clear', accent: 'sky' },
  tasks: { label: 'Tasks', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', accent: 'mint' },
  space: { label: 'Our Space', icon: 'people-outline', activeIcon: 'people', accent: 'sunshine' },
};

const openComposer = () => {
  haptic.impact();
  router.push('/quick-add');
};

function TabItem({ name, focused, onPress, wide }: { name: string; focused: boolean; onPress: () => void; wide?: boolean }) {
  const { palette } = useTheme();
  const meta = tabMeta[name];
  if (!meta) return null;
  const tone = palette.accents[meta.accent];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      style={({ pressed }) => [wide ? styles.sideItem : styles.item, wide && focused && { backgroundColor: tone.soft }, pressed && { opacity: 0.7 }]}>
      <View style={wide ? undefined : [styles.iconWrap, focused && { backgroundColor: tone.soft }]}>
        <Icon name={focused ? meta.activeIcon : meta.icon} size={wide ? 21 : 23} color={focused ? tone.ink : palette.textSecondary} />
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={{
          fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
          fontSize: wide ? 16 : 11,
          lineHeight: wide ? 22 : 14,
          color: focused ? palette.text : palette.textSecondary,
        }}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

/** Phones: a floating bottom bar with the organiser button in the middle. Wide screens: a sidebar. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { palette } = useTheme();
  const { isWide } = useLayout();
  const routes = state.routes.filter((r) => tabMeta[r.name]);
  const go = (key: string) => {
    haptic.tap();
    navigateToTab(key);
  };

  if (isWide) {
    return (
      <View style={[styles.sidebar, { borderRightColor: palette.border, backgroundColor: palette.surface, paddingTop: insets.top + space.xxl }]}>
        <View style={{ paddingHorizontal: space.md, marginBottom: space.xxl }}>
          <Wordmark size={24} />
        </View>
        <Pressable
          onPress={openComposer}
          accessibilityRole="button"
          accessibilityLabel="Add or ask"
          style={({ pressed }) => [styles.sideCompose, { backgroundColor: palette.accents.coral.base, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="sparkles" size={18} color={palette.onAccent} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: palette.onAccent }}>Add or ask</Text>
        </Pressable>
        <View style={{ gap: 4, marginTop: space.xl }}>
          {routes.map((route) => (
            <TabItem key={route.key} wide name={route.name} focused={state.routes[state.index]?.key === route.key} onPress={() => go(route.key)} />
          ))}
        </View>
      </View>
    );
  }

  const mid = Math.ceil(routes.length / 2);
  const bottom = Math.max(insets.bottom, 10);
  const item = (route: (typeof routes)[number]) => (
    <TabItem key={route.key} name={route.name} focused={state.routes[state.index]?.key === route.key} onPress={() => go(route.key)} />
  );
  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
      <View style={[styles.bar, { backgroundColor: palette.surface, borderColor: palette.border }, elevation(palette, 3)]}>
        {routes.slice(0, mid).map(item)}
        <View style={styles.centerSlot}>
          <Pressable
            onPress={openComposer}
            accessibilityRole="button"
            accessibilityLabel="Add or ask"
            accessibilityHint="Opens the organiser to add a task, event, reminder or list item"
            style={({ pressed }) => [
              styles.center,
              { backgroundColor: palette.accents.coral.base, transform: [{ scale: pressed ? 0.94 : 1 }] },
              elevation(palette, 2),
            ]}>
            <Icon name="add" size={30} color={palette.onAccent} />
          </Pressable>
        </View>
        {routes.slice(mid).map(item)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: layout.tabBarMargin, right: layout.tabBarMargin, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.tabBarHeight,
    borderRadius: radius.xxl,
    paddingHorizontal: space.xs,
    width: '100%',
    maxWidth: 480,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  iconWrap: { width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  centerSlot: { width: 72, alignItems: 'center' },
  center: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  sidebar: { width: SIDEBAR_WIDTH, height: '100%', borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.md },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, height: 46, borderRadius: radius.md },
  sideCompose: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 48, borderRadius: radius.pill },
});
