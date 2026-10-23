import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTheme, accentKeys } from '@/theme';

const PIECES = 18;

/** Small deterministic PRNG so each burst varies without impure renders. */
function seeded(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

function Piece({
  angle,
  distance,
  color,
  delay,
  size,
  round,
}: {
  angle: number;
  distance: number;
  color: string;
  delay: number;
  size: number;
  round: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * distance * t.value },
      { translateY: Math.sin(angle) * distance * t.value + 40 * t.value * t.value },
      { rotate: `${t.value * 240}deg` },
      { scale: 1 - t.value * 0.3 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: round ? size : size * 0.45,
          borderRadius: round ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * A short, tasteful burst of brand-coloured confetti. Render it with a new
 * `burstKey` to replay; it removes itself visually after ~1s.
 */
export function Celebration({ burstKey }: { burstKey: number }) {
  const { palette } = useTheme();
  const pieces = useMemo(() => {
    const rand = seeded(burstKey);
    return Array.from({ length: PIECES }, (_, i) => ({
      angle: (Math.PI * 2 * i) / PIECES + (rand() - 0.5) * 0.4,
      distance: 60 + rand() * 70,
      color: palette.accents[accentKeys[i % accentKeys.length]].base,
      delay: rand() * 80,
      size: 7 + rand() * 5,
      round: i % 3 === 0,
    }));
  }, [burstKey, palette]);
  if (!burstKey) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {pieces.map((p, i) => (
        <Piece key={`${burstKey}-${i}`} {...p} />
      ))}
    </View>
  );
}
