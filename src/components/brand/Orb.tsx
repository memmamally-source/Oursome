import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { create } from 'zustand';

import { useSettings } from '@/features/settings/store';
import { useLayout } from '@/hooks/useLayout';
import { layout, space } from '@/theme';
import { nativeDriver, reducedMotionNow, useReducedMotion } from '@/theme/motion';

/**
 * The orb: Oursome's small companion and the centre of the logo. A soft
 * terracotta sphere that appears briefly and purposefully: it bounces to
 * celebrate, rolls in during onboarding and breathes in empty states. It
 * never takes taps (pointerEvents none) and never moves when motion is
 * reduced or celebrations are switched off.
 */
export function OrbSprite({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="orbBody" cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#E39A82" />
          <Stop offset="0.55" stopColor="#B95F49" />
          <Stop offset="1" stopColor="#8E3F2D" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="46" fill="url(#orbBody)" />
      <Ellipse cx="36" cy="28" rx="15" ry="9" fill="#FFF9F0" opacity={0.42} />
      {/* A tiny freckle so rolling reads as rolling. */}
      <Circle cx="66" cy="64" r="4.5" fill="#F4C2AF" opacity={0.55} />
    </Svg>
  );
}

/** A soft contact shadow; scale and opacity follow the orb's height. */
function Shadow({ size, lift }: { size: number; lift: Animated.AnimatedInterpolation<number> | number }) {
  return (
    <Animated.View
      style={{
        width: size * 0.8,
        height: size * 0.16,
        borderRadius: size,
        backgroundColor: '#5A3E2E',
        opacity: typeof lift === 'number' ? 0.18 : lift.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.05] }),
        transform: [{ scaleX: typeof lift === 'number' ? 1 : lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) }],
        marginTop: 2,
      }}
    />
  );
}

/** Empty states: the orb resting, with a slow breath (still when motion is reduced). */
export function OrbIdle({ size = 48 }: { size?: number }) {
  const reduced = useReducedMotion();
  const [breath] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(breath, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, reduced]);
  return (
    <View pointerEvents="none" style={{ alignItems: 'center' }}>
      <Animated.View
        style={{
          transform: [
            { translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
          ],
        }}>
        <OrbSprite size={size} />
      </Animated.View>
      <Shadow size={size} lift={breath.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] })} />
    </View>
  );
}

/** Onboarding: rolls in from the left and settles with a little rock. */
export function OrbRoll({ size = 56, distance = 160 }: { size?: number; distance?: number }) {
  const reduced = useReducedMotion();
  const [x] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) return;
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(x, { toValue: 1.04, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.spring(x, { toValue: 1, friction: 5, tension: 60, useNativeDriver: nativeDriver }),
    ]).start();
  }, [x, reduced]);
  const circumference = Math.PI * size;
  return (
    <View pointerEvents="none" style={{ alignItems: 'center' }}>
      <Animated.View
        style={{
          transform: [
            { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] }) },
            { rotate: x.interpolate({ inputRange: [0, 1], outputRange: [`${(-distance / circumference) * 360}deg`, '0deg'] }) },
          ],
        }}>
        <OrbSprite size={size} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] }) }] }}>
        <Shadow size={size} lift={0} />
      </Animated.View>
    </View>
  );
}

type OrbState = {
  burst: number;
  /** Ask for a short celebratory bounce. Rate-limited; ignored when motion is reduced or celebrations are off. */
  celebrate: () => void;
};

let lastBurst = 0;
const MIN_GAP_MS = 8000;

export const useOrb = create<OrbState>()((set) => ({
  burst: 0,
  celebrate: () => {
    const now = Date.now();
    if (now - lastBurst < MIN_GAP_MS) return;
    if (!useSettings.getState().celebrations || reducedMotionNow()) return;
    lastBurst = now;
    set({ burst: now });
  },
}));

/** Rendered once at the root: the orb drops in near the corner, bounces twice and goes. */
export function OrbStage() {
  const burst = useOrb((s) => s.burst);
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const [y] = useState(() => new Animated.Value(0)); // 0 = resting on the ground, 1 = high up
  const [squash] = useState(() => new Animated.Value(0));
  const [visible] = useState(() => new Animated.Value(0));
  const [active, setActive] = useState(false);
  const [seen, setSeen] = useState(0);

  if (burst && burst !== seen) {
    setSeen(burst);
    setActive(true);
  }

  useEffect(() => {
    if (!burst) return;
    y.setValue(1);
    squash.setValue(0);
    const drop = (to: number, ms: number) => Animated.timing(y, { toValue: to, duration: ms, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver });
    const rise = (to: number, ms: number) => Animated.timing(y, { toValue: to, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver });
    const hit = () =>
      Animated.sequence([
        Animated.timing(squash, { toValue: 1, duration: 70, useNativeDriver: nativeDriver }),
        Animated.timing(squash, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      ]);
    const seq = Animated.sequence([
      Animated.timing(visible, { toValue: 1, duration: 120, useNativeDriver: nativeDriver }),
      drop(0, 380),
      hit(),
      rise(0.42, 260),
      drop(0, 240),
      hit(),
      rise(0.12, 150),
      drop(0, 140),
      Animated.delay(700),
      Animated.timing(visible, { toValue: 0, duration: 260, useNativeDriver: nativeDriver }),
    ]);
    seq.start(({ finished }) => finished && setActive(false));
    return () => seq.stop();
  }, [burst, y, squash, visible]);

  if (!active) return null;
  const size = 40;
  // Lands above where toasts appear, so it never sits on a message or its Undo.
  const bottom = (isWide ? space.xxl : layout.tabBarHeight + layout.tabBarMargin + Math.max(insets.bottom, 10)) + 84;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ position: 'absolute', right: layout.screenPadding + 4, bottom, alignItems: 'center', opacity: visible }}>
        <Animated.View
          style={{
            transformOrigin: 'bottom',
            transform: [
              { translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -110] }) },
              { scaleY: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) },
              { scaleX: squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) },
            ],
          }}>
          <OrbSprite size={size} />
        </Animated.View>
        <Shadow size={size} lift={y} />
      </Animated.View>
    </View>
  );
}
