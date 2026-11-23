import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/config/brand';
import { useTheme } from '@/theme';
import { nativeDriver, useReducedMotion } from '@/theme/motion';

import { Text } from '../ui/Text';

import { LogoMark, Wordmark } from './Logo';

const fox = require('../../../assets/brand/karoo-fox-512.png');

/** How long the launch screen stays at least, so it reads as a moment rather than a flicker. */
const MIN_MS = 1300;

/**
 * The opening screen: the Oursome mark and name in the middle and "by Karoo Fox"
 * in the bottom-right corner. It carries on from the phone's own splash screen,
 * then fades away (no movement when Reduce Motion is on). It never blocks taps
 * once it starts fading.
 */
export function LaunchScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(reduce ? 1 : 0));
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!reduce) Animated.timing(lift, { toValue: 1, duration: 500, useNativeDriver: nativeDriver }).start();
    const t = setTimeout(() => {
      setFading(true);
      Animated.timing(opacity, { toValue: 0, duration: reduce ? 1 : 380, useNativeDriver: nativeDriver }).start(() => setGone(true));
    }, MIN_MS);
    return () => clearTimeout(t);
  }, [lift, opacity, reduce]);

  if (gone) return null;
  const dark = palette.scheme === 'dark';
  return (
    <Animated.View
      pointerEvents={fading ? 'none' : 'auto'}
      accessibilityLabel={`${Brand.name}, by Karoo Fox. Loading`}
      accessibilityRole="progressbar"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.background, opacity, zIndex: 1000 }]}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          opacity: lift,
          transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}>
        <LogoMark size={104} />
        <Wordmark size={30} withMark={false} />
      </Animated.View>

      <View
        style={{ position: 'absolute', right: 22, bottom: Math.max(insets.bottom, 12) + 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text variant="caption" tone="tertiary">
          by
        </Text>
        {/* The fox's navy details need a light badge on dark screens (Karoo Fox brand guide). */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dark ? '#FFF6E9' : 'transparent',
          }}>
          <Image source={fox} style={{ width: dark ? 30 : 36, height: dark ? 30 : 36 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Text variant="callout" style={{ color: dark ? palette.text : '#061F3E', fontWeight: '700' }}>
          Karoo Fox
        </Text>
      </View>
    </Animated.View>
  );
}
