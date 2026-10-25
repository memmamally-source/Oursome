import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useLayout } from '@/hooks/useLayout';
import { elevation, fonts, layout, motion, radius, space, useTheme, type AccentKey } from '@/theme';
import { nativeDriver, useReducedMotion } from '@/theme/motion';

import { Icon } from './Icon';
import { Text } from './Text';

export type ToastInput = {
  message: string;
  tone?: 'success' | 'info' | 'error';
  /** An optional single action, e.g. Undo. */
  action?: { label: string; onPress: () => void };
  /** Milliseconds on screen (longer when there is an action). */
  duration?: number;
};

type ToastState = {
  current: (ToastInput & { id: number }) | null;
  show: (t: ToastInput) => void;
  hide: (id?: number) => void;
};

let seq = 0;

/** One gentle message at a time; a new one replaces the old. */
export const useToasts = create<ToastState>()((set, get) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: ++seq } }),
  hide: (id) => {
    const c = get().current;
    if (c && (id === undefined || c.id === id)) set({ current: null });
  },
}));

/** Show a toast from anywhere (event handlers, stores). */
export const toast = (t: ToastInput) => useToasts.getState().show(t);

const toneMeta: Record<NonNullable<ToastInput['tone']>, { icon: 'checkmark-circle' | 'information-circle' | 'alert-circle'; accent: AccentKey }> = {
  success: { icon: 'checkmark-circle', accent: 'mint' },
  info: { icon: 'information-circle', accent: 'sky' },
  error: { icon: 'alert-circle', accent: 'coral' },
};

/** Rendered once at the root. Never blocks taps outside the toast itself. */
export function ToastHost() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const reduced = useReducedMotion();
  const current = useToasts((s) => s.current);
  const hide = useToasts((s) => s.hide);
  const [shown, setShown] = useState(current);
  const [anim] = useState(() => new Animated.Value(0));

  // Keep the last toast on screen while it animates out.
  if (current && current !== shown) setShown(current);

  useEffect(() => {
    if (!current) {
      Animated.timing(anim, { toValue: 0, duration: motion.duration.fast, useNativeDriver: nativeDriver }).start(() => setShown(null));
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: reduced ? 0 : motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
    const timer = setTimeout(() => hide(current.id), current.duration ?? (current.action ? 5000 : 3000));
    return () => clearTimeout(timer);
  }, [current, anim, hide, reduced]);

  if (!shown) return null;
  const meta = toneMeta[shown.tone ?? 'success'];
  const tone = palette.accents[meta.accent];
  const bottom = isWide ? space.xxl : layout.tabBarHeight + layout.tabBarMargin + Math.max(insets.bottom, 10) + space.md;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center' }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        role="status"
        style={[
          {
            marginBottom: bottom,
            marginHorizontal: layout.screenPadding,
            maxWidth: 460,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            paddingVertical: space.md,
            paddingLeft: space.lg,
            paddingRight: shown.action ? space.sm : space.lg,
            borderRadius: radius.lg,
            backgroundColor: palette.text,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 16, 0] }) }],
          },
          elevation(palette, 3),
        ]}>
        <Icon name={meta.icon} size={20} color={tone.base} />
        <Text variant="callout" color={palette.background} style={{ flexShrink: 1 }} numberOfLines={2}>
          {shown.message}
        </Text>
        {shown.action ? (
          <Pressable
            onPress={() => {
              shown.action!.onPress();
              hide(shown.id);
            }}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => ({ paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, opacity: pressed ? 0.7 : 1 })}>
            <Text variant="callout" color={palette.accents.sunshine.base} style={{ fontFamily: fonts.bodyBold }}>
              {shown.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
