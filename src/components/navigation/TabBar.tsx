import { Icon } from '@/components/ui/Icon';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { elevation, fonts, layout, radius, space, useTheme, type AccentKey } from '@/theme';

import { Text } from '../ui/Text';

type TabMeta = { label: string; icon: IconName; activeIcon: IconName; accent: AccentKey };

export const tabMeta: Record<string, TabMeta> = {
  index: { label: 'Home', icon: 'sunny-outline', activeIcon: 'sunny', accent: 'coral' },
  calendar: { label: 'Calendar', icon: 'calendar-clear-outline', activeIcon: 'calendar-clear', accent: 'sky' },
  tasks: { label: 'Tasks', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle', accent: 'mint' },
  assistant: { label: 'Assistant', icon: 'sparkles-outline', activeIcon: 'sparkles', accent: 'lavender' },
  space: { label: 'Our Space', icon: 'people-outline', activeIcon: 'people', accent: 'sunshine' },
};

/** Screens that show the floating quick-add button. */
const FAB_ROUTES = new Set(['index', 'calendar', 'tasks', 'space']);

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  const meta = tabMeta[name];
  const tone = palette.accents[meta.accent];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      style={styles.item}>
      <View style={styles.iconWrap}>
        {focused ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tone.soft, borderRadius: radius.pill }]} /> : null}
        <Icon name={focused ? meta.activeIcon : meta.icon} size={22} color={focused ? tone.ink : palette.textSecondary} />
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={{
          fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
          fontSize: 11,
          lineHeight: 14,
          color: focused ? palette.text : palette.textSecondary,
        }}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { palette } = useTheme();
  const active = state.routes[state.index]?.name;
  const bottom = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
      {FAB_ROUTES.has(active) ? (
        <Pressable
          onPress={() => {
            haptic.impact();
            router.push('/quick-add');
          }}
          accessibilityRole="button"
          accessibilityLabel="Quick add"
          accessibilityHint="Add a task, appointment, reminder or shopping item"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: palette.accents.coral.base, transform: [{ scale: pressed ? 0.94 : 1 }] },
            elevation(palette, 3),
          ]}>
          <Icon name="add" size={30} color={palette.onAccent} />
        </Pressable>
      ) : null}
      <View style={[styles.bar, { backgroundColor: palette.surface, borderColor: palette.border }, elevation(palette, 3)]}>
        {state.routes.map((route, i) => (
          <TabItem
            key={route.key}
            name={route.name}
            focused={i === state.index}
            onPress={() => {
              haptic.tap();
              navigateToTab(route.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: layout.tabBarMargin,
    right: layout.tabBarMargin,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    height: layout.tabBarHeight,
    borderRadius: radius.xxl,
    paddingHorizontal: space.xs,
    width: '100%',
    maxWidth: 520,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { width: 52, height: 30, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: space.sm,
    bottom: layout.tabBarHeight + space.md,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
