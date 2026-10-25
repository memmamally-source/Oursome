import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { elevation, fonts, motion, radius, space, useTheme } from '@/theme';
import { nativeDriver } from '@/theme/motion';

import { Text } from './Text';

type Request = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shown in terracotta, for deletions and leaving. */
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};

type ConfirmState = { request: Request | null; set: (r: Request | null) => void };

const useConfirmStore = create<ConfirmState>()((set) => ({ request: null, set: (request) => set({ request }) }));

/** Ask before something irreversible. Resolves true when the user confirms. */
export function confirmAction(input: Omit<Request, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(false);
    useConfirmStore.getState().set({ ...input, resolve });
  });
}

/** Rendered once at the root. */
export function ConfirmHost() {
  const { palette } = useTheme();
  const request = useConfirmStore((s) => s.request);
  const [anim] = useState(() => new Animated.Value(0));

  const close = (ok: boolean) => {
    request?.resolve(ok);
    useConfirmStore.getState().set(null);
  };

  useEffect(() => {
    if (!request) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: motion.duration.fast, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request) return null;
  const tone = request.destructive ? palette.accents.coral : palette.accents.mint;
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', padding: space.xl }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} accessibilityLabel="Cancel" />
      </Animated.View>
      <Animated.View
        role="alertdialog"
        aria-modal
        aria-label={request.title}
        style={[
          {
            width: '100%',
            maxWidth: 380,
            backgroundColor: palette.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: palette.border,
            padding: space.xl,
            gap: space.md,
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          },
          elevation(palette, 3),
        ]}>
        <Text variant="heading">{request.title}</Text>
        {request.message ? (
          <Text variant="body" tone="secondary">
            {request.message}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.sm }}>
          <Pressable
            onPress={() => close(false)}
            accessibilityRole="button"
            style={({ pressed }) => ({ paddingHorizontal: space.lg, height: 44, justifyContent: 'center', borderRadius: radius.pill, opacity: pressed ? 0.7 : 1 })}>
            <Text variant="bodyStrong" tone="secondary">
              {request.cancelLabel ?? 'Cancel'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => close(true)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              paddingHorizontal: space.xl,
              height: 44,
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: tone.base,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Text variant="bodyStrong" color={tone.on} style={{ fontFamily: fonts.bodyBold }}>
              {request.confirmLabel ?? 'OK'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
